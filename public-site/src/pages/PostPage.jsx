import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import NotFound from './NotFound';

// Shows a date like "Sep 26, 2026".
function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Shows a time like "3:45 PM", in the reader's own time zone.
function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// user comes from App.jsx: the logged-in user, null when logged out, or
// undefined while a saved login is still being checked.
function PostPage({ user }) {
  const { postId } = useParams();
  // The key gives every post its own fresh copy of <Post>, so moving from
  // one post to another never shows the previous post's page.
  return <Post key={postId} postId={postId} user={user} />;
}

function Post({ postId, user }) {
  const [post, setPost] = useState(null);
  // One of: 'loading', 'ready', 'not-found' or 'error'.
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    // VITE_API_URL (from .env) is where the API lives.
    fetch(`${import.meta.env.VITE_API_URL}/posts/${postId}`)
      .then(async (res) => {
        if (res.status === 404) {
          setStatus('not-found');
        } else if (!res.ok) {
          setStatus('error');
        } else {
          setPost(await res.json());
          setStatus('ready');
        }
      })
      .catch(() => setStatus('error'));
  }, [postId]);

  if (status === 'not-found') return <NotFound />;
  if (status === 'error')
    return <p>Could not load this post. Try again later.</p>;
  if (status === 'loading') return <p>Loading...</p>;

  return (
    <article>
      <h1>{post.title}</h1>
      <p className="post-meta">
        By {post.author.username} on {formatDate(post.publishedAt)}
        {post.editedAt && ' (edited)'}
      </p>
      <p className="post-body">{post.body}</p>
      <Comments postId={postId} user={user} />
    </article>
  );
}

// Only shown once the post itself has loaded, so a missing or unpublished
// post never gets this far.
function Comments({ postId, user }) {
  const [comments, setComments] = useState([]);
  // One of: 'loading', 'ready' or 'error'.
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/posts/${postId}/comments`)
      .then(async (res) => {
        if (!res.ok) {
          setStatus('error');
        } else {
          setComments(await res.json());
          setStatus('ready');
        }
      })
      .catch(() => setStatus('error'));
  }, [postId]);

  // Puts a just-written comment at the top of the list, where the newest
  // one goes, without reloading the page.
  function addComment(comment) {
    setComments([comment, ...comments]);
  }

  // Swaps an edited comment into the list, in the same spot.
  function changeComment(changed) {
    setComments(comments.map((c) => (c.id === changed.id ? changed : c)));
  }

  // Takes a deleted comment out of the list.
  function removeComment(id) {
    setComments(comments.filter((c) => c.id !== id));
  }

  return (
    <section>
      <h2>Comments</h2>
      {user && <CommentForm postId={postId} onAdd={addComment} />}
      {user === null && (
        <p>
          <Link to="/login">Log in</Link> or <Link to="/signup">sign up</Link>{' '}
          to comment.
        </p>
      )}
      {status === 'loading' && <p>Loading comments...</p>}
      {status === 'error' && (
        <p>Could not load the comments. Try again later.</p>
      )}
      {status === 'ready' && comments.length === 0 && <p>No comments yet.</p>}
      <ul className="comment-list">
        {comments.map((comment) => (
          <Comment
            key={comment.id}
            postId={postId}
            comment={comment}
            // Usernames are unique, so a matching name means it's theirs.
            isOwn={user?.username === comment.user.username}
            onSave={changeComment}
            onDelete={removeComment}
          />
        ))}
      </ul>
    </section>
  );
}

// One comment in the list. Its writer also gets Edit and Delete buttons.
// (The API checks it's really theirs too: the buttons are just a
// shortcut.) onSave and onDelete come from <Comments>: they update the
// list.
function Comment({ postId, comment, isOwn, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.body);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const url = `${import.meta.env.VITE_API_URL}/posts/${postId}/comments/${comment.id}`;
  // The token LoginPage.jsx or SignupPage.jsx saved.
  const authHeader = {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  };

  async function handleSave(event) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();

      // These come with a message worth showing, like
      // "A comment cannot be empty" or "Please log in first".
      if ([400, 401, 403, 404].includes(res.status)) {
        setError(data.error);
        return;
      }
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      onSave(data);
      setEditing(false);
    } catch {
      setError('Could not save your comment. Try again later.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this comment?')) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(url, { method: 'DELETE', headers: authHeader });
      // 204 means it's gone. The list removes it, so nothing else to do.
      if (res.status === 204) return onDelete(comment.id);

      // 401, 403 and 404 come with a message worth showing.
      if ([401, 403, 404].includes(res.status)) {
        setError((await res.json()).error);
        return;
      }
      throw new Error(`Request failed: ${res.status}`);
    } catch {
      setError('Could not delete your comment. Try again later.');
    } finally {
      setBusy(false);
    }
  }

  // Leaves the edit box, throwing away any unsaved changes.
  function handleCancel() {
    setBody(comment.body);
    setError(null);
    setEditing(false);
  }

  return (
    <li>
      <p className="post-meta">
        {comment.user.username} on {formatDate(comment.createdAt)} at{' '}
        {formatTime(comment.createdAt)}
        {comment.editedAt && ' (edited)'}
      </p>
      {editing ? (
        <form className="comment-form" onSubmit={handleSave}>
          <label>
            Edit your comment
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              required
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="comment-actions">
            <button type="submit" disabled={busy}>
              {busy ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={handleCancel} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="post-body">{comment.body}</p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {isOwn && (
            <div className="comment-actions">
              <button
                type="button"
                onClick={() => setEditing(true)}
                disabled={busy}
              >
                Edit
              </button>
              <button type="button" onClick={handleDelete} disabled={busy}>
                {busy ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          )}
        </>
      )}
    </li>
  );
}

// onAdd comes from <Comments>: it shows the new comment in the list.
function CommentForm({ postId, onAdd }) {
  const [body, setBody] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/posts/${postId}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // The token LoginPage.jsx or SignupPage.jsx saved.
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ body }),
        },
      );
      const data = await res.json();

      // 400 and 401 come with a message worth showing, like
      // "A comment cannot be empty" or "Please log in first".
      if (res.status === 400 || res.status === 401) {
        setError(data.error);
        return;
      }
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      onAdd(data);
      // Empty the box, ready for the next comment.
      setBody('');
    } catch {
      setError('Could not post your comment. Try again later.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      <label>
        Your comment
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          required
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Posting...' : 'Post comment'}
      </button>
    </form>
  );
}

export default PostPage;

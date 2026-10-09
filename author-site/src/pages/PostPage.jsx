import { useEffect, useState } from 'react';

// Shows a date like "Sep 26, 2026".
function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Shows a time like "3:45 PM", in the author's own time zone.
function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// One post with its body and comments, published or not.
// postId, user and onBack come from App.jsx. user is the logged-in author,
// and onBack goes back to the post list.
function PostPage({ postId, user, onBack }) {
  const [post, setPost] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // VITE_API_URL (from .env) is where the API lives. The token was saved
    // by LoginPage.jsx. With it, the API also sends unpublished posts.
    fetch(`${import.meta.env.VITE_API_URL}/posts/${postId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then(setPost)
      .catch(() => setError('Could not load this post. Try again later.'));
  }, [postId]);

  return (
    <>
      <button type="button" onClick={onBack}>
        Back to posts
      </button>
      {!post && <p>{error || 'Loading...'}</p>}
      {post && (
        <article>
          <h1>{post.title}</h1>
          <p className="post-meta">
            {post.publishedAt ? (
              <>
                <span className="status published">Published</span> on{' '}
                {formatDate(post.publishedAt)}
              </>
            ) : (
              <span className="status unpublished">Unpublished</span>
            )}
            {post.editedAt && ' (edited)'}
          </p>
          <p className="post-body">{post.body}</p>
          <Comments
            postId={postId}
            user={user}
            isPublished={!!post.publishedAt}
          />
        </article>
      )}
    </>
  );
}

// The post's comments, newest first.
function Comments({ postId, user, isPublished }) {
  const [comments, setComments] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/posts/${postId}/comments`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then(setComments)
      .catch(() => setError('Could not load the comments. Try again later.'));
  }, [postId]);

  return (
    <section>
      <h2>Comments</h2>
      {/* The API only takes comments on published posts. */}
      {isPublished ? (
        <CommentForm
          postId={postId}
          // Puts the new comment at the top, where the newest one goes.
          onAdd={(comment) => setComments((prev) => [comment, ...prev])}
        />
      ) : (
        <p>Publish this post to let people comment on it.</p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!comments && !error && <p>Loading comments...</p>}
      {comments && comments.length === 0 && <p>No comments yet.</p>}
      {comments && (
        <ul className="comment-list">
          {comments.map((comment) => (
            <Comment
              key={comment.id}
              postId={postId}
              comment={comment}
              // Usernames are unique, so a matching name means it's the
              // author's own.
              canEdit={user.username === comment.user.username}
              // Swaps the edited comment into the list, in the same spot.
              onSave={(changed) =>
                setComments((prev) =>
                  prev.map((c) => (c.id === changed.id ? changed : c)),
                )
              }
              // Takes a deleted comment out of the list. "prev" is the list
              // as it is right now, so deleting two comments quickly
              // doesn't bring one back.
              onDelete={(id) =>
                setComments((prev) => prev.filter((c) => c.id !== id))
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}

// One comment in the list. The author can delete any comment, but only
// edit their own: editing someone else's would change what they said.
// (The API checks this too: the buttons are just a shortcut.) onSave and
// onDelete come from <Comments>: they update the list.
function Comment({ postId, comment, canEdit, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.body);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const url = `${import.meta.env.VITE_API_URL}/posts/${postId}/comments/${comment.id}`;
  // The token LoginPage.jsx saved.
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

      // 400 comes with a message worth showing, like
      // "A comment cannot be empty".
      if (res.status === 400) {
        setError((await res.json()).error);
        return;
      }
      if (res.status === 401) {
        setError('Your login has expired. Log out and log in again.');
        return;
      }
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      onSave(await res.json());
      setEditing(false);
    } catch {
      setError('Could not save your comment. Try again later.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this comment? This can't be undone.")) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(url, { method: 'DELETE', headers: authHeader });
      if (res.status === 401) {
        setError('Your login has expired. Log out and log in again.');
        return;
      }
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      // It's gone, and the list removes it, so nothing else to do here.
      onDelete(comment.id);
    } catch {
      setError('Could not delete the comment. Try again later.');
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
          <div className="button-row">
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
          <div className="button-row">
            {canEdit && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                disabled={busy}
              >
                Edit
              </button>
            )}
            <button type="button" onClick={handleDelete} disabled={busy}>
              {busy ? 'Deleting...' : 'Delete'}
            </button>
          </div>
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
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ body }),
        },
      );

      // 400 comes with a message worth showing, like
      // "A comment cannot be empty".
      if (res.status === 400) {
        setError((await res.json()).error);
        return;
      }
      if (res.status === 401) {
        setError('Your login has expired. Log out and log in again.');
        return;
      }
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      onAdd(await res.json());
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

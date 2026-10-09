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
          <li key={comment.id}>
            <p className="post-meta">
              {comment.user.username} on {formatDate(comment.createdAt)} at{' '}
              {formatTime(comment.createdAt)}
              {comment.editedAt && ' (edited)'}
            </p>
            <p className="post-body">{comment.body}</p>
          </li>
        ))}
      </ul>
    </section>
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

import { useEffect, useState } from 'react';

// Shows a date like "Sep 26, 2026".
function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Every post, published or not. The API sends them all because the
// request carries the author's token.
// onNew, onEdit and onView come from App.jsx: they switch to the post
// form or to the post's own page.
function PostList({ onNew, onEdit, onView }) {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // VITE_API_URL (from .env) is where the API lives. The token was saved
    // by LoginPage.jsx.
    fetch(`${import.meta.env.VITE_API_URL}/posts`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then(setPosts)
      .catch(() => setError('Could not load the posts. Try again later.'));
  }, []);

  async function handleDelete(post) {
    if (!window.confirm(`Delete "${post.title}"? This can't be undone.`)) {
      return;
    }
    setError(null);
    try {
      // VITE_API_URL (from .env) is where the API lives. The token was saved
      // by LoginPage.jsx.
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/posts/${post.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        },
      );
      if (res.status === 401) {
        setError('Your login has expired. Log out and log in again.');
        return;
      }
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      // Take it off the list on screen too.
      setPosts(posts.filter((p) => p.id !== post.id));
    } catch {
      setError('Could not delete the post. Try again later.');
    }
  }

  // Publishes an unpublished post, or unpublishes a published one.
  async function handlePublish(post) {
    setError(null);
    try {
      // VITE_API_URL (from .env) is where the API lives. The token was saved
      // by LoginPage.jsx.
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/posts/${post.id}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ published: !post.publishedAt }),
        },
      );
      if (res.status === 401) {
        setError('Your login has expired. Log out and log in again.');
        return;
      }
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      // Swap in the post the API sent back, so its status and button
      // change on screen straight away.
      const updated = await res.json();
      setPosts(posts.map((p) => (p.id === updated.id ? updated : p)));
    } catch {
      setError('Could not change the post. Try again later.');
    }
  }

  if (!posts) return <p>{error || 'Loading...'}</p>;

  return (
    <>
      <button type="button" onClick={onNew}>
        New post
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {posts.length === 0 && <p>No posts yet.</p>}
      <ul className="post-list">
        {posts.map((post) => (
          <li key={post.id}>
            <h2>
              {/* Opens the post's page, with its body and comments. */}
              <button
                type="button"
                className="title-link"
                onClick={() => onView(post.id)}
              >
                {post.title}
              </button>
            </h2>
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
            <div className="button-row">
              <button type="button" onClick={() => handlePublish(post)}>
                {post.publishedAt ? 'Unpublish' : 'Publish'}
              </button>
              <button type="button" onClick={() => onEdit(post.id)}>
                Edit
              </button>
              <button type="button" onClick={() => handleDelete(post)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export default PostList;

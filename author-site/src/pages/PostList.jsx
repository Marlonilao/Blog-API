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
function PostList() {
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

  if (error) return <p>{error}</p>;
  if (!posts) return <p>Loading...</p>;
  if (posts.length === 0) return <p>No posts yet.</p>;

  return (
    <ul className="post-list">
      {posts.map((post) => (
        <li key={post.id}>
          <h2>{post.title}</h2>
          <p className="post-meta">
            {post.publishedAt ? (
              <>
                <span className="status published">Published</span> on{' '}
                {formatDate(post.publishedAt)}
              </>
            ) : (
              <span className="status unpublished">Unpublished</span>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}

export default PostList;

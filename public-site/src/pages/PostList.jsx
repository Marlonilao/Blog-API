import { useEffect, useState } from 'react';
import { Link } from 'react-router';

// Shows a date like "Sep 26, 2026".
function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function PostList() {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // VITE_API_URL (from .env) is where the API lives.
    fetch(`${import.meta.env.VITE_API_URL}/posts`)
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
          <h2>
            <Link to={`/posts/${post.id}`}>{post.title}</Link>
          </h2>
          <p className="post-meta">
            By {post.author.username} on {formatDate(post.publishedAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}

export default PostList;

import { useEffect, useState } from 'react';
import { formatDate } from './formatDate';

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/posts`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setPosts)
      .catch(() => setError('Could not load the posts. Try again later.'));
  }, []);

  return (
    <main>
      <h1>Blog</h1>
      {error && <p>{error}</p>}
      {!error && !posts && <p>Loading...</p>}
      {posts && posts.length === 0 && <p>No posts yet.</p>}
      {posts && posts.length > 0 && (
        <ul className="post-list">
          {posts.map((post) => (
            <li key={post.id}>
              <h2>{post.title}</h2>
              <p className="post-meta">
                By {post.author.username} on {formatDate(post.publishedAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default App;

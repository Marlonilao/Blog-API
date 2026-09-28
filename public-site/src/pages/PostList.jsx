import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getJson } from '../api';
import { formatDate } from '../formatDate';

function PostList() {
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getJson('/posts')
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

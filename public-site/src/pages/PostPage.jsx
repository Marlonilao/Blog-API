import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import NotFound from './NotFound';

// Shows a date like "Sep 26, 2026".
function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function PostPage() {
  const { postId } = useParams();
  // The key gives every post its own fresh copy of <Post>, so moving from
  // one post to another never shows the previous post's page.
  return <Post key={postId} postId={postId} />;
}

function Post({ postId }) {
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
    </article>
  );
}

export default PostPage;

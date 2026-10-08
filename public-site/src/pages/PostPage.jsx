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

// Shows a time like "3:45 PM", in the reader's own time zone.
function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
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
      <Comments postId={postId} />
    </article>
  );
}

// Only shown once the post itself has loaded, so a missing or unpublished
// post never gets this far.
function Comments({ postId }) {
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

  return (
    <section>
      <h2>Comments</h2>
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

export default PostPage;

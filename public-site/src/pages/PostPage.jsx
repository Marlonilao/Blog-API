import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { getJson } from '../api';
import { formatDate } from '../formatDate';
import NotFound from './NotFound';

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
    getJson(`/posts/${postId}`)
      .then((data) => {
        setPost(data);
        setStatus('ready');
      })
      .catch((error) => {
        setStatus(error.status === 404 ? 'not-found' : 'error');
      });
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
      </p>
      <p className="post-body">{post.body}</p>
    </article>
  );
}

export default PostPage;

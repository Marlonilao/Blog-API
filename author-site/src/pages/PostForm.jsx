import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import NotFound from './NotFound';

// The form for writing a new post (at /posts/new) or editing one (at
// /posts/3/edit). Only the edit address has a post id in it.
function PostForm() {
  const { postId } = useParams();
  // The key gives every post its own fresh form, so one post's text never
  // shows up in another's form, or in the new-post form.
  return <Form key={postId || 'new'} postId={postId} />;
}

function Form({ postId }) {
  const isNew = postId === undefined;
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  // Only an edit has to wait for the post to load.
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  // True when editing a post that doesn't exist.
  const [notFound, setNotFound] = useState(false);

  // When editing, fill the form with the post as it is now.
  useEffect(() => {
    if (isNew) return;
    // VITE_API_URL (from .env) is where the API lives. The token was saved
    // by LoginPage.jsx.
    fetch(`${import.meta.env.VITE_API_URL}/posts/${postId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(async (res) => {
        if (res.status === 404) return setNotFound(true);
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const post = await res.json();
        setTitle(post.title);
        setBody(post.body);
        setLoading(false);
      })
      .catch(() => setError('Could not load this post. Try again later.'));
  }, [isNew, postId]);

  async function handleSubmit(event) {
    event.preventDefault();
    // The inputs' "required" already stops empty fields. This also stops
    // ones with only spaces, the same rule the API uses.
    if (!title.trim() || !body.trim()) {
      setError('A post needs a title and a body');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      // A new post is sent with POST, an edit with PUT to the post's address.
      const res = await fetch(
        isNew
          ? `${import.meta.env.VITE_API_URL}/posts`
          : `${import.meta.env.VITE_API_URL}/posts/${postId}`,
        {
          method: isNew ? 'POST' : 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ title, body }),
        },
      );

      // 400 comes with a message worth showing, like
      // "A post needs a title and a body".
      if (res.status === 400) {
        const data = await res.json();
        setError(data.error);
        return;
      }
      if (res.status === 401) {
        setError('Your login has expired. Log out and log in again.');
        return;
      }
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      // Back to the post list. "replace" swaps the form out of the
      // browser's history, so pressing Back doesn't open it again and
      // save the post a second time.
      navigate('/', { replace: true });
    } catch {
      setError('Could not save the post. Try again later.');
    } finally {
      setSaving(false);
    }
  }

  if (notFound) return <NotFound />;

  if (loading) {
    return (
      <>
        <p>{error || 'Loading...'}</p>
        <button type="button" onClick={() => navigate('/')}>
          Back to posts
        </button>
      </>
    );
  }

  return (
    <form className="post-form" onSubmit={handleSubmit}>
      <h2>{isNew ? 'New post' : 'Edit post'}</h2>
      <label>
        Title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </label>
      <label>
        Body
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          required
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="button-row">
        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={() => navigate('/')}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default PostForm;

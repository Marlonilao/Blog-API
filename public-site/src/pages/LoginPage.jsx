import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

// onLogIn comes from App.jsx: calling it with the user shows them as
// logged in at the top of every page.
function LoginPage({ onLogIn }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // VITE_API_URL (from .env) is where the API lives.
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      // 400 and 401 come with a message worth showing, like
      // "Wrong username or password".
      if (res.status === 400 || res.status === 401) {
        setError(data.error);
        return;
      }
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      // Kept in the browser so the reader stays logged in after a reload.
      // (App.jsx reads it back.)
      localStorage.setItem('token', data.token);
      onLogIn(data.user);
      navigate('/');
    } catch {
      setError('Could not log in. Try again later.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <h1>Log in</h1>
      <label>
        Username
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Logging in...' : 'Log in'}
      </button>
      <p>
        No account yet? <Link to="/signup">Sign up</Link>
      </p>
    </form>
  );
}

export default LoginPage;

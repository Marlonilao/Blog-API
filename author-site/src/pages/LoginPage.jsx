import { useState } from 'react';

// onLogIn comes from App.jsx: calling it with the user swaps this page
// for the post list.
function LoginPage({ onLogIn }) {
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

      const { token, user } = data;
      // Readers have real accounts, but this site is only for the author.
      // Their token is never saved, so they stay logged out here.
      if (user.role !== 'AUTHOR') {
        setError(
          'This site is for the author only. Readers can log in on the public site.',
        );
        return;
      }
      // Kept in the browser so the author stays logged in after a reload.
      // (App.jsx reads it back.)
      localStorage.setItem('token', token);
      onLogIn(user);
    } catch {
      setError('Could not log in. Try again later.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <h2>Log in</h2>
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
    </form>
  );
}

export default LoginPage;

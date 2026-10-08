import { useState } from 'react';
import { Link, useNavigate } from 'react-router';

// onLogIn comes from App.jsx: calling it with the user shows them as
// logged in at the top of every page.
function SignupPage({ onLogIn }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // A message for the whole form, like "That username is taken".
  const [error, setError] = useState(null);
  // A message for each field that breaks a rule, like
  // { password: 'Password must be at least 8 characters' }.
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    // Catch a typo in the password straight away, without a trip to the
    // API. The API checks this too (signUp in
    // api/src/controllers/authController.js), for anyone who skips this page.
    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'The passwords do not match' });
      return;
    }

    setSubmitting(true);
    try {
      // VITE_API_URL (from .env) is where the API lives.
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, confirmPassword }),
      });
      const data = await res.json();

      // 400: a username or password that breaks the rules, or passwords
      // that don't match, with a message for each field.
      if (res.status === 400) {
        setFieldErrors(data.fields);
        return;
      }
      // 409: the username is taken.
      if (res.status === 409) {
        setError(data.error);
        return;
      }
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      // Sign-up logs the new reader in too: the API sends back a token
      // and the user, just like logging in does.
      const { token, user } = data;
      // Kept in the browser so the reader stays logged in after a reload.
      // (App.jsx reads it back.)
      localStorage.setItem('token', token);
      onLogIn(user);
      navigate('/');
    } catch {
      setError('Could not sign up. Try again later.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <h1>Sign up</h1>
      <label>
        Username
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />
      </label>
      {/* The rules themselves are checked by the API, in signUp in
          api/src/controllers/authController.js. Keep these hints in step. */}
      <p className="form-hint">3 to 20 letters, numbers or underscores.</p>
      {fieldErrors.username && (
        <p className="form-error" role="alert">
          {fieldErrors.username}
        </p>
      )}
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
      </label>
      <p className="form-hint">At least 8 characters.</p>
      {fieldErrors.password && (
        <p className="form-error" role="alert">
          {fieldErrors.password}
        </p>
      )}
      <label>
        Confirm password
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
      </label>
      {fieldErrors.confirmPassword && (
        <p className="form-error" role="alert">
          {fieldErrors.confirmPassword}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Signing up...' : 'Sign up'}
      </button>
      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </form>
  );
}

export default SignupPage;

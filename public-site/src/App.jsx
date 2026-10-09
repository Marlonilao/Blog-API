import { useEffect, useState } from 'react';
import { Link, Route, Routes } from 'react-router';
import PostList from './pages/PostList';
import PostPage from './pages/PostPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import NotFound from './pages/NotFound';

function App() {
  // The login token is kept in the browser's localStorage, so the reader
  // stays logged in after a reload. (LoginPage.jsx and SignupPage.jsx
  // save it.)
  // user is undefined while a saved token is being checked, null when
  // logged out.
  const [user, setUser] = useState(
    localStorage.getItem('token') ? undefined : null,
  );

  // After a reload, ask the API who the saved token belongs to.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    // VITE_API_URL (from .env) is where the API lives.
    fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        // 401 means the token is expired or fake: treat it as logged out.
        if (res.status === 401) return logOut();
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        setUser(await res.json());
      })
      // If the API can't be reached, show the site as logged out but keep
      // the token, so the next reload can try again.
      .catch(() => setUser(null));
  }, []);

  function logOut() {
    localStorage.removeItem('token');
    setUser(null);
  }

  return (
    <>
      <header>
        <Link to="/" className="site-title">
          Blog
        </Link>
        {user && (
          <span className="header-user">
            Logged in as {user.username}{' '}
            <button type="button" onClick={logOut}>
              Log out
            </button>
          </span>
        )}
        {user === null && (
          <span className="header-user">
            <Link to="/login">Log in</Link> or <Link to="/signup">Sign up</Link>
          </span>
        )}
      </header>
      <main>
        <Routes>
          <Route path="/" element={<PostList />} />
          <Route path="/posts/:postId" element={<PostPage user={user} />} />
          <Route path="/login" element={<LoginPage onLogIn={setUser} />} />
          <Route path="/signup" element={<SignupPage onLogIn={setUser} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}

export default App;

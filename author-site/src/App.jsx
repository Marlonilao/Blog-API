import { useEffect, useState } from 'react';
import { Link, Route, Routes } from 'react-router';
import LoginPage from './pages/LoginPage';
import PostList from './pages/PostList';
import PostForm from './pages/PostForm';
import PostPage from './pages/PostPage';
import NotFound from './pages/NotFound';

function App() {
  // The login token is kept in the browser's localStorage, so the author
  // stays logged in after a reload. (LoginPage.jsx saves it.)
  // user is undefined while a saved token is being checked, null when
  // logged out.
  const [user, setUser] = useState(
    localStorage.getItem('token') ? undefined : null,
  );
  const [error, setError] = useState(null);

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

        const me = await res.json();
        if (me.role === 'AUTHOR') {
          setUser(me);
        } else {
          logOut();
        }
      })
      .catch(() => setError('Could not reach the API. Try again later.'));
  }, []);

  function logOut() {
    localStorage.removeItem('token');
    setUser(null);
  }

  let content;
  if (error) {
    content = <p>{error}</p>;
  } else if (user === undefined) {
    content = <p>Loading...</p>;
  } else if (user === null) {
    // Logged out: every address shows the login page. Once the author logs
    // in, the page for that address shows instead.
    content = <LoginPage onLogIn={setUser} />;
  } else {
    // Each address has its own page. ":postId" is filled in with the post's
    // id, and the page reads it with useParams.
    content = (
      <Routes>
        <Route path="/" element={<PostList />} />
        <Route path="/posts/new" element={<PostForm />} />
        <Route path="/posts/:postId" element={<PostPage user={user} />} />
        <Route path="/posts/:postId/edit" element={<PostForm />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  return (
    <>
      <header>
        <Link to="/" className="site-title">
          Blog (author)
        </Link>
        {user && (
          <span className="header-user">
            Logged in as {user.username}{' '}
            <button type="button" onClick={logOut}>
              Log out
            </button>
          </span>
        )}
      </header>
      <main>{content}</main>
    </>
  );
}

export default App;

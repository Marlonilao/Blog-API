import { useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage';
import PostList from './pages/PostList';

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
    content = <LoginPage onLogIn={setUser} />;
  } else {
    content = <PostList />;
  }

  return (
    <>
      <header>
        <span className="site-title">Blog (author)</span>
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

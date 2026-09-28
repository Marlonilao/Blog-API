import { Link, Route, Routes } from 'react-router';
import PostList from './pages/PostList';
import PostPage from './pages/PostPage';
import NotFound from './pages/NotFound';

function App() {
  return (
    <>
      <header>
        <Link to="/" className="site-title">
          Blog
        </Link>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<PostList />} />
          <Route path="/posts/:postId" element={<PostPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}

export default App;

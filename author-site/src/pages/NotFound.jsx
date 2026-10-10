import { Link } from 'react-router';

// Shown for any address that doesn't exist, and for posts that are
// missing.
function NotFound() {
  return (
    <>
      <h1>Page not found</h1>
      <p>Sorry, there's nothing here.</p>
      <p>
        <Link to="/">Back to posts</Link>
      </p>
    </>
  );
}

export default NotFound;

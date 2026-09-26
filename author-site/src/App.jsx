import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [status, setStatus] = useState('Checking the API...');

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then((data) => {
        setStatus(data.ok ? 'API is connected' : 'API is not healthy');
      })
      .catch(() => setStatus('Could not reach the API'));
  }, []);

  return (
    <main>
      <h1>Blog (author)</h1>
      <p>{status}</p>
    </main>
  );
}

export default App;

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const prisma = require('./lib/prisma');
const authRouter = require('./routes/authRouter');
const postsRouter = require('./routes/postsRouter');

const app = express();

// Only the two sites listed in CORS_ORIGINS may call the API from a browser.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Prints one short line per request in the terminal, like
// "GET /posts 200 512 - 4.211 ms". Turned off while tests run, so it
// doesn't bury the test results. (Jest sets NODE_ENV to "test".)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Asks the database a trivial question, so a success means the API
// can reach it too.
app.get('/health', async (req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true });
});

app.use('/auth', authRouter);
app.use('/posts', postsRouter);

module.exports = app;

const express = require('express');
const cors = require('cors');
const prisma = require('./lib/prisma');
const postsRouter = require('./routes/postsRouter');

const app = express();

// Only the two sites listed in CORS_ORIGINS may call the API from a browser.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Asks the database a trivial question, so a success means the API
// can reach it too.
app.get('/health', async (req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true });
});

app.use('/posts', postsRouter);

module.exports = app;

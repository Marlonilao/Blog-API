// Shortcuts for tests: putting data straight into the test database,
// and logging in.
const bcrypt = require('bcryptjs');
const request = require('supertest');
const app = require('../../src/app');
const prisma = require('../../src/lib/prisma');

let userCount = 0;

// Every test user's password, unless a test picks its own.
const DEFAULT_PASSWORD = 'password123';

async function createUser({ password = DEFAULT_PASSWORD, ...data } = {}) {
  userCount += 1;
  return prisma.user.create({
    data: {
      username: `user${userCount}`,
      // Stored hashed, like real sign-ups. 4 rounds (the fewest bcrypt
      // allows) keeps the tests fast.
      password: await bcrypt.hash(password, 4),
      ...data,
    },
  });
}

function createAuthor(data = {}) {
  return createUser({ role: 'AUTHOR', ...data });
}

function createPost(author, data = {}) {
  return prisma.post.create({
    data: {
      title: 'A post',
      body: 'Some words.',
      authorId: author.id,
      ...data,
    },
  });
}

function createComment(post, user, data = {}) {
  return prisma.comment.create({
    data: {
      body: 'A comment.',
      postId: post.id,
      userId: user.id,
      ...data,
    },
  });
}

// Logs a test user in through the API, like a site would, and gives back
// their token.
async function logIn(user, password = DEFAULT_PASSWORD) {
  const res = await request(app)
    .post('/auth/login')
    .send({ username: user.username, password });
  return res.body.token;
}

module.exports = {
  createUser,
  createAuthor,
  createPost,
  createComment,
  logIn,
  DEFAULT_PASSWORD,
};

// Shortcuts for putting test data straight into the test database.
const prisma = require('../../src/lib/prisma');

let userCount = 0;

function createUser(data = {}) {
  userCount += 1;
  return prisma.user.create({
    data: {
      username: `user${userCount}`,
      password: 'not-a-real-hash',
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

module.exports = { createUser, createAuthor, createPost };

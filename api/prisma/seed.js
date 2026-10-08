// Creates the blog's single author, a few sample posts, a sample reader
// and some comments.
// Run it with `npm run seed`. Running it again doesn't create duplicates.
require('dotenv').config({ quiet: true });
const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');

const samplePosts = [
  {
    title: 'Welcome to my blog',
    body: 'This is the first post.\n\nMore to come soon.',
    publishedAt: new Date('2026-09-01T09:00:00Z'),
  },
  {
    title: 'What I learned this week',
    body: 'Express, Prisma and a lot of patience.',
    publishedAt: new Date('2026-09-15T09:00:00Z'),
  },
  {
    title: 'A post that is not ready yet',
    body: 'Only the author can see this one.',
    publishedAt: null,
  },
];

// A reader to write the sample comments. The password is only for trying
// the site out on your own computer.
const sampleReader = { username: 'sample_reader', password: 'reader-password' };

// Comments on the first sample post, in the order they were written.
const sampleComments = [
  { from: 'reader', body: 'Great start! Looking forward to more.' },
  { from: 'author', body: 'Thanks for reading!' },
];

async function main() {
  const { AUTHOR_USERNAME, AUTHOR_PASSWORD } = process.env;
  if (!AUTHOR_USERNAME || !AUTHOR_PASSWORD) {
    throw new Error('Set AUTHOR_USERNAME and AUTHOR_PASSWORD in .env first.');
  }

  // 10 is how many rounds of hashing bcrypt does. More is safer but slower.
  const password = await bcrypt.hash(AUTHOR_PASSWORD, 10);

  // upsert = create the author, or leave them alone if they already exist.
  const author = await prisma.user.upsert({
    where: { username: AUTHOR_USERNAME },
    update: {},
    create: { username: AUTHOR_USERNAME, password, role: 'AUTHOR' },
  });

  // Never turn a reader who happens to have this username into the author.
  if (author.role !== 'AUTHOR') {
    throw new Error(`"${AUTHOR_USERNAME}" is already a reader's username.`);
  }

  for (const post of samplePosts) {
    const existing = await prisma.post.findFirst({
      where: { title: post.title, authorId: author.id },
    });
    if (!existing) {
      await prisma.post.create({ data: { ...post, authorId: author.id } });
    }
  }

  const reader = await prisma.user.upsert({
    where: { username: sampleReader.username },
    update: {},
    create: {
      username: sampleReader.username,
      password: await bcrypt.hash(sampleReader.password, 10),
    },
  });

  const firstPost = await prisma.post.findFirst({
    where: { title: samplePosts[0].title, authorId: author.id },
  });
  for (const comment of sampleComments) {
    const user = comment.from === 'author' ? author : reader;
    const existing = await prisma.comment.findFirst({
      where: { body: comment.body, postId: firstPost.id, userId: user.id },
    });
    if (!existing) {
      await prisma.comment.create({
        data: { body: comment.body, postId: firstPost.id, userId: user.id },
      });
    }
  }

  console.log(
    `Seeded author "${author.username}", reader "${reader.username}", sample posts and comments.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

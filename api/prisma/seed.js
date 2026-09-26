// Creates the blog's single author and a few sample posts.
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

  console.log(`Seeded author "${author.username}" and sample posts.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

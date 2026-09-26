// Runs around every test file (see "jest" in package.json).
const prisma = require('../src/lib/prisma');

// Start every test with empty tables, so tests can't affect each other.
// When you add a new table to the schema, add it to this list too.
beforeEach(async () => {
  await prisma.$executeRaw`TRUNCATE "User", "Post" RESTART IDENTITY CASCADE`;
});

afterAll(() => prisma.$disconnect());

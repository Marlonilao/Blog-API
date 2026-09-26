const prisma = require('../lib/prisma');

// The fields a post list shows. Picking them one by one means private
// data, like the author's password, can never slip into a response.
const postSummary = {
  id: true,
  title: true,
  publishedAt: true,
  createdAt: true,
  editedAt: true,
  author: { select: { username: true } },
};

const listPosts = async (req, res) => {
  const posts = await prisma.post.findMany({
    where: { publishedAt: { not: null } },
    // Posts published at the same moment fall back to the newest id first.
    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    select: postSummary,
  });
  res.json(posts);
};

module.exports = { listPosts };

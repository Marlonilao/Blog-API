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
  // req.user comes from the token, via readUser (see postsRouter.js).
  // It's null for anyone who isn't logged in.
  const isAuthor = req.user?.role === 'AUTHOR';

  const posts = await prisma.post.findMany({
    // The author sees every post. Everyone else sees published ones only.
    where: isAuthor ? {} : { publishedAt: { not: null } },
    orderBy: [
      // Unpublished posts (no published date) go first, so the author
      // sees their unfinished work at the top.
      { publishedAt: { sort: 'desc', nulls: 'first' } },
      // Posts published at the same moment fall back to the newest id first.
      { id: 'desc' },
    ],
    select: postSummary,
  });
  res.json(posts);
};

const getPost = async (req, res) => {
  // The id must be a plain number: digits only, no leading zero, so
  // "abc", "01" and "1.0" are all rejected. It also can't be bigger than
  // the biggest id a Postgres "integer" column can hold.
  const id = Number(req.params.postId);
  if (!/^[1-9][0-9]*$/.test(req.params.postId) || id > 2147483647) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const post = await prisma.post.findFirst({
    where: { id, publishedAt: { not: null } },
    select: { ...postSummary, body: true },
  });
  // An unpublished post gets the same answer as a missing one, so
  // visitors can't even tell that it exists.
  if (!post) return res.status(404).json({ error: 'Post not found' });

  res.json(post);
};

module.exports = { listPosts, getPost };

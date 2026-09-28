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

// The biggest id a Postgres "integer" column can hold.
const MAX_ID = 2147483647;

// Turns the id from the address into a number, or null if it isn't a
// plain id. Only digits with no leading zero count, so "abc", "01" and
// "1.0" are all rejected.
function parseId(value) {
  if (!/^[1-9][0-9]*$/.test(value)) return null;
  const id = Number(value);
  return id <= MAX_ID ? id : null;
}

function sendPostNotFound(res) {
  res.status(404).json({ error: 'Post not found' });
}

const listPosts = async (req, res) => {
  const posts = await prisma.post.findMany({
    where: { publishedAt: { not: null } },
    // Posts published at the same moment fall back to the newest id first.
    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    select: postSummary,
  });
  res.json(posts);
};

const getPost = async (req, res) => {
  const id = parseId(req.params.postId);
  if (!id) return sendPostNotFound(res);

  const post = await prisma.post.findFirst({
    where: { id, publishedAt: { not: null } },
    select: { ...postSummary, body: true },
  });
  // An unpublished post gets the same answer as a missing one, so
  // visitors can't even tell that it exists.
  if (!post) return sendPostNotFound(res);

  res.json(post);
};

module.exports = { listPosts, getPost };

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

// Turns the post id from the address into a number, or null if it isn't
// a plain id. Only digits with no leading zero count, so "abc", "01" and
// "1.0" are all rejected. 2147483647 is the biggest id a Postgres
// "integer" column can hold.
function parseId(value) {
  if (!/^[1-9][0-9]*$/.test(value)) return null;
  const id = Number(value);
  return id <= 2147483647 ? id : null;
}

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
  const id = parseId(req.params.postId);
  if (!id) return res.status(404).json({ error: 'Post not found' });

  // req.user comes from the token, via readUser (see postsRouter.js).
  // The author can open any post, so the edit form can load unpublished
  // ones. Everyone else can only open published posts.
  const isAuthor = req.user?.role === 'AUTHOR';

  const post = await prisma.post.findFirst({
    where: isAuthor ? { id } : { id, publishedAt: { not: null } },
    select: { ...postSummary, body: true },
  });
  // An unpublished post gets the same answer as a missing one, so
  // visitors can't even tell that it exists.
  if (!post) return res.status(404).json({ error: 'Post not found' });

  res.json(post);
};

// req.user is the author: requireAuthor checked that first
// (see postsRouter.js).
const createPost = async (req, res) => {
  const { title, body } = req.body ?? {};
  // Both must be text with something in it besides spaces.
  if (
    typeof title !== 'string' ||
    typeof body !== 'string' ||
    !title.trim() ||
    !body.trim()
  ) {
    return res.status(400).json({ error: 'A post needs a title and a body' });
  }

  const post = await prisma.post.create({
    // New posts have no published date, so they start unpublished.
    data: { title, body, authorId: req.user.id },
    select: { ...postSummary, body: true },
  });
  res.status(201).json(post);
};

// req.user is the author: requireAuthor checked that first
// (see postsRouter.js).
const editPost = async (req, res) => {
  const id = parseId(req.params.postId);
  if (!id) return res.status(404).json({ error: 'Post not found' });

  const { title, body } = req.body ?? {};
  // Both must be text with something in it besides spaces.
  if (
    typeof title !== 'string' ||
    typeof body !== 'string' ||
    !title.trim() ||
    !body.trim()
  ) {
    return res.status(400).json({ error: 'A post needs a title and a body' });
  }

  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Post not found' });

  // The edited date makes the sites show "(edited)", so it only changes
  // when the title or body really did.
  const changed = title !== existing.title || body !== existing.body;

  const post = await prisma.post.update({
    where: { id },
    // The published date isn't touched, so a published post stays
    // published.
    data: { title, body, editedAt: changed ? new Date() : existing.editedAt },
    select: { ...postSummary, body: true },
  });
  res.json(post);
};

// req.user is the author: requireAuthor checked that first
// (see postsRouter.js).
const publishPost = async (req, res) => {
  const id = parseId(req.params.postId);
  if (!id) return res.status(404).json({ error: 'Post not found' });

  const { published } = req.body ?? {};
  if (typeof published !== 'boolean') {
    return res.status(400).json({ error: 'Published must be true or false' });
  }

  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Post not found' });

  // Publishing sets the date to now, unless the post is already
  // published: then it keeps its date. Unpublishing clears the date.
  const publishedAt = published ? (existing.publishedAt ?? new Date()) : null;

  const post = await prisma.post.update({
    where: { id },
    // The edited date isn't touched, so publishing doesn't make a post
    // show "(edited)".
    data: { publishedAt },
    // Only the list fields: the author site swaps this into its post list,
    // which doesn't show the body.
    select: postSummary,
  });
  res.json(post);
};

// req.user is the author: requireAuthor checked that first
// (see postsRouter.js).
const deletePost = async (req, res) => {
  const id = parseId(req.params.postId);
  if (!id) return res.status(404).json({ error: 'Post not found' });

  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Post not found' });

  await prisma.post.delete({ where: { id } });
  // 204 means "done, nothing to send back".
  res.status(204).end();
};

const listComments = async (req, res) => {
  const id = parseId(req.params.postId);
  if (!id) return res.status(404).json({ error: 'Post not found' });

  // req.user comes from the token, via readUser (see postsRouter.js).
  // The author can see the comments on any post. Everyone else only sees
  // them on published posts.
  const isAuthor = req.user?.role === 'AUTHOR';

  const post = await prisma.post.findFirst({
    where: isAuthor ? { id } : { id, publishedAt: { not: null } },
  });
  // Same answer as for the post itself, so an unpublished post's comments
  // don't give away that it exists.
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const comments = await prisma.comment.findMany({
    where: { postId: id },
    // Newest first, so the latest comment is at the top. Comments written
    // at the same moment fall back to the newest id first.
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    // Picked one by one, so the commenter's password can never slip out.
    select: {
      id: true,
      body: true,
      createdAt: true,
      editedAt: true,
      user: { select: { username: true } },
    },
  });
  res.json(comments);
};

module.exports = {
  listPosts,
  getPost,
  createPost,
  editPost,
  publishPost,
  deletePost,
  listComments,
};

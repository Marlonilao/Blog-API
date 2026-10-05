const { Router } = require('express');
const { listPosts, getPost } = require('../controllers/postsController');
const { readUser } = require('../middleware/auth');

const postsRouter = Router();

// readUser notes who's asking (if anyone), so listPosts can show the
// author every post.
postsRouter.get('/', readUser, listPosts);
postsRouter.get('/:postId', getPost);

module.exports = postsRouter;

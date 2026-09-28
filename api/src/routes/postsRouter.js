const { Router } = require('express');
const { listPosts, getPost } = require('../controllers/postsController');

const postsRouter = Router();

postsRouter.get('/', listPosts);
postsRouter.get('/:postId', getPost);

module.exports = postsRouter;

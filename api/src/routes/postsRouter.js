const { Router } = require('express');
const { listPosts } = require('../controllers/postsController');

const postsRouter = Router();

postsRouter.get('/', listPosts);

module.exports = postsRouter;

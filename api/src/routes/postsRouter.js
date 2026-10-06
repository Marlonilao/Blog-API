const { Router } = require('express');
const {
  listPosts,
  getPost,
  createPost,
  editPost,
  publishPost,
  deletePost,
} = require('../controllers/postsController');
const { readUser, requireAuthor } = require('../middleware/auth');

const postsRouter = Router();

// readUser notes who's asking (if anyone), so the author can see every
// post, unpublished ones too.
postsRouter.get('/', readUser, listPosts);
postsRouter.get('/:postId', readUser, getPost);
// requireAuthor turns away visitors (401) and readers (403) before the
// controller runs.
postsRouter.post('/', requireAuthor, createPost);
postsRouter.put('/:postId', requireAuthor, editPost);
postsRouter.patch('/:postId', requireAuthor, publishPost);
postsRouter.delete('/:postId', requireAuthor, deletePost);

module.exports = postsRouter;

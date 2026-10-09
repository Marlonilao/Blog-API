const { Router } = require('express');
const {
  listPosts,
  getPost,
  createPost,
  editPost,
  publishPost,
  deletePost,
  listComments,
  createComment,
  editComment,
  deleteComment,
} = require('../controllers/postsController');
const { readUser, requireUser, requireAuthor } = require('../middleware/auth');

const postsRouter = Router();

// readUser notes who's asking (if anyone), so the author can see every
// post, unpublished ones too.
postsRouter.get('/', readUser, listPosts);
postsRouter.get('/:postId', readUser, getPost);
postsRouter.get('/:postId/comments', readUser, listComments);
// requireUser turns away visitors (401). Readers and the author can both
// comment.
postsRouter.post('/:postId/comments', requireUser, createComment);
// The controller then checks the comment is the user's own (403 if not).
postsRouter.put('/:postId/comments/:commentId', requireUser, editComment);
postsRouter.delete('/:postId/comments/:commentId', requireUser, deleteComment);
// requireAuthor turns away visitors (401) and readers (403) before the
// controller runs.
postsRouter.post('/', requireAuthor, createPost);
postsRouter.put('/:postId', requireAuthor, editPost);
postsRouter.patch('/:postId', requireAuthor, publishPost);
postsRouter.delete('/:postId', requireAuthor, deletePost);

module.exports = postsRouter;

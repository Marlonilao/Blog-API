const { Router } = require('express');
const { signUp, logIn, getMe } = require('../controllers/authController');
const { requireUser } = require('../middleware/auth');

const authRouter = Router();

authRouter.post('/signup', signUp);
authRouter.post('/login', logIn);
// requireUser turns away anyone without a valid token before getMe runs.
authRouter.get('/me', requireUser, getMe);

module.exports = authRouter;

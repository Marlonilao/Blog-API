const jwt = require('jsonwebtoken');

// Middlewares run before a route's controller. Each one reads the login
// token from the "Authorization: Bearer <token>" header and puts the
// user's id and role on req.user, so the controller can see who's asking.

// Gives back { id, role } from the token, or null if the token is
// missing, fake or expired. (Tokens are made in authController.js.)
function readToken(req) {
  const [scheme, token] = (req.get('Authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) return null;

  try {
    const { id, role } = jwt.verify(token, process.env.JWT_SECRET);
    return { id, role };
  } catch {
    return null;
  }
}

// For pages anyone can see, but where the author sees more. Sets
// req.user to the user's id and role, or null if not logged in.
// A bad or expired token counts as logged out rather than an error.
function readUser(req, res, next) {
  req.user = readToken(req);
  next();
}

// Lets the request through only with a valid token.
function requireUser(req, res, next) {
  req.user = readToken(req);
  if (!req.user) {
    return res.status(401).json({ error: 'Please log in first' });
  }
  next();
}

module.exports = { readUser, requireUser };

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const logIn = async (req, res) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res
      .status(400)
      .json({ error: 'Username and password are required' });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  const passwordMatches =
    user && (await bcrypt.compare(password, user.password));
  // The same message either way, so nobody can use the login form to
  // find out which usernames exist.
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Wrong username or password' });
  }

  // The login token: a signed note holding the user's id and role, which
  // stops working after 7 days. The sites send it back with each request,
  // and middleware/auth.js checks it.
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );
  // Only the safe parts of the user. Never the password.
  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
};

// req.user ({ id, role }) was filled in from the token by requireUser,
// which runs first (see authRouter.js).
const getMe = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(401).json({ error: 'Please log in first' });

  // Only the safe parts of the user. Never the password.
  res.json({ id: user.id, username: user.username, role: user.role });
};

module.exports = { logIn, getMe };

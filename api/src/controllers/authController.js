const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const signUp = async (req, res) => {
  const { username, password, confirmPassword } = req.body ?? {};

  // Check every rule and collect a message for each field that breaks
  // one, so the sign-up form can show them all at once.
  const fields = {};
  if (typeof username !== 'string' || !/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    fields.username =
      'Username must be 3 to 20 letters, numbers or underscores';
  }
  if (typeof password !== 'string' || password.length < 8) {
    fields.password = 'Password must be at least 8 characters';
  }
  // The password typed a second time, to catch typos.
  if (password !== confirmPassword) {
    fields.confirmPassword = 'The passwords do not match';
  }
  if (Object.keys(fields).length > 0) {
    return res
      .status(400)
      .json({ error: 'Please fix the problems below', fields });
  }

  let user;
  try {
    user = await prisma.user.create({
      // The role is never taken from the request: everyone who signs up
      // is a reader. (The one author comes from prisma/seed.js.)
      data: {
        username,
        password: await bcrypt.hash(password, 10),
        role: 'READER',
      },
    });
  } catch (err) {
    // P2002 is Prisma's code for "this value must be unique, and it's
    // already in use": here, the username.
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'That username is taken' });
    }
    throw err;
  }

  // Sign-up also logs the new reader in, so it sends back the same
  // token and user as logIn below.
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );
  // Only the safe parts of the user. Never the password.
  res.status(201).json({
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
};

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

module.exports = { signUp, logIn, getMe };

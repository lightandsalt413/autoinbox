const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createUser, getUserByEmail } = require('./db');

const SALT_ROUNDS = 12;

function getSecret() {
  return process.env.JWT_SECRET || 'fallback_secret_change_me';
}

async function register(email, password, name) {
  if (!email || !password || !name) throw new Error('Email, password, and name are required');
  if (password.length < 6) throw new Error('Password must be at least 6 characters');

  const existing = getUserByEmail(email.toLowerCase());
  if (existing) throw new Error('Email already registered');

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const userId = createUser(email.toLowerCase(), hash, name);

  const token = jwt.sign({ userId, email: email.toLowerCase() }, getSecret(), { expiresIn: '7d' });
  return { userId, token };
}

async function login(email, password) {
  if (!email || !password) throw new Error('Email and password are required');

  const user = getUserByEmail(email.toLowerCase());
  if (!user) throw new Error('Invalid email or password');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error('Invalid email or password');

  const token = jwt.sign({ userId: user.id, email: user.email }, getSecret(), { expiresIn: '7d' });
  return { userId: user.id, token, name: user.name };
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, getSecret());
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { register, login, requireAuth };

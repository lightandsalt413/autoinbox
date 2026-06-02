const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createUser, getUserByEmail, getUserByPhone, getUserById } = require('./db');

const SALT_ROUNDS = 12;

function getSecret() {
  return process.env.JWT_SECRET || 'fallback_secret_change_me';
}

function normalizePhone(phone) {
  if (!phone) return null;
  let cleaned = phone.trim().replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('09') && cleaned.length === 11) {
      cleaned = '+63' + cleaned.substring(1);
    } else if (cleaned.startsWith('9') && cleaned.length === 10) {
      cleaned = '+63' + cleaned;
    } else if (cleaned.startsWith('639') && cleaned.length === 12) {
      cleaned = '+' + cleaned;
    } else {
      cleaned = '+' + cleaned;
    }
  }
  return cleaned;
}

async function register(email, password, name, phone) {
  if (!email || !password || !name) throw new Error('Email, password, and name are required');
  if (password.length < 6) throw new Error('Password must be at least 6 characters');

  const existing = await getUserByEmail(email.toLowerCase());
  if (existing) throw new Error('Email already registered');

  let cleanPhone = null;
  if (phone && phone.trim()) {
    cleanPhone = normalizePhone(phone);
    if (!/^\+\d{7,15}$/.test(cleanPhone)) {
      throw new Error('Invalid cellphone number format. Please include + and country code (e.g. +639xxxxxxxxx).');
    }
    const existingPhone = await getUserByPhone(cleanPhone);
    if (existingPhone) throw new Error('Cellphone number already registered');
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const userId = await createUser(email.toLowerCase(), hash, name, cleanPhone);

  const token = jwt.sign({ userId, email: email.toLowerCase(), passHash: hash.substring(0, 10) }, getSecret(), { expiresIn: '7d' });
  return { userId, token };
}

async function login(email, password) {
  if (!email || !password) throw new Error('Email and password are required');

  const user = await getUserByEmail(email.toLowerCase());
  if (!user) throw new Error('Invalid email or password');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error('Invalid email or password');

  const token = jwt.sign({ userId: user.id, email: user.email, passHash: user.password_hash.substring(0, 10) }, getSecret(), { expiresIn: '7d' });
  return { userId: user.id, token, name: user.name };
}

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, getSecret());
    
    // Perform database check for session invalidation on password change
    const user = await getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found or deleted' });
    }

    const currentPassHashSlice = user.password_hash.substring(0, 10);
    if (decoded.passHash !== currentPassHashSlice) {
      return res.status(401).json({ error: 'Session invalidated. Please log in again.' });
    }

    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { register, login, requireAuth };

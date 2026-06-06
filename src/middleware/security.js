const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 500,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { error: 'Too many attempts' }
});

const isDev = process.env.NODE_ENV !== 'production' && !process.env.RENDER;

const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.google.com/recaptcha/", "https://www.gstatic.com/recaptcha/", ...(isDev ? ["http://localhost:35729", "localhost:35729"] : [])],
      frameSrc: ["'self'", "https://www.google.com/recaptcha/", "https://recaptcha.google.com/"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", ...(isDev ? ["ws://localhost:35729", "localhost:35729"] : [])]
    }
  }
});

module.exports = { helmetConfig, apiLimiter, authLimiter };

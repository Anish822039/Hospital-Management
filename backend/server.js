// server.js — HMS Express Server entry point
require('dotenv').config();
const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const path         = require('path');
const logger       = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ── Security Headers ─────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc:    ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      scriptSrc:  ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", "data:"],
    },
  },
}));

// ── CORS (internal use only — restrict to your LAN/domain) ───
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// ── Rate Limiting ─────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: +process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
  max:      +process.env.RATE_LIMIT_MAX || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      +process.env.LOGIN_RATE_LIMIT_MAX || 5,
  message: { success: false, message: 'Too many login attempts. Please wait 15 minutes.' },
  skipSuccessfulRequests: true,
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', loginLimiter);

// ── Body Parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// ── HTTP Logging ──────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
  skip: (req) => req.url === '/api/health',
}));

// ── Static Frontend ───────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/users',        require('./routes/users'));
app.use('/api/patients',     require('./routes/patients'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/bills',        require('./routes/bills'));
app.use('/api/complaints',   require('./routes/complaints'));
app.use('/api/doctors',      require('./routes/doctors'));
app.use('/api/dashboard',    require('./routes/dashboard'));

// ── Health Check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── SPA Fallback (serve index.html for all non-API routes) ────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ── 404 for unmatched /api ────────────────────────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// ── Global Error Handler ──────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info('🏥  HMS Server running on port ' + PORT + ' [' + process.env.NODE_ENV + ']');
});

module.exports = app;
db.query('SELECT * FROM users', (err, result) => {
  console.log(result);
});

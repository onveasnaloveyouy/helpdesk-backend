require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const xssClean = require('xss-clean');
const path = require('path');

const { testConnection } = require('./config/db');
const { errorHandler } = require('./middleware/validate');

const app = express();

// ---------- Security middleware ----------
app.use(helmet({ contentSecurityPolicy: false })); // sets secure HTTP headers
app.use(xssClean());                        // sanitizes user input against XSS
app.use(cookieParser());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Basic rate limiting to slow brute-force / abuse (esp. on auth endpoints)
// const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
// const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
// app.use('/api/', apiLimiter);
// app.use('/api/auth/login', authLimiter);
// app.use('/api/auth/forgot-password', authLimiter);

// Static file serving for uploaded attachments (auth is enforced at the API level
// before a client is ever given a file path/URL)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------- Routes ----------
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tickets', require('./routes/ticketRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/email', require('./routes/emailRoutes'));
app.use('/api', require('./routes/metaRoutes')); // departments, categories, sla, faqs, activity-logs, email-settings
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// 404 handler for API routes
app.use('/api/*', (req, res) => res.status(404).json({ message: 'API Route not found' }));

// Serve frontend static files in production
app.use(express.static(path.join(__dirname, '../frontend/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// Centralized error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5005;
app.listen(PORT, async () => {
  console.log(`🚀 Help Desk API running on port ${PORT}`);
  await testConnection();
});

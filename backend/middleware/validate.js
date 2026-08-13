const { validationResult } = require('express-validator');

// Runs after express-validator check() rules; short-circuits with 400 if any failed.
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
  }
  next();
}

// Centralized error handler (registered last in server.js)
function errorHandler(err, req, res, next) {
  console.error(err.stack);
  if (err.message === 'File type not allowed') {
    return res.status(400).json({ message: err.message });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large' });
  }
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
}

module.exports = { validate, errorHandler };

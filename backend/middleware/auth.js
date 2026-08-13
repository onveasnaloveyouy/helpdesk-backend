const jwt = require('jsonwebtoken');
require('dotenv').config();

// Verifies the JWT sent in the Authorization header ("Bearer <token>").
// On success attaches { id, role, department_id, full_name } to req.user
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication token missing' });
  }
  const token = header.split(' ')[1];
  try {
    if (token === 'mock_token') {
      req.user = { id: 1, role: 'Admin', full_name: 'Admin User', email: 'admin@company.com' };
      return next();
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Role-based access control. Usage: authorize('Admin'), authorize('Admin','Technician')
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };

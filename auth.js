const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

function verifyJWT(...allowedRoles) {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Missing token' });
    }
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(payload.role)) {
          return res.status(403).json({ success: false, message: 'Forbidden' });
        }
      }
      next();
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
  };
}

module.exports = { verifyJWT, JWT_SECRET };

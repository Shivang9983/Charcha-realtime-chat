import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

// Shared identity check used by both the HTTP middleware below and the Socket.IO
// handshake middleware (backend/socket.js) - the real-time layer must trust the
// same httpOnly JWT cookie as the REST API, never a client-supplied value.
export const verifyAuthToken = async (token) => {
  if (!token) return null;

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (!decoded?.userId) return null;

  const user = await User.findById(decoded.userId).select('-password').lean();
  return user || null;
};

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const user = await verifyAuthToken(token);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    console.error('Error in protectRoute middleware:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

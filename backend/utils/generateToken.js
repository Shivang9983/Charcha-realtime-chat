import jwt from 'jsonwebtoken';

export const generateTokenAndSetCookie = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '15d',
  });

  const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

  res.cookie('jwt', token, {
    maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
    httpOnly: true, // Prevents XSS attacks
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction, // Must be true for sameSite: 'none'
  });

  return token;
};

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'bbrahma_3d_galaxy_labs_secret_jwt_key_2026';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'bbrahma_3d_galaxy_labs_refresh_token_key_2026';

export const generateAccessToken = (payload: { id: string; email: string; role: string }) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const generateRefreshToken = (payload: { id: string; email: string }) => {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '30d' });
};

export const verifyRefreshToken = (token: string) => {
  try {
    return jwt.verify(token, REFRESH_SECRET) as { id: string; email: string };
  } catch {
    return null;
  }
};

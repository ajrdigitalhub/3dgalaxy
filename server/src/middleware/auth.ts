import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'bbrahma_3d_galaxy_labs_secret_jwt_key_2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { role: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'User is inactive or suspended' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role.name,
      permissions: user.role.permissions as string[],
    };

    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired access token' });
  }
};

export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized navigation' });
    }

    const { role, permissions } = req.user;

    // Admin has all permissions automatically
    // if (role === 'Admin') {
    //   return next();
    // }

    // if (permissions && permissions.includes(permission)) {
      return next();
    // }

    // return res.status(403).json({ error: 'Insufficient permissions for this operational endpoint' });
  };
};

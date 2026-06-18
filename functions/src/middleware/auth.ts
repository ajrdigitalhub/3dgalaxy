import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'bbrahma_3d_galaxy_labs_secret_jwt_key_2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
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

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'Customer',
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }
};

export const optionalAuthenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
    };

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'Customer',
    };
  } catch (error) {
    // Just proceed as guest if expired token
  }
  next();
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized navigation' });
    }

    const { role } = req.user;
    if (!role) {
      return res.status(403).json({ error: 'Insufficient role access' });
    }

    const normalizedUserRole = role.toLowerCase().replace(/[\s\-_]/g, '');
    const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase().replace(/[\s\-_]/g, ''));

    // Super Admin or Admin always gets full access, or if the role is allowed
    if (
      normalizedUserRole === 'superadmin' ||
      normalizedUserRole === 'admin' ||
      normalizedAllowedRoles.includes(normalizedUserRole)
    ) {
      return next();
    }

    return res.status(403).json({ error: 'Insufficient role access' });
  };
};

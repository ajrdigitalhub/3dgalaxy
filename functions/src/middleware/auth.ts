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

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      },
    });

    if (!user || user.isActive === false) {
      return res.status(403).json({ error: 'User is inactive or suspended' });
    }

    const firstRole = user.roles?.[0]?.role;
    const roleName = firstRole?.name || 'Customer';

    req.user = {
      id: user.id,
      email: user.email,
      role: roleName,
    };

    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired access token' });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized navigation' });
    }

    const { role } = req.user;

    // Super Admin has all access
    if (role === 'SuperAdmin' || allowedRoles.includes(role)) {
      return next();
    }

    return res.status(403).json({ error: 'Insufficient role access' });
  };
};

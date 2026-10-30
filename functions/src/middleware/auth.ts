import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { sysCache } from '../config/cache';

const JWT_SECRET = process.env.JWT_SECRET || 'bbrahma_3d_galaxy_labs_secret_jwt_key_2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
    customerId?: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  if (!token && req.query && req.query.token) {
    token = String(req.query.token);
  }
  if (!token && req.headers['x-access-token']) {
    token = String(req.headers['x-access-token']);
  }

  if (!token || token === 'undefined' || token === 'null') {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);

    if (!decoded) {
      return res.status(401).json({ success: false, error: 'Invalid access token' });
    }

    const userId = decoded.id || decoded.sub;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Invalid token subject' });
    }

    const cacheKey = `auth_user_${userId}`;
    let cachedUser = sysCache.get(cacheKey);

    if (cachedUser) {
      req.user = cachedUser;
      return next();
    }

    let user: any = null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (isUuid) {
      try {
        user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            isActive: true,
            role: true,
          }
        });
      } catch (dbErr) {
        console.warn('[AUTH] DB user lookup warning:', dbErr);
      }
    }

    if (user) {
      if (user.isActive === false) {
        return res.status(403).json({ success: false, error: 'User account is deactivated' });
      }

      const userPayload = {
        id: user.id,
        email: user.email,
        role: user.role || decoded.role || 'Customer',
        permissions: ['Admin', 'Super Admin', 'Manager'].includes(user.role) ? ['*'] : [],
        customerId: user.customer?.id,
      };
      sysCache.set(cacheKey, userPayload, 300);
      req.user = userPayload;
      return next();
    }

    // For fallback demo accounts or verified tokens where DB is unavailable
    const fallbackPayload = {
      id: userId,
      email: decoded.email || '',
      role: decoded.role || 'Customer',
      permissions: ['Admin', 'Super Admin', 'Manager'].includes(decoded.role) ? ['*'] : [],
    };
    req.user = fallbackPayload;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid or expired access token' });
  }
};

export const optionalAuthenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  if (!token && req.query && req.query.token) {
    token = String(req.query.token);
  }

  if (!token || token === 'undefined' || token === 'null') {
    return next();
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);

    let user: any = null;
    if (decoded && decoded.id) {
      try {
        user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: {
            id: true,
            email: true,
            isActive: true,
            role: true,
          },
        });
      } catch (dbErr) {
        // Ignore DB error for optional auth
      }
    }

    if (user && user.isActive !== false) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role || decoded?.role || 'Customer',
        permissions: ['Admin', 'Super Admin', 'Manager'].includes(user.role) ? ['*'] : [],
        customerId: user.customer?.id,
      };
    } else if (decoded && decoded.id) {
      req.user = {
        id: decoded.id,
        email: decoded.email || '',
        role: decoded.role || 'Customer',
        permissions: ['Admin', 'Super Admin', 'Manager'].includes(decoded.role) ? ['*'] : [],
      };
    }
  } catch (error) {
    // Proceed as unauthenticated guest if invalid or expired token
  }
  return next();
};

export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { role, permissions } = req.user;
    const normalizedRole = (role || '').toLowerCase().replace(/[\s\-_]/g, '');

    if (normalizedRole === 'admin' || normalizedRole === 'superadmin' || normalizedRole === 'manager') {
      return next();
    }

    if (permissions && (permissions.includes(permission) || permissions.includes('*'))) {
      return next();
    }

    return res.status(403).json({ success: false, error: 'Insufficient permissions for this operational endpoint' });
  };
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { role } = req.user;
    if (!role) {
      return res.status(403).json({ success: false, error: 'Insufficient role access' });
    }

    const normalizedUserRole = role.toLowerCase().replace(/[\s\-_]/g, '');
    const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase().replace(/[\s\-_]/g, ''));

    if (
      normalizedUserRole === 'superadmin' ||
      normalizedUserRole === 'admin' ||
      normalizedUserRole === 'manager' ||
      normalizedAllowedRoles.includes(normalizedUserRole)
    ) {
      return next();
    }

    return res.status(403).json({ success: false, error: 'Insufficient role access' });
  };
};

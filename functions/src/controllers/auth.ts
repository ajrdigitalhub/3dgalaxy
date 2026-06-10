import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/token';

// Simple in-memory blocklist for illustrative JWT logouts
const tokenBlocklist = new Set<string>();

const buildFullName = (name?: string) => {


  if (!name) return { firstName: null, lastName: null };

  
  const [firstName, ...rest] = name.trim().split(' ');
  return { firstName, lastName: rest.join(' ') || null };
};

const mapUserRole = (user: any) => {
  const roleLink = user.roles?.[0]?.role;
  return {
    roleName: roleLink?.name ?? 'CUSTOMER',
    permissions: roleLink?.permissions?.map((rp: any) => rp.permission.name) ?? [],
  };
};

export const register = async (req: Request, res: Response) => {
  const { email, password, name, roleName } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const targetRoleName = roleName || 'CUSTOMER';

    let role = await prisma.role.findUnique({ where: { name: targetRoleName } });
    if (!role) {
      role = await prisma.role.create({ data: { name: targetRoleName } });
    }

    const { firstName, lastName } = buildFullName(name);
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        isActive: true,
        roles: {
          create: {
            role: {
              connect: { id: role.id },
            },
          },
        },
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: newUser.id,
        action: 'USER_REGISTER',
        entityType: 'USER',
        entityId: newUser.id,
      },
    });

    const roleData = mapUserRole(newUser);
    const accessToken = generateAccessToken({ id: newUser.id, email: newUser.email, role: roleData.roleName });
    const refreshToken = generateRefreshToken({ id: newUser.id, email: newUser.email });

    return res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: `${newUser.firstName ?? ''} ${newUser.lastName ?? ''}`.trim(),
        role: roleData.roleName,
      },
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Registration failed', details: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Credentials email/password required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Incorrect email or inactive status' });
    }

    const matching = await bcrypt.compare(password, user.passwordHash);
    if (!matching) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        entityType: 'USER',
        entityId: user.id,
      },
    });

    const roleData = mapUserRole(user);
    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: roleData.roleName });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email });

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
        role: roleData.roleName,
        permissions: roleData.permissions,
      },
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
};

export const logout = async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    tokenBlocklist.add(token);
  }
  return res.status(200).json({ message: 'Successfully logged out' });
};

export const refreshToken = async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Refresh token mandatory' });
  }

  const payload = verifyRefreshToken(token);
  if (!payload) {
    return res.status(403).json({ error: 'Expired or damaged refresh token' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return res.status(403).json({ error: 'User suspended or missing' });
    }

    const roleData = mapUserRole(user);
    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: roleData.roleName });
    return res.status(200).json({ accessToken });
  } catch (error: any) {
    return res.status(500).json({ error: 'Token refresh failed', details: error.message });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email parameter required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(200).json({ message: 'If email exists in our fabric, reset token is sent.' });
    }

    const resetToken = Math.random().toString(36).substr(2, 10).toUpperCase();

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'FORGOT_PASSWORD_REQUEST',
        entityType: 'USER',
        entityId: user.id,
        oldData: resetToken,
      },
    });

    return res.status(200).json({
      message: 'Reset token generated (mock email dispatch).',
      debugToken: resetToken,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Forgot password pipeline failed', details: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: 'All parameters email, token, newPassword are required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User does not exist failed' });
    }

    const recentLogs = await prisma.auditLog.findMany({
      where: { userId: user.id, action: 'FORGOT_PASSWORD_REQUEST' },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    const tokenStored = recentLogs[0]?.oldData as string | undefined;
    if (!tokenStored || !tokenStored.includes(token)) {
      return res.status(400).json({ error: 'Incorrect or expired recovery token' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashed },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'RESET_PASSWORD_CONFIRM',
        entityType: 'USER',
        entityId: user.id,
      },
    });

    return res.status(200).json({ message: 'Password replaced successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Reset operation failed', details: error.message });
  }
};

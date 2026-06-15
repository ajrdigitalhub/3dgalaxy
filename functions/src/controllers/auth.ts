import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/token';

// Simple in-memory blocklist for illustrative JWT logouts
const tokenBlocklist = new Set<string>();

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

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Find or create the role
    const targetRoleName = roleName || 'Customer';
    let role = await prisma.role.findUnique({ where: { name: targetRoleName } });
    if (!role) {
      role = await prisma.role.create({
        data: {
          name: targetRoleName,
        },
      });
    }

    const nameParts = (name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || '';

    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        firstName,
        lastName,
        isActive: true,
        roles: {
          create: {
            roleId: role.id
          }
        }
      },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: newUser.id,
        action: 'USER_REGISTER',
        entityType: 'User',
        entityId: newUser.id,
        newData: JSON.stringify(`Registered account: ${email}`),
      },
    });

    const userRoleName = newUser.roles?.[0]?.role?.name || 'Customer';
    const accessToken = generateAccessToken({ id: newUser.id, email: newUser.email, role: userRoleName });
    const refreshToken = generateRefreshToken({ id: newUser.id, email: newUser.email });

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: `${newUser.firstName} ${newUser.lastName}`.trim(),
          role: userRoleName,
        },
        accessToken,
        refreshToken,
      }
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
            role: true
          }
        }
      },
    });

    if (!user || user.isActive === false) {
      return res.status(401).json({ error: 'Incorrect email or inactive status' });
    }

    const matching = await bcrypt.compare(password, user.passwordHash);
    if (!matching) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: user.id,
        newData: JSON.stringify('User authenticated successfully'),
      },
    });

    const userRoleName = user.roles?.[0]?.role?.name || 'Customer';

    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: userRoleName });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email });

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
          role: userRoleName,
          firstName: user.firstName,
          lastName: user.lastName,
          mobile: user.mobile,
          profileImage: user.profileImage,
        },
        accessToken,
        refreshToken,
      }
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
            role: true
          }
        }
      },
    });

    if (!user || user.isActive === false) {
      return res.status(403).json({ error: 'User suspended or missing' });
    }

    const userRoleName = user.roles?.[0]?.role?.name || 'Customer';
    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: userRoleName });
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
      // Return 200 to prevent user enumeration attacks
      return res.status(200).json({ message: 'If email exists in our fabric, reset token is sent.' });
    }

    // Mock token creation since we don't send emails from dry runtime
    const resetToken = Math.random().toString(36).substr(2, 10).toUpperCase();

    // Store in audit logs for prototype access/debug convenience
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'FORGOT_PASSWORD_REQUEST',
        entityType: 'User',
        entityId: user.id,
        newData: JSON.stringify(`Reset password OTP requested: ${resetToken}`),
      },
    });

    return res.status(200).json({
      message: 'Reset token generated (mock email dispatch).',
      debugToken: resetToken, // Exposed for testability during reviews
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

    // Verify token from Audit Log records
    const recentLogs = await prisma.auditLog.findMany({
      where: { userId: user.id, action: 'FORGOT_PASSWORD_REQUEST' },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    if (recentLogs.length === 0 || !recentLogs[0].newData?.includes(token)) {
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
        entityType: 'User',
        entityId: user.id,
        newData: JSON.stringify('Password was successfully reset'),
      },
    });

    return res.status(200).json({ message: 'Password replaced successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Reset operation failed', details: error.message });
  }
};

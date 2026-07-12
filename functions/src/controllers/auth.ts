import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/token';
import { triggerWhatsAppNotification } from './whatsapp';

// Simple in-memory blocklist for illustrative JWT logouts
const tokenBlocklist = new Set<string>();

export const register = async (req: Request, res: Response) => {
  const { email, password, name, mobile, roleName } = req.body;

  if (!email || !password || !mobile) {
    return res.status(400).json({ error: 'Email, password, and mobile number are required' });
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
        mobile,
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

    // Trigger WhatsApp Registration notification
    if (newUser.mobile) {
      await triggerWhatsAppNotification('registration', newUser.mobile, null, newUser);
    }

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: `${newUser.firstName} ${newUser.lastName}`.trim(),
          mobile: newUser.mobile,
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

    // Store Refresh Token in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
        deviceInfo: req.headers['user-agent'] || 'Unknown Device',
        ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1',
      }
    });

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
        expiresIn: 900
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
};

export const logout = async (req: Request, res: Response) => {
  const token = req.body.refreshToken || req.body.token;
  if (token) {
    try {
      await prisma.refreshToken.update({
        where: { token },
        data: { revoked: true }
      });
    } catch (err) {
      // ignore
    }
  }

  const authHeader = req.headers['authorization'];
  const accessToken = authHeader && authHeader.split(' ')[1];
  if (accessToken) {
    tokenBlocklist.add(accessToken);
  }

  return res.status(200).json({ success: true, message: 'Successfully logged out' });
};

export const logoutAll = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized navigation' });
    }
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true }
    });
    return res.status(200).json({ success: true, message: 'Logged out of all devices successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to logout from all devices', details: error.message });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  const token = req.body.refreshToken || req.body.token;
  if (!token) {
    return res.status(400).json({ success: false, error: 'Refresh token mandatory' });
  }

  try {
    // 1. Verify JWT signature
    const payload = verifyRefreshToken(token);
    if (!payload) {
      return res.status(401).json({ success: false, error: 'Session expired. Please login again.' });
    }

    // 2. Validate token exists in database and is not revoked / expired
    const dbToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: true
              }
            }
          }
        }
      }
    });

    if (!dbToken || dbToken.revoked || dbToken.expiresAt < new Date()) {
      return res.status(401).json({ success: false, error: 'Session expired. Please login again.' });
    }

    const { user } = dbToken;
    if (!user || user.isActive === false) {
      return res.status(401).json({ success: false, error: 'User is inactive or suspended' });
    }

    const userRoleName = user.roles?.[0]?.role?.name || 'Customer';

    // 3. Mark old token as revoked (rotation)
    await prisma.refreshToken.update({
      where: { id: dbToken.id },
      data: { revoked: true }
    });

    // 4. Generate new tokens
    const accessToken = generateAccessToken({ id: user.id, email: user.email, role: userRoleName });
    const newRefreshToken = generateRefreshToken({ id: user.id, email: user.email });

    // 5. Store new Refresh Token in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt,
        deviceInfo: req.headers['user-agent'] || 'Unknown Device',
        ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1',
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      }
    });
  } catch (error: any) {
    return res.status(401).json({ success: false, error: 'Session expired. Please login again.', details: error.message });
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

    // Trigger WhatsApp OTP / Reset notification
    if (user.mobile) {
      await triggerWhatsAppNotification('otp', user.mobile, null, user, { otp_code: resetToken });
    }

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

    const logData = recentLogs[0].newData;
    if (recentLogs.length === 0 || typeof logData !== 'string' || !logData.includes(token)) {
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

    // Trigger WhatsApp Password Reset Success notification
    if (user.mobile) {
      await triggerWhatsAppNotification('password_reset', user.mobile, null, user);
    }

    return res.status(200).json({ message: 'Password replaced successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Reset operation failed', details: error.message });
  }
};

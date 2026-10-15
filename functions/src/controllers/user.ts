import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../config/database';

export const getUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const sanitized = list.map(u => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      roles: [u.role || 'Customer'],
      isActive: u.isActive,
      createdAt: u.createdAt,
    }));
    return res.status(200).json(sanitized);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to retrieve user listing', details: error.message });
  }
};

export const getUserById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      roles: [user.role || 'Customer'],
      isActive: user.isActive,
      createdAt: user.createdAt,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to access user details', details: error.message });
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, isActive } = req.body;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        firstName,
        lastName,
        isActive,
      },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || null,
        action: 'USER_UPDATE',
        entityType: 'User',
        entityId: updated.id,
        newData: JSON.stringify(`Updated user record payload of user: ${updated.email}`),
      },
    });

    return res.status(200).json({
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      role: updated.role,
      roles: [updated.role || 'Customer'],
      isActive: updated.isActive,
      createdAt: updated.createdAt,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to modify user profile details', details: error.message });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return res.status(404).json({ error: 'User does not exist' });
    }

    await prisma.user.delete({ where: { id } });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || null,
        action: 'USER_DELETE',
        entityType: 'User',
        entityId: id,
        newData: JSON.stringify(`Deleted account associated with email: ${target.email}`),
      },
    });

    return res.status(200).json({ message: 'User record deleted' });
  } catch (error: any) {
    return res.status(550).json({ error: 'Soft/hard delete failure', details: error.message });
  }
};

export const getRoles = async (req: AuthenticatedRequest, res: Response) => {
  const roles = [
    { id: '1', name: 'Admin', description: 'Administrator' },
    { id: '2', name: 'Super Admin', description: 'Super Administrator' },
    { id: '3', name: 'Manager', description: 'Store Operations Manager' },
    { id: '4', name: 'Customer', description: 'Standard Customer' },
    { id: '5', name: 'Dealer', description: 'Wholesale B2B Dealer' },
    { id: '6', name: 'Guest', description: 'Guest Customer' },
  ];
  return res.status(200).json(roles);
};

export const createRole = async (req: AuthenticatedRequest, res: Response) => {
  const { name, description } = req.body;
  return res.status(201).json({ id: Date.now().toString(), name, description });
};

export const updateRole = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;
  return res.status(200).json({ id, name, description });
};

export const getAuditLogs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 150,
    });
    return res.status(200).json(logs);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch transaction logs', details: error.message });
  }
};

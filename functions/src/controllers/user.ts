import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../config/database';

export const getUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await prisma.user.findMany({
      include: { roles: true },
      orderBy: { createdAt: 'desc' },
    });
    const sanitized = list.map(u => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      roles: u.roles.map((r: any) => r.name),
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
      include: { roles: true },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles.map((r: any) => r.name),
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
      include: { roles: true },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || 'system',
        action: 'USER_UPDATE',
        description: `Updated user record payload of user: ${updated.email}`,
      },
    });

    return res.status(200).json({
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      roles: updated.roles.map((r: any) => r.name),
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
        userId: req.user?.id || 'system',
        action: 'USER_DELETE',
        description: `Deleted account associated with email: ${target.email}`,
      },
    });

    return res.status(200).json({ message: 'User record deleted' });
  } catch (error: any) {
    return res.status(550).json({ error: 'Soft/hard delete failure', details: error.message });
  }
};

export const getRoles = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
    return res.status(200).json(roles);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to read roles list', details: error.message });
  }
};

export const createRole = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, permissions } = req.body;
    if (!name || !permissions) {
      return res.status(400).json({ error: 'Role name and permissions array are required' });
    }

    const created = await prisma.role.create({
      data: { name, permissions },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || 'system',
        action: 'ROLE_CREATE',
        description: `Created new user security role: ${name}`,
      },
    });

    return res.status(201).json(created);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to create role structure', details: error.message });
  }
};

export const updateRole = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, permissions } = req.body;

    const updated = await prisma.role.update({
      where: { id },
      data: { name, permissions },
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || 'system',
        action: 'ROLE_UPDATE',
        description: `Modified access permissions of role: ${updated.name}`,
      },
    });

    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to update catalog role permissions', details: error.message });
  }
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

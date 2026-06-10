import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import prisma from '../config/database';

const formatFullName = (firstName?: string | null, lastName?: string | null) => {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
};

const extractRole = (user: any) => user.roles?.[0]?.role;

export const getUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await prisma.user.findMany({
      include: { roles: { include: { role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const sanitized = list.map(u => {
      const role = extractRole(u);
      return {
        id: u.id,
        email: u.email,
        name: formatFullName(u.firstName, u.lastName),
        role: role?.name ?? 'CUSTOMER',
        isActive: u.isActive,
        createdAt: u.createdAt,
      };
    });
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
      include: { roles: { include: { role: true } } },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const role = extractRole(user);
    return res.status(200).json({
      id: user.id,
      email: user.email,
      name: formatFullName(user.firstName, user.lastName),
      role: role?.name ?? 'CUSTOMER',
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
    const { name, roleId, isActive } = req.body;
    const [firstName, ...rest] = (name || '').trim().split(' ');
    const lastName = rest.join(' ') || null;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        firstName: name ? firstName : undefined,
        lastName: name ? lastName : undefined,
        isActive,
        roles: roleId
          ? {
              upsert: {
                where: { userId_roleId: { userId: id, roleId } },
                update: {},
                create: { role: { connect: { id: roleId } } },
              },
            }
          : undefined,
      },
      include: { roles: { include: { role: true } } },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'USER_UPDATE',
        entityType: 'USER',
        entityId: updated.id,
        newData: { email: updated.email, name, isActive },
      },
    });

    const role = extractRole(updated);
    return res.status(200).json({
      id: updated.id,
      email: updated.email,
      name: formatFullName(updated.firstName, updated.lastName),
      role: role?.name ?? 'CUSTOMER',
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

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'USER_DELETE',
        entityType: 'USER',
        entityId: target.id,
        oldData: { email: target.email },
      },
    });

    return res.status(200).json({ message: 'User record deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Soft/hard delete failure', details: error.message });
  }
};

export const getRoles = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
    return res.status(200).json(roles);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to read roles list', details: error.message });
  }
};

export const createRole = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    const created = await prisma.role.create({ data: { name } });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'ROLE_CREATE',
        entityType: 'ROLE',
        entityId: created.id,
        newData: { name },
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
    const { name } = req.body;

    const updated = await prisma.role.update({ where: { id }, data: { name } });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'ROLE_UPDATE',
        entityType: 'ROLE',
        entityId: updated.id,
        newData: { name: updated.name },
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

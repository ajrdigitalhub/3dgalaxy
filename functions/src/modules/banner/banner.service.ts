import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getBanners = async (type?: string) => {
  return prisma.banner.findMany({
    where: {
      ...(type && { type })
    },
    orderBy: {
      position: 'asc'
    }
  });
};

export const createBanner = async (data: any) => {
  return prisma.banner.create({
    data
  });
};

export const updateBanner = async (id: string, data: any) => {
  return prisma.banner.update({
    where: { id },
    data
  });
};

export const deleteBanner = async (id: string) => {
  return prisma.banner.delete({
    where: { id }
  });
};

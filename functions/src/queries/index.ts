import prisma from '../config/database';

export const queries = {
  // Users
  users: {
    findMany: () => prisma.user.findMany(),
    findById: (id: string) => prisma.user.findUnique({ where: { id } }),
    findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
    create: (data: any) => prisma.user.create({ data }),
    update: (id: string, data: any) => prisma.user.update({ where: { id }, data }),
    delete: (id: string) => prisma.user.delete({ where: { id } }),
    softDelete: (id: string) => prisma.user.update({ where: { id }, data: { isActive: false, deletedAt: new Date() } }),
  },

  // Categories
  categories: {
    findMany: () => prisma.category.findMany({ include: { children: true } }),
    findById: (id: string) => prisma.category.findUnique({ where: { id }, include: { parent: true, children: true } }),
    create: (data: any) => prisma.category.create({ data }),
    update: (id: string, data: any) => prisma.category.update({ where: { id }, data }),
    delete: (id: string) => prisma.category.delete({ where: { id } }),
  },

  // Products
  products: {
    findMany: () => prisma.product.findMany({ include: { brand: true, category: true } }),
    findById: (id: string) => prisma.product.findUnique({ where: { id }, include: { brand: true, category: true, variants: true } }),
    create: (data: any) => prisma.product.create({ data }),
    update: (id: string, data: any) => prisma.product.update({ where: { id }, data }),
    delete: (id: string) => prisma.product.delete({ where: { id } }),
  },

  // Orders
  orders: {
    findMany: (customerId?: string) => prisma.order.findMany({ where: customerId ? { customerId } : undefined, include: { items: true, customer: true } }),
    findById: (id: string) => prisma.order.findUnique({ where: { id }, include: { items: true, statusHistory: true, payments: true, customer: true } }),
    create: (data: any) => prisma.order.create({ data }),
    updateStatus: (id: string, status: string) => prisma.order.update({ where: { id }, data: { status } }),
  },

  // Carts
  carts: {
    findByCustomerId: (customerId: string) => prisma.cart.findFirst({ where: { customerId, status: 'ACTIVE' }, include: { items: { include: { product: true } } } }),
    create: (data: any) => prisma.cart.create({ data }),
    addItem: (cartId: string, data: any) => prisma.cartItem.create({ data: { ...data, cartId } }),
    removeItem: (itemId: string) => prisma.cartItem.delete({ where: { id: itemId } }),
    clearCart: (cartId: string) => prisma.cartItem.deleteMany({ where: { cartId } }),
  },

  // Customers
  customers: {
    findMany: () => prisma.customer.findMany({ include: { user: true } }),
    findById: (id: string) => prisma.customer.findUnique({ where: { id }, include: { user: true, addresses: true } }),
    create: (data: any) => prisma.customer.create({ data }),
    update: (id: string, data: any) => prisma.customer.update({ where: { id }, data }),
  },

  // Inventory
  inventory: {
    findByProductId: (productId: string) => prisma.inventory.findMany({ where: { productId }, include: { warehouse: true } }),
    adjustQuantity: (id: string, newQuantity: number) => prisma.inventory.update({ where: { id }, data: { quantity: newQuantity } }),
  },

  // CMS/Blogs
  blogs: {
    findMany: () => prisma.blog.findMany({ include: { category: true, author: true } }),
    findById: (id: string) => prisma.blog.findUnique({ where: { id }, include: { category: true, author: true } }),
    create: (data: any) => prisma.blog.create({ data }),
    update: (id: string, data: any) => prisma.blog.update({ where: { id }, data }),
  },
};

export default queries;

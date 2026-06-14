import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { onRequest } from 'firebase-functions/v2/https'; // Native Gen 2 Wrapper

import { ENV } from './config/env';

import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import categoryRoutes from './routes/category';
import brandRoutes from './routes/brand';
import productRoutes from './routes/product';
import homepageRoutes from './routes/homepage';
import menuRoutes from './routes/menu';
import settingsRoutes from './routes/settings';
import orderRoutes from './routes/order';
import customerRoutes from './routes/customer';
import whatsappRoutes from './routes/whatsapp';
import sitemapRoutes from './routes/sitemap';
import profileRoutes from './routes/profile';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint for Cloud Run - responds immediately
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: '3D Galaxy API Engine is running' });
});

// Serve Static Uploads safely
const uploadsPath = path.resolve(__dirname, '../../uploads');
app.use('/uploads', express.static(uploadsPath));

// API Routing Configurations
app.use('/', sitemapRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/products', productRoutes);
app.use('/api/homepage', homepageRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/profile', profileRoutes);

// Raw OpenAPI/Swagger Specification Object
const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Brahma 3D Galaxy fabricators B2B Storefront API Engine',
    version: '1.0.0',
    description: 'Statutory REST APIs for managing custom fabricator storefront catalog indices, unlimited nested hierarchy, dynamic menus and themes from PostgreSQL through Prisma.',
  },
  servers: [
    {
      url: '/api',
      description: 'Primary Base API Context',
    },
  ],
  paths: {
    '/auth/login': {
      post: {
        summary: 'Authenticate User Session',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Logged in successfully, token generated' },
          401: { description: 'Incorrect credentials error' },
        },
      },
    },
    '/products': {
      get: {
        summary: 'Paginate and filter catalog products',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'categoryId', in: 'query', schema: { type: 'string' } },
          { name: 'brandId', in: 'query', schema: { type: 'string' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 12 } },
        ],
        responses: {
          200: { description: 'Products array returned success' },
        },
      },
    },
    '/categories/tree': {
      get: {
        summary: 'Compile unlimited multi-layer parent child category nodes tree',
        responses: {
          200: { description: 'Nested array representation of catalog hierarchy tree' },
        },
      },
    },
    '/menus/tree': {
      get: {
        summary: 'Generate dynamic nested navigation megamenu',
        responses: {
          200: { description: 'Dynamic megamenu list mapped directly from database' },
        },
      },
    },
    '/settings': {
      get: {
        summary: 'Fetch visual theme options',
        responses: {
          200: { description: 'Active favicon, logos, colors, typography layouts' },
        },
      },
    },
  },
};

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Base health/routing check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ alive: true, time: new Date().toISOString() });
});

// Primary Central Error Handling Matrix
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('SERVER PIPELINE ERROR OCCURRED:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Severe server-side breakdown. Action halted.',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// =================================================================
//  CRITICAL FIREBASE DEPLOYMENT LAYER (Gen 2 Cloud Run Configuration)
// =================================================================

// 1. Export the function with memory, timeout, and CORS adjustments natively
// export const api = onRequest({ 
//   cors: true,
//   memory: "512MiB",       // Prisma requires slightly more overhead to warm up
//   timeoutSeconds: 60,     // Grants the container plenty of time to pass health checks
// }, app);

// 2. Fallback Standalone server layer (For local mock development)
// if (!process.env.FUNCTIONS_EMULATOR && !process.env.K_SERVICE) {
//   const PORT = process.env.PORT || 8080;
//   app.listen(PORT, () => {
//     console.log(`===================================================`);
//     console.log(`🚀 [LOCAL MOCK] Server listening on http://localhost:${PORT}`);
//     console.log(`===================================================`);
//   });
// }

export default app;
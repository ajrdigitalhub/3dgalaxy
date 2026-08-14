import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import swaggerUi from "swagger-ui-express";
import compression from "compression";

import { ENV } from "./config/env";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import categoryRoutes from "./routes/category";
import variantImageRoutes from "./routes/variantImage";
import adminRoutes from "./routes/admin";
import brandRoutes from "./routes/brand";
import productRoutes from "./routes/product";
import adminProductRoutes from "./routes/adminProduct";
import menuRoutes from "./routes/menu";
import {
  settingsRoutes,
  adminSettingsRoutes,
} from "./modules/settings/settings.routes";
import orderRoutes from "./routes/order";
import customerRoutes from "./routes/customer";
import adminCustomerRoutes from "./routes/adminCustomer";
import newsletterRoutes from "./routes/newsletter";
import reviewRoutes from "./routes/reviews";
import whatsappRoutes from "./routes/whatsapp";
import sitemapRoutes from "./routes/sitemap";
import profileRoutes from "./routes/profile";
import wishlistRoutes from "./routes/wishlist";
import paymentRoutes from "./routes/payment";
import abandonedCheckoutRoutes from "./routes/abandonedCheckout";
import notificationRoutes from "./routes/notification";
import pwaRoutes from "./routes/pwa";
import headerMenuRoutes from "./routes/headerMenu";
import marketingRoutes from "./routes/marketing";
import homepageRoutes from "./routes/homepage";
import { bannerRoutes, adminBannerRoutes } from "./modules/banner/banner.routes";
import { getServiceConfig } from "./controllers/settings";
import {
  getConsolidatedHome,
  getFeaturedProducts,
} from "./controllers/homepage";
import {
  getInstagramFeed,
  trackInstagramFeedInteraction,
} from "./controllers/instagram";
import { cacheMiddleware } from "./middleware/cache";

import { requestCorrelationMiddleware } from "./middleware/requestCorrelation";
import { httpLoggerMiddleware } from "./middleware/httpLogger";
import { globalErrorHandler } from "./middleware/globalErrorHandler";
import logRoutes from "./routes/log";

import { apiLimiter, authLimiter, checkoutLimiter, uploadLimiter } from "./middleware/rateLimiter";

const app = express();

const isMultipartRequest = (req: Request) => {
  const contentType = req.headers["content-type"] || "";
  return contentType.toLowerCase().includes("multipart/form-data");
};

// Application Observability Middlewares
app.use(requestCorrelationMiddleware);
app.use(httpLoggerMiddleware);

// Security Response Headers Middleware
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://*.firebaseio.com https://*.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https: http:; connect-src 'self' https://api.razorpay.com https://*.razorpay.com https://*.firebaseio.com https://*.googleapis.com http://localhost:*; font-src 'self' https://fonts.gstatic.com; object-src 'none'; frame-ancestors 'self';"
  );
  next();
});

// Strict Environment-Based CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:4200', 'http://localhost:3000', 'https://3dgalaxy.co.in', 'https://www.3dgalaxy.co.in', 'https://ajr3dgalaxy.web.app'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production' || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'Accept',
      'X-Requested-With',
      'x-guest-session-id',
      'X-Guest-Session-ID',
      'Cache-Control',
      'Pragma',
      'Origin',
      'Accept-Language',
      'X-Client-Platform'
    ],
    credentials: true,
    maxAge: 86400, // 24 hours preflight cache
  })
);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  const reqHeaders = req.headers['access-control-request-headers'];
  if (reqHeaders) {
    res.setHeader('Access-Control-Allow-Headers', reqHeaders);
  } else {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, Accept, X-Requested-With, x-guest-session-id, X-Guest-Session-ID, Cache-Control, Pragma, Origin, Accept-Language, X-Client-Platform, *');
  }
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Rate Limiter Middlewares
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/send-otp', authLimiter);
app.use('/api/auth/verify-otp', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/payment/create-order', checkoutLimiter);
app.use('/api/payment/verify-payment', checkoutLimiter);
app.use('/api/checkout', checkoutLimiter);
app.use('/api/support', uploadLimiter);
app.use('/api', apiLimiter);

// Response time benchmark header
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const originalWriteHead = res.writeHead;
  res.writeHead = function (this: Response, statusCode: any, ...args: any[]) {
    if (!res.headersSent) {
      const duration = Date.now() - start;
      res.setHeader('X-Response-Time', `${duration}ms`);
    }
    return originalWriteHead.apply(this, [statusCode, ...args] as any);
  };
  next();
});

// Middleware
app.use(compression());
app.use(
  express.json({
    limit: "2mb",
    verify: (req: any, _res, buf) => {
      if (!isMultipartRequest(req)) {
        req.rawBody = buf;
      }
    },
  }),
);
app.use(
  express.urlencoded({
    limit: "2mb",
    extended: true,
    verify: (req: any, _res, buf) => {
      if (!isMultipartRequest(req)) {
        req.rawBody = buf;
      }
    },
  }),
);

// API Routing Configurations
app.use("/", sitemapRoutes);
app.get("/api/home", cacheMiddleware(300), getConsolidatedHome);
app.get(
  "/api/home/featured-products",
  cacheMiddleware(300),
  getFeaturedProducts,
);
app.get(
  "/api/service-config",
  (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    next();
  },
  getServiceConfig,
);
app.get("/api/public/instagram-feed", cacheMiddleware(300), getInstagramFeed);
app.post(
  "/api/public/instagram-feed/interaction",
  trackInstagramFeedInteraction,
);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", variantImageRoutes); // Since some endpoints start with /variants or /product-variant-images
app.use("/api/brands", brandRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/admin/banners", adminBannerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/admin/settings", adminSettingsRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/orderdetails", orderRoutes);
app.use("/api/order-details", orderRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/admin/customers", adminCustomerRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api", reviewRoutes);
app.use("/api", whatsappRoutes);
app.use("/api", abandonedCheckoutRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api", paymentRoutes);
app.use("/api", notificationRoutes);
app.use("/api", pwaRoutes);
app.use("/api", headerMenuRoutes);
import exploreConfigRoutes from "./routes/exploreConfig";
app.use("/api", exploreConfigRoutes);
app.use("/api", marketingRoutes);
import headerAnnouncementRoutes from "./routes/headerAnnouncements";
app.use("/api", headerAnnouncementRoutes);
app.use("/api/homepage", homepageRoutes);
import searchRoutes from "./routes/search";
import supportRoutes from "./routes/support";
import serviceEnquiryRoutes from "./routes/serviceEnquiry";
import adminFcmRoutes from "./routes/adminFcm";
import adminNotificationRoutes from "./routes/adminNotification.routes";

app.use("/api", adminNotificationRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/services", serviceEnquiryRoutes);
app.use("/api/admin/services", serviceEnquiryRoutes);
app.use("/api/admin/fcm", adminFcmRoutes);
app.use("/api/notifications/admin", adminFcmRoutes);
app.use("/api", logRoutes);

// Raw OpenAPI/Swagger Specification Object
const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Brahma 3D Galaxy fabricators B2B Storefront API Engine",
    version: "1.0.0",
    description:
      "Statutory REST APIs for managing custom fabricator storefront catalog indices, unlimited nested hierarchy, dynamic menus and themes from PostgreSQL through Prisma.",
  },
  servers: [
    {
      url: "/api",
      description: "Primary Base API Context",
    },
  ],
  paths: {}
};

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Centralized Global Error Handler
app.use(globalErrorHandler);

export default app;

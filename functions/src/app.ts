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

const app = express();

const isMultipartRequest = (req: Request) => {
  const contentType = req.headers["content-type"] || "";
  return contentType.toLowerCase().includes("multipart/form-data");
};

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[API_LOG] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`,
    );
  });
  next();
});

// Middleware
app.use(compression());
app.use(cors());
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      if (!isMultipartRequest(req)) {
        req.rawBody = buf;
      }
    },
  }),
);
app.use(
  express.urlencoded({
    extended: true,
    verify: (req: any, _res, buf) => {
      if (!isMultipartRequest(req)) {
        req.rawBody = buf;
      }
    },
  }),
);

// Serve Static Uploads
// const uploadsPath = path.resolve(__dirname, '../../uploads');
// app.use('/uploads', express.static(uploadsPath)); f gdfg dfg dfg d fdsf  d gdf

// API Routing Configurations
app.use("/", sitemapRoutes);
app.get("/api/home", cacheMiddleware(300), getConsolidatedHome);
app.get(
  "/api/home/featured-products",
  cacheMiddleware(300),
  getFeaturedProducts,
);
app.get("/api/service-config", cacheMiddleware(300), getServiceConfig);
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
app.use("/api/products", productRoutes);
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/admin/settings", adminSettingsRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/admin/customers", adminCustomerRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api", reviewRoutes);
app.use("/api", whatsappRoutes);
app.use("/api", abandonedCheckoutRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api", paymentRoutes);
app.use("/api", notificationRoutes);
import searchRoutes from "./routes/search";
import supportRoutes from "./routes/support";

app.use("/api/search", searchRoutes);
app.use("/api/support", supportRoutes);

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
  paths: {
    "/auth/login": {
      post: {
        summary: "Authenticate User Session",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string" },
                  password: { type: "string" },
                },
                required: ["email", "password"],
              },
            },
          },
        },
        responses: {
          200: { description: "Logged in successfully, token generated" },
          401: { description: "Incorrect credentials error" },
        },
      },
    },
    "/products": {
      get: {
        summary: "Paginate and filter catalog products",
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "categoryId", in: "query", schema: { type: "string" } },
          { name: "brandId", in: "query", schema: { type: "string" } },
          { name: "sortBy", in: "query", schema: { type: "string" } },
          {
            name: "sortOrder",
            in: "query",
            schema: { type: "string", enum: ["asc", "desc"] },
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 12 },
          },
        ],
        responses: {
          200: { description: "Products array returned success" },
        },
      },
    },
    "/categories/tree": {
      get: {
        summary:
          "Compile unlimited multi-layer parent child category nodes tree",
        responses: {
          200: {
            description:
              "Nested array representation of catalog hierarchy tree",
          },
        },
      },
    },
    "/menus/tree": {
      get: {
        summary: "Generate dynamic nested navigation megamenu",
        responses: {
          200: {
            description: "Dynamic megamenu list mapped directly from database",
          },
        },
      },
    },
    "/settings": {
      get: {
        summary: "Fetch visual theme options",
        responses: {
          200: {
            description: "Active favicon, logos, colors, typography layouts",
          },
        },
      },
    },
  },
};

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Base health/routing check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ alive: true, time: new Date().toISOString() });
});

// Primary Central Error Handling Matrix
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("SERVER PIELINE ERROR OCCURRED:", err);
  res.status(err.status || 500).json({
    error: err.message || "Severe server-side breakdown. Action halted.",
    details: ENV.NODE_ENV === "development" ? err.stack : undefined,
  });
});

export default app;

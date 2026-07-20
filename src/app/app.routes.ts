import { Routes } from "@angular/router";
import { Home } from "./pages/home/home";
import { authGuard, roleGuard } from "./core/guards/auth.guard";

export const routes: Routes = [
  { path: "", component: Home },
  {
    path: "products",
    loadComponent: () =>
      import("./pages/products/products").then((m) => m.Products),
    data: { preload: true },
  },
  {
    path: "search",
    loadComponent: () =>
      import("./pages/search/search").then((m) => m.SearchComponent),
  },
  {
    path: "category/:categorySlug",
    loadComponent: () =>
      import("./pages/products/products").then((m) => m.Products),
  },
  {
    path: "brand/:brandSlug",
    loadComponent: () =>
      import("./pages/products/products").then((m) => m.Products),
  },
  {
    path: "product/:slug",
    loadComponent: () =>
      import("./pages/product-detail/product-detail").then(
        (m) => m.ProductDetail,
      ),
    data: { preload: true },
  },
  {
    path: "slicer",
    loadComponent: () =>
      import("./pages/printing-service/printing-service").then(
        (m) => m.PrintingService,
      ),
  },
  {
    path: "track-service",
    loadComponent: () =>
      import("./pages/track-service/track-service").then(
        (m) => m.TrackServiceComponent,
      ),
  },
  {
    path: "cart",
    loadComponent: () =>
      import("./pages/cart/cart").then((m) => m.CartCheckout),
    data: { preload: true },
  },
  {
    path: "checkout",
    loadComponent: () =>
      import("./pages/checkout/checkout").then((m) => m.CheckoutComponent),
    data: { preload: true },
  },
  {
    path: "recover-cart/:token",
    loadComponent: () =>
      import("./pages/recover-cart/recover-cart").then(
        (m) => m.RecoverCartComponent,
      ),
  },
  {
    path: "order-success",
    loadComponent: () =>
      import("./pages/checkout/order-success").then(
        (m) => m.OrderSuccessComponent,
      ),
  },
  {
    path: "order-tracking",
    loadComponent: () =>
      import("./pages/order-tracking/order-tracking").then(
        (m) => m.OrderTrackingComponent,
      ),
  },
  {
    path: "about",
    loadComponent: () => import("./pages/about/about").then((m) => m.AboutPage),
  },
  {
    path: "orders",
    loadComponent: () =>
      import("./pages/orders/orders").then((m) => m.OrdersTracking),
    canActivate: [authGuard],
  },
  {
    path: "orders/:orderNumber",
    loadComponent: () =>
      import("./pages/orders/components/order-details/order-details").then(
        (m) => m.CustomerOrderDetailsComponent,
      ),
    canActivate: [authGuard],
  },
  {
    path: "account",
    loadComponent: () =>
      import("./pages/account/account").then((m) => m.Account),
    canActivate: [authGuard],
  },
  {
    path: "account/:tab",
    loadComponent: () =>
      import("./pages/account/account").then((m) => m.Account),
    canActivate: [authGuard],
  },
  {
    path: "profile",
    loadComponent: () =>
      import("./pages/account/account").then((m) => m.Account),
    canActivate: [authGuard],
  },
  {
    path: "admin/products/import",
    loadComponent: () =>
      import("./pages/admin/admin").then((m) => m.AdminPanel),
    canActivate: [roleGuard],
    data: {
      roles: ["Admin", "Manager", "Super Admin", "admin", "super-admin"],
    },
  },
  {
    path: "admin",
    loadComponent: () =>
      import("./pages/admin/admin").then((m) => m.AdminPanel),
    canActivate: [roleGuard],
    data: {
      roles: ["Admin", "Manager", "Super Admin", "admin", "super-admin"],
    },
  },
  {
    path: "admin/orders/:orderNumber",
    loadComponent: () =>
      import("./pages/admin/components/order-details/order-details").then(
        (m) => m.OrderDetailsComponent,
      ),
    canActivate: [roleGuard],
    data: { roles: ["Admin", "Manager", "super-admin", "admin"] },
  },
  {
    path: "login",
    loadComponent: () => import("./pages/login/login").then((m) => m.Login),
  },
  {
    path: "register",
    loadComponent: () => import("./pages/login/login").then((m) => m.Login),
  },
  {
    path: "forgot-password",
    loadComponent: () =>
      import("./pages/forgot-password/forgot-password").then(
        (m) => m.ForgotPassword,
      ),
  },
  {
    path: "reset-password",
    loadComponent: () =>
      import("./pages/reset-password/reset-password").then(
        (m) => m.ResetPassword,
      ),
  },
  {
    path: "terms",
    loadComponent: () =>
      import("./pages/terms/terms").then((m) => m.TermsAndConditions),
  },
  {
    path: "terms-of-service",
    loadComponent: () =>
      import("./pages/terms/terms").then((m) => m.TermsAndConditions),
  },
  {
    path: "privacy-policy",
    loadComponent: () =>
      import("./pages/privacy-policy/privacy-policy").then(
        (m) => m.PrivacyPolicyComponent,
      ),
  },
  {
    path: "returns",
    loadComponent: () =>
      import("./pages/returns/returns").then((m) => m.ReturnPolicy),
  },
  {
    path: "return-policy",
    loadComponent: () =>
      import("./pages/returns/returns").then((m) => m.ReturnPolicy),
  },
  {
    path: "refund-policy",
    loadComponent: () =>
      import("./pages/returns/returns").then((m) => m.ReturnPolicy),
  },
  {
    path: "shipping-policy",
    loadComponent: () =>
      import("./pages/shipping/shipping").then(
        (m) => m.ShippingPolicyComponent,
      ),
  },
  { path: "**", redirectTo: "" },
];

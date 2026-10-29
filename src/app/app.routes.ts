import { Routes } from "@angular/router";
import { Home } from "./pages/home/home";
import { authGuard, roleGuard } from "./core/guards/auth.guard";
import { checkoutGuard } from "./core/guards/checkout.guard";

export const routes: Routes = [
  { path: "", component: Home },
  {
    path: "products",
    loadComponent: () =>
      import("./pages/products/products").then((m) => m.Products),
    data: { preload: true },
  },
  {
    path: "explore",
    loadComponent: () =>
      import("./pages/explore/explore.component").then((m) => m.ExplorePageComponent),
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
    path: "products/:slug",
    redirectTo: "product/:slug",
    pathMatch: "full",
  },
  {
    path: "slicer",
    loadComponent: () =>
      import("./pages/printing-service/printing-service").then(
        (m) => m.PrintingService,
      ),
  },
  {
    path: "services",
    loadComponent: () =>
      import("./pages/printing-service/printing-service").then(
        (m) => m.PrintingService,
      ),
  },
  {
    path: "printing-service",
    loadComponent: () =>
      import("./pages/printing-service/printing-service").then(
        (m) => m.PrintingService,
      ),
  },
  {
    path: "3d-printing-service",
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
    path: "services-tracking",
    loadComponent: () =>
      import("./pages/track-service/track-service").then(
        (m) => m.TrackServiceComponent,
      ),
  },
  {
    path: "services/track",
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
    canActivate: [checkoutGuard],
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
    path: "order-tracking/:orderNumber",
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
  },
  {
    path: "account/orders/:orderNumber",
    loadComponent: () =>
      import("./pages/orders/components/order-details/order-details").then(
        (m) => m.CustomerOrderDetailsComponent,
      ),
  },
  {
    path: "order/:orderNumber",
    redirectTo: "orders/:orderNumber",
    pathMatch: "full",
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
    path: "admin/backups",
    loadComponent: () =>
      import("./pages/admin/admin").then((m) => m.AdminPanel),
    canActivate: [roleGuard],
    data: {
      roles: ["Admin", "Manager", "Super Admin", "admin", "super-admin"],
      defaultTab: "backups",
    },
  },
  {
    path: "admin/settings/backups",
    loadComponent: () =>
      import("./pages/admin/admin").then((m) => m.AdminPanel),
    canActivate: [roleGuard],
    data: {
      roles: ["Admin", "Manager", "Super Admin", "admin", "super-admin"],
      defaultTab: "backups",
    },
  },
  {
    path: "admin/orders",
    loadComponent: () =>
      import("./pages/admin/admin").then((m) => m.AdminPanel),
    canActivate: [roleGuard],
    data: {
      roles: ["Admin", "Manager", "Super Admin", "admin", "super-admin"],
      defaultTab: "orders",
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
    path: "admin/order/:orderNumber",
    redirectTo: "admin/orders/:orderNumber",
    pathMatch: "full",
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
  // --- Policy Pages ---
  {
    path: "policies/privacy-policy",
    title: "Privacy Policy - 3D Galaxy",
    loadComponent: () =>
      import("./pages/privacy-policy/privacy-policy").then(
        (m) => m.PrivacyPolicyComponent,
      ),
  },
  {
    path: "policies/refund-policy",
    title: "Refund Policy - 3D Galaxy",
    loadComponent: () =>
      import("./pages/returns/returns").then((m) => m.ReturnPolicy),
  },
  {
    path: "pages/return-policy",
    title: "Return Policy - 3D Galaxy",
    loadComponent: () =>
      import("./pages/returns/returns").then((m) => m.ReturnPolicy),
  },
  {
    path: "policies/terms-of-service",
    title: "Terms of Service - 3D Galaxy",
    loadComponent: () =>
      import("./pages/terms/terms").then((m) => m.TermsAndConditions),
  },
  {
    path: "policies/shipping-policy",
    title: "Shipping Policy - 3D Galaxy",
    loadComponent: () =>
      import("./pages/shipping/shipping").then(
        (m) => m.ShippingPolicyComponent,
      ),
  },

  // Policy Legacy Redirects & Aliases
  {
    path: "policies/return-policy",
    redirectTo: "pages/return-policy",
    pathMatch: "full",
  },
  {
    path: "pages/refund-policy",
    redirectTo: "policies/refund-policy",
    pathMatch: "full",
  },
  {
    path: "pages/privacy-policy",
    redirectTo: "policies/privacy-policy",
    pathMatch: "full",
  },
  {
    path: "pages/terms-of-service",
    redirectTo: "policies/terms-of-service",
    pathMatch: "full",
  },
  {
    path: "pages/shipping-policy",
    redirectTo: "policies/shipping-policy",
    pathMatch: "full",
  },
  {
    path: "privacy-policy",
    redirectTo: "policies/privacy-policy",
    pathMatch: "full",
  },
  {
    path: "terms",
    redirectTo: "policies/terms-of-service",
    pathMatch: "full",
  },
  {
    path: "terms-of-service",
    redirectTo: "policies/terms-of-service",
    pathMatch: "full",
  },
  {
    path: "policies/terms",
    redirectTo: "policies/terms-of-service",
    pathMatch: "full",
  },
  {
    path: "returns",
    redirectTo: "pages/return-policy",
    pathMatch: "full",
  },
  {
    path: "return-policy",
    redirectTo: "pages/return-policy",
    pathMatch: "full",
  },
  {
    path: "refund-policy",
    redirectTo: "policies/refund-policy",
    pathMatch: "full",
  },
  {
    path: "shipping-policy",
    redirectTo: "policies/shipping-policy",
    pathMatch: "full",
  },
  { path: "**", redirectTo: "" },
];

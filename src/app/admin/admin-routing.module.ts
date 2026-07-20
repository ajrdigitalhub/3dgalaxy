import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminComponent } from './admin.component';

const routes: Routes = [
  {
    path: '',
    component: AdminComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      {
        path: 'products',
        loadChildren: () => import('./products/products.module').then(m => m.ProductsModule)
      },
      {
        path: 'categories',
        loadChildren: () => import('./categories/categories.module').then(m => m.CategoriesModule)
      },
      {
        path: 'brands',
        loadChildren: () => import('./brands/brands.module').then(m => m.BrandsModule)
      },
      {
        path: 'orders',
        loadChildren: () => import('./orders/orders.module').then(m => m.OrdersModule)
      },
      {
        path: 'customers',
        redirectTo: 'customers/list',
        pathMatch: 'full'
      },
      {
        path: 'customers/list',
        loadComponent: () => import('./customers/customer-list/customer-list.component').then(m => m.CustomerListComponent)
      },
      {
        path: 'customers/detail/:id',
        loadComponent: () => import('./customers/customer-detail/customer-detail.component').then(m => m.CustomerDetailComponent)
      },
      {
        path: 'customers/analytics',
        loadComponent: () => import('./customers/customer-analytics/customer-analytics.component').then(m => m.CustomerAnalyticsComponent)
      },
      {
        path: 'content',
        loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      {
        path: 'content/footer-settings',
        loadComponent: () => import('./footer-settings/footer-settings.component').then(m => m.FooterSettingsComponent)
      },
      {
        path: 'settings/push-settings',
        loadComponent: () => import('./settings/push-settings/push-settings.component').then(m => m.PushSettingsComponent)
      },
      {
        path: 'marketing/push-notifications',
        loadComponent: () => import('./marketing/push-notifications/push-notifications.component').then(m => m.PushNotificationsComponent)
      },
      {
        path: 'marketing/newsletter',
        loadComponent: () => import('./marketing/newsletter/newsletter-management.component').then(m => m.NewsletterManagementComponent)
      },
      {
        path: 'marketing/homepage-builder',
        loadComponent: () => import('./marketing/homepage-builder/homepage-builder.component').then(m => m.HomepageBuilderComponent)
      },
      {
        path: 'marketing',
        loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      {
        path: 'analytics',
        loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      {
        path: 'settings',
        loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule {}

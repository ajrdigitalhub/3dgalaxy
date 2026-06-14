import {Routes} from '@angular/router';
import {Home} from './pages/home/home';
import {Products} from './pages/products/products';
import {ProductDetail} from './pages/product-detail/product-detail';
import {PrintingService} from './pages/printing-service/printing-service';
import {CartCheckout} from './pages/cart/cart';
import {OrdersTracking} from './pages/orders/orders';
import {AdminPanel} from './pages/admin/admin';
import {Login} from './pages/login/login';
import {Account} from './pages/account/account';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'products', component: Products },
  { path: 'category/:categorySlug', component: Products },
  { path: 'brand/:brandSlug', component: Products },
  { path: 'product/:slug', component: ProductDetail },
  { path: 'slicer', component: PrintingService },
  { path: 'cart', component: CartCheckout },
  { path: 'orders', component: OrdersTracking },
  { path: 'account', component: Account },
  { path: 'account/:tab', component: Account },
  { path: 'admin', component: AdminPanel },
  { path: 'login', component: Login },
  { path: 'terms', loadComponent: () => import('./pages/terms/terms').then(m => m.TermsAndConditions) },
  { path: 'returns', loadComponent: () => import('./pages/returns/returns').then(m => m.ReturnPolicy) },
  { path: '**', redirectTo: '' }
];

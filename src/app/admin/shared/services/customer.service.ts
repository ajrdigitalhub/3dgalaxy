import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  customersList = signal([
    { id: 'c1', name: 'Rajesh Kumar', email: 'rajesh.kumar@gmail.com', phone: '+91 98765 43210', spent: 58499, orders: 3, points: 580, tier: 'B2B Dealer', date: '2026-05-18' },
    { id: 'c2', name: 'Priya Sharma', email: 'priya.sharma@yahoo.com', phone: '+91 98123 45678', spent: 21499, orders: 1, points: 210, tier: 'Retail Creator', date: '2026-06-02' },
    { id: 'c3', name: 'Amit Patel', email: 'amit.patel@design-craft.in', phone: '+91 90011 22334', spent: 145200, orders: 5, points: 1450, tier: 'B2B Dealer', date: '2026-04-20' },
    { id: 'c4', name: 'Vikram Singh', email: 'v.singh@panchkulamakers.org', phone: '+91 80543 21098', spent: 38499, orders: 1, points: 385, tracking_number_placeholder: '123' },
    { id: 'c5', name: 'Sneha Reddy', email: 'sneha.r@gmail.com', phone: '+91 78901 23456', spent: 1250, orders: 1, points: 12, tier: 'Standard Guest', date: '2026-06-04' }
  ]);

  customerGroupsList = signal([
    { id: 'g1', name: 'B2B Dealers', discount: 'Dealer wholesale rates', members: 12 },
    { id: 'g2', name: 'Standard Retail Guests', discount: 'Standard catalog rates', members: 45 },
    { id: 'g3', name: 'VVIP Creators', discount: 'Additional 10% off checkout', members: 8 }
  ]);

  reviewsList = signal([
    { id: 'r1', productName: 'Bambu Lab A1 Mini', userName: 'Rajesh K.', rating: 5, comment: 'Phenomenal speed! Best printer for desktop prototypes.', date: '2026-05-20', status: 'Approved', response: '' },
    { id: 'r2', productName: 'Carbon Fiber PLA Core Filament', userName: 'Vikram S.', rating: 4, comment: 'Extremely rigid and strong print quality. Make sure to use hardened steel nozzle.', date: '2026-05-28', status: 'Pending', response: '' },
    { id: 'r3', productName: 'Creality Ender 3 V3 KE', userName: 'Amit P.', rating: 2, comment: 'Extruder clogged on day 3. Fine after clearance but frustrating.', date: '2026-06-01', status: 'Pending', response: '' }
  ]);

  awardPoints(id: string, points: number) {
    this.customersList.update(all => all.map(c => c.id === id ? { ...c, points: Math.max(0, c.points + points) } : c));
  }

  approveReview(id: string) {
    this.reviewsList.update(all => all.map(r => r.id === id ? { ...r, status: 'Approved' } : r));
  }

  rejectReview(id: string) {
    this.reviewsList.update(all => all.map(r => r.id === id ? { ...r, status: 'Spam/Rejected' } : r));
  }

  saveReviewResponse(id: string, text: string) {
    this.reviewsList.update(all => all.map(r => r.id === id ? { ...r, response: text } : r));
  }
}

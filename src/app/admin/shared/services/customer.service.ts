import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private api = inject(ApiService);

  // 1. Customer CRUD & Management APIs
  getCustomers(params: {
    page: number;
    limit: number;
    search?: string;
    customerType?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }): Observable<any> {
    return this.api.get<any>('/admin/customers', params, true);
  }

  getCustomerById(id: string): Observable<any> {
    return this.api.get<any>(`/admin/customers/${id}`, null, true);
  }

  createCustomer(payload: any): Observable<any> {
    return this.api.post<any>('/admin/customers', payload);
  }

  updateCustomer(id: string, payload: any): Observable<any> {
    return this.api.put<any>(`/admin/customers/${id}`, payload);
  }

  deleteCustomer(id: string): Observable<any> {
    return this.api.delete<any>(`/admin/customers/${id}`);
  }

  blockCustomer(id: string): Observable<any> {
    return this.api.patch<any>(`/admin/customers/${id}/block`, {});
  }

  unblockCustomer(id: string): Observable<any> {
    return this.api.patch<any>(`/admin/customers/${id}/unblock`, {});
  }

  // 2. Customer Sub-resources APIs
  getCustomerOrders(id: string): Observable<any> {
    return this.api.get<any>(`/admin/customers/${id}/orders`, null, true);
  }

  getCustomerAddresses(id: string): Observable<any> {
    return this.api.get<any>(`/admin/customers/${id}/addresses`, null, true);
  }

  getCustomerActivity(id: string): Observable<any> {
    return this.api.get<any>(`/admin/customers/${id}/activity`, null, true);
  }

  getCustomerReviews(id: string): Observable<any> {
    return this.api.get<any>(`/admin/customers/${id}/reviews`, null, true);
  }

  getCustomerWishlist(id: string): Observable<any> {
    return this.api.get<any>(`/admin/customers/${id}/wishlist`, null, true);
  }

  // 3. Customer Notes APIs
  getCustomerNotes(id: string): Observable<any> {
    return this.api.get<any>(`/admin/customers/${id}/notes`, null, true);
  }

  addCustomerNote(id: string, note: string, isPinned = false): Observable<any> {
    return this.api.post<any>(`/admin/customers/${id}/notes`, { note, isPinned });
  }

  pinCustomerNote(id: string, noteId: string, isPinned: boolean): Observable<any> {
    return this.api.patch<any>(`/admin/customers/${id}/notes/${noteId}/pin`, { isPinned });
  }

  deleteCustomerNote(id: string, noteId: string): Observable<any> {
    return this.api.delete<any>(`/admin/customers/${id}/notes/${noteId}`);
  }

  // 4. Customer Analytics APIs
  getCustomerAnalytics(): Observable<any> {
    return this.api.get<any>('/admin/customers/analytics', null, true);
  }

  // 5. Public Newsletter APIs
  subscribeNewsletter(payload: {
    email: string;
    name?: string;
    phone?: string;
    interests?: string[];
    consent?: boolean;
  }): Observable<any> {
    return this.api.post<any>('/newsletter/subscribe', payload);
  }

  unsubscribeNewsletter(email: string): Observable<any> {
    return this.api.post<any>('/newsletter/unsubscribe', { email });
  }

  // 6. Administrative Newsletter APIs
  getNewsletterSubscribers(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    source?: string;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }): Observable<any> {
    return this.api.get<any>('/newsletter/admin/subscribers', params, true);
  }

  updateNewsletterSubscriber(id: string, payload: any): Observable<any> {
    return this.api.put<any>(`/newsletter/admin/subscribers/${id}`, payload);
  }

  deleteNewsletterSubscriber(id: string): Observable<any> {
    return this.api.delete<any>(`/newsletter/admin/subscribers/${id}`);
  }

  getNewsletterAnalytics(): Observable<any> {
    return this.api.get<any>('/newsletter/admin/analytics', null, true);
  }

  sendNewsletterCampaign(payload: {
    subject: string;
    body: string;
    audienceSegment: string;
  }): Observable<any> {
    return this.api.post<any>('/newsletter/admin/send', payload);
  }
}

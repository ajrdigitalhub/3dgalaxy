import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../core/analytics';

@Component({
  selector: 'app-whatsapp-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button (click)="openWhatsApp()" class="fixed bottom-4 right-4 bg-green-500 text-white rounded-full p-4 shadow-lg flex items-center space-x-2">
      <span>💬 Chat with 3D Expert</span>
    </button>
  `
})
export class WhatsAppButtonComponent {
  private analytics = inject(AnalyticsService);

  openWhatsApp(): void {
    this.analytics.trackWhatsAppCampaign('DIRECT_SITE_CHAT', 'click');
    this.analytics.trackLead({
      source: 'WhatsApp Floating Chat Button',
      lead_type: 'whatsapp_consultation'
    });
    if (typeof window !== 'undefined') {
      window.open('https://wa.me/919876543210?text=Hi%203DGalaxy%20Team', '_blank');
    }
  }
}

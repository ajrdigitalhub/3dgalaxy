import { Component, Input, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatastoreService } from '../../../../services/datastore';

@Component({
  selector: 'app-admin-page-header',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss'
})
export class PageHeaderComponent {
  @Input() title: string = '';
  @Input() description: string = '';

  public ds = inject(DatastoreService);

  logoUrlComputed = computed(() => {
    const theme = this.ds.theme();
    const settings = this.ds.settings();
    const fallback = '/3d-logo.png';
    if (!settings) return fallback;
    if (theme === 'dark') {
      return settings.appIconUrl || settings.darkModeLogoUrl || settings.logoUrl || fallback;
    } else {
      return settings.logoUrl || settings.headerLogoUrl || fallback;
    }
  });

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img.getAttribute('data-error-handled')) return;
    img.setAttribute('data-error-handled', 'true');
    img.src = '/3d-logo.png';
  }
}

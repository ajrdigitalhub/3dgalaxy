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
    if (!settings) return '/3d-logo.png';
    if (theme === 'dark') {
      return settings.appIconUrl || settings.darkModeLogoUrl || settings.logoUrl || '/3d-logo.png';
    } else {
      return settings.logoUrl || settings.headerLogoUrl || '/3d-logo.png';
    }
  });

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img.getAttribute('data-error-handled')) return;
    img.setAttribute('data-error-handled', 'true');
    const isDark = document.documentElement.classList.contains('dark');
    const placeholder = this.ds.settings()?.defaultPlaceholderUrl || 'https://picsum.photos/seed/placeholder/400/400';
    
    if (isDark) {
      img.src = this.ds.settings()?.darkModeLogoUrl || this.ds.settings()?.logoUrl || placeholder;
    } else {
      img.src = this.ds.settings()?.logoUrl || this.ds.settings()?.headerLogoUrl || placeholder;
    }
  }
}

import { Component, Input, ChangeDetectionStrategy, inject } from '@angular/core';
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

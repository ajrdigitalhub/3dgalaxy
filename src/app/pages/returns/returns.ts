import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { DatastoreService } from '../../services/datastore';

@Component({
  selector: 'app-returns',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, RouterModule],
  templateUrl: './returns.html'
})
export class ReturnPolicy implements OnInit {
  private router = inject(Router);
  private titleService = inject(Title);
  private meta = inject(Meta);
  public ds = inject(DatastoreService);

  get isRefundOnly(): boolean {
    return this.router.url.includes('refund-policy');
  }

  get isReturnOnly(): boolean {
    return this.router.url.includes('return-policy') || this.router.url.includes('/returns');
  }

  ngOnInit() {
    if (this.isRefundOnly) {
      this.titleService.setTitle('Refund Policy - 3D Galaxy');
      this.meta.updateTag({ name: 'description', content: 'Learn about 3D Galaxy refund and replacement policy.' });
    } else {
      this.titleService.setTitle('Return Policy - 3D Galaxy');
      this.meta.updateTag({ name: 'description', content: 'Learn about 3D Galaxy return and replacement policy.' });
    }
  }
}

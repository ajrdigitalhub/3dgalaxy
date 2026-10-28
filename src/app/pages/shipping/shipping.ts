import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-shipping-policy',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, RouterModule],
  templateUrl: './shipping.html'
})
export class ShippingPolicyComponent implements OnInit {
  private titleService = inject(Title);
  private meta = inject(Meta);

  ngOnInit() {
    this.titleService.setTitle('Shipping Policy - 3D Galaxy');
    this.meta.updateTag({ name: 'description', content: 'Learn about 3D Galaxy shipping timelines, free delivery threshold, and courier partners.' });
  }
}

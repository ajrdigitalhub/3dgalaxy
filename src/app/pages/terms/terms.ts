import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-terms',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, RouterModule],
  templateUrl: './terms.html'
})
export class TermsAndConditions implements OnInit {
  private titleService = inject(Title);
  private meta = inject(Meta);

  ngOnInit() {
    this.titleService.setTitle('Terms of Service - 3D Galaxy');
    this.meta.updateTag({ name: 'description', content: 'Read the Terms of Service governing your use of 3D Galaxy products and services.' });
  }
}

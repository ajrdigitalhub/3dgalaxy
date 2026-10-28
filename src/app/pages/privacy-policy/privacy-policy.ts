import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, RouterModule],
  templateUrl: './privacy-policy.html'
})
export class PrivacyPolicyComponent implements OnInit {
  private titleService = inject(Title);
  private meta = inject(Meta);

  ngOnInit() {
    this.titleService.setTitle('Privacy Policy - 3D Galaxy');
    this.meta.updateTag({ name: 'description', content: 'Read the Privacy Policy of 3D Galaxy to understand how we collect, use, and protect your information.' });
  }
}

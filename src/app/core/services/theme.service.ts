import { Injectable, computed, inject } from '@angular/core';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private settingsService = inject(SettingsService);

  primaryColor = computed<string>(() => this.settingsService.theme()?.primaryColor || '#00f2fe');
  secondaryColor = computed<string>(() => this.settingsService.theme()?.secondaryColor || '#4facfe');
  gradientAngle = computed<string>(() => {
    const rawAngle = this.settingsService.theme()?.gradientAngle;
    return this.formatAngle(rawAngle);
  });
  radius = computed<string>(() => {
    const theme = this.settingsService.theme() || {};
    const rawRadius = theme.radius !== undefined ? theme.radius : theme.borderRadius;
    return this.formatRadius(rawRadius);
  });

  private formatAngle(angle: any): string {
    if (angle === undefined || angle === null) return '135deg';
    const s = String(angle).trim();
    if (/^\d+$/.test(s) || typeof angle === 'number') {
      return `${s}deg`;
    }
    if (!s.endsWith('deg')) {
      return `${s}deg`;
    }
    return s;
  }

  private formatRadius(radius: any): string {
    if (radius === undefined || radius === null) return '0.75rem';
    const s = String(radius).trim();
    if (/^\d+$/.test(s) || typeof radius === 'number') {
      return `${s}px`;
    }
    return s;
  }

  updateLivePreview(config: any) {
    if (config) {
      this.settingsService.applyTheme(config);
    }
  }
}


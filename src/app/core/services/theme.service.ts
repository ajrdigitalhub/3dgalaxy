import { Injectable, effect, inject, signal } from '@angular/core';
import { DatastoreService } from '../../services/datastore';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private ds = inject(DatastoreService);

  primaryColor = signal<string>('#00f2fe');
  secondaryColor = signal<string>('#4facfe');
  gradientAngle = signal<string>('135deg');
  radius = signal<string>('0.75rem');

  constructor() {
    effect(() => {
      const config = this.ds.settings();
      if (config) {
        if (config.primaryColor) this.primaryColor.set(config.primaryColor);
        if (config.secondaryColor) this.secondaryColor.set(config.secondaryColor);
        if (config.gradientAngle) this.gradientAngle.set(config.gradientAngle);
        if (config.radius) this.radius.set(config.radius);
        
        this.applyTheme();
      }
    });
  }

  updateLivePreview(config: any) {
    if (config.primaryColor) this.primaryColor.set(config.primaryColor);
    if (config.secondaryColor) this.secondaryColor.set(config.secondaryColor);
    if (config.gradientAngle) this.gradientAngle.set(config.gradientAngle);
    if (config.radius) this.radius.set(config.radius);
    this.applyTheme();
  }

  private applyTheme() {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.style.setProperty('--primary-color', this.primaryColor());
    root.style.setProperty('--secondary-color', this.secondaryColor());
    root.style.setProperty('--gradient-angle', this.gradientAngle());
    root.style.setProperty('--radius', this.radius());
  }
}

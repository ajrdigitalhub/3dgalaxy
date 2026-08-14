import {
  Component,
  ChangeDetectionStrategy,
  Inject,
  PLATFORM_ID,
  signal,
  effect,
  HostListener
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { VariantTourService } from '../../../core/services/variant-tour.service';

@Component({
  selector: 'app-variant-tour-guide',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './variant-tour-guide.component.html',
  styleUrl: './variant-tour-guide.component.scss'
})
export class VariantTourGuideComponent {
  targetRect = signal<{ top: number; left: number; width: number; height: number } | null>(null);

  constructor(
    public tourService: VariantTourService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    effect(() => {
      if (this.tourService.isActive()) {
        this.updateTargetRect();
      }
    });
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  updateTargetRect() {
    if (!isPlatformBrowser(this.platformId) || !this.tourService.isActive()) return;

    const step = this.tourService.currentStep();
    if (!step) return;

    let el = document.querySelector(step.targetSelector);
    if (!el || (el as HTMLElement).offsetWidth === 0) {
      if (step.id === 'variant-configuration') {
        el = document.querySelector('.admin-variant-config-wrapper') || document.querySelector('app-admin-variant-group-config');
      } else if (step.id === 'variant-type') {
        el = document.querySelector('[data-tour="variant-type"]') || document.querySelector('.field-cell');
      } else if (step.id === 'variant-options') {
        el = document.querySelector('[data-tour="variant-options"]') || document.querySelector('.group-tabs-row');
      } else if (step.id === 'variant-pricing') {
        el = document.querySelector('[data-tour="variant-pricing"]');
      } else if (step.id === 'variant-stock') {
        el = document.querySelector('[data-tour="variant-stock"]');
      } else if (step.id === 'variant-images') {
        el = document.querySelector('[data-tour="variant-images"]');
      } else if (step.id === 'variant-preview') {
        el = document.querySelector('[data-tour="variant-preview"]');
      } else if (step.id === 'variant-save') {
        el = document.querySelector('[data-tour="variant-save"]');
      }
    }

    if (el && (el as HTMLElement).offsetWidth > 0 && (el as HTMLElement).offsetHeight > 0) {
      const rect = el.getBoundingClientRect();
      this.targetRect.set({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    } else {
      this.targetRect.set(null);
    }
  }

  getSpotlightStyle(): Record<string, string> {
    const rect = this.targetRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { display: 'none' };
    const pad = 8;
    return {
      position: 'fixed',
      top: `${Math.max(0, rect.top - pad)}px`,
      left: `${Math.max(0, rect.left - pad)}px`,
      width: `${rect.width + pad * 2}px`,
      height: `${rect.height + pad * 2}px`,
      borderRadius: '12px',
      zIndex: '999995',
      pointerEvents: 'none',
      boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.68)',
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
    };
  }

  getPopoverPositionStyle(): Record<string, string> {
    const rect = this.targetRect();
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    if (!rect || rect.width === 0 || rect.height === 0) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: '999999',
        width: 'min(360px, calc(100vw - 32px))'
      };
    }

    if (isMobile) {
      return {
        position: 'fixed',
        bottom: '20px',
        left: '16px',
        right: '16px',
        width: 'calc(100vw - 32px)',
        maxWidth: '360px',
        margin: '0 auto',
        zIndex: '999999'
      };
    }

    const popoverWidth = 360;
    const popoverHeight = 200;
    const padding = 16;

    let left = rect.left + (rect.width / 2) - (popoverWidth / 2);
    if (typeof window !== 'undefined') {
      left = Math.max(padding, Math.min(left, window.innerWidth - popoverWidth - padding));
    }

    const spaceBelow = typeof window !== 'undefined' ? window.innerHeight - (rect.top + rect.height) : 300;
    const spaceAbove = rect.top;

    let top: number;
    const step = this.tourService.currentStep();
    const preferTop = step?.position === 'top';

    if (preferTop && spaceAbove > popoverHeight + padding) {
      top = rect.top - popoverHeight - padding;
    } else if (spaceBelow >= popoverHeight + padding) {
      top = rect.top + rect.height + padding;
    } else if (spaceAbove >= popoverHeight + padding) {
      top = rect.top - popoverHeight - padding;
    } else {
      top = Math.max(padding, rect.top + rect.height + 8);
    }

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${popoverWidth}px`,
      maxWidth: 'calc(100vw - 32px)',
      zIndex: '999999'
    };
  }
}

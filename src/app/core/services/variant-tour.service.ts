import { Injectable, signal, computed } from '@angular/core';

export interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  content: string;
  badge?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  actionBeforeStep?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class VariantTourService {
  private STORAGE_KEY = '3dgalaxy_variant_tour_completed';

  isActive = signal<boolean>(false);
  currentStepIndex = signal<number>(0);
  isCompletedModalOpen = signal<boolean>(false);

  steps: TourStep[] = [
    {
      id: 'variant-configuration',
      targetSelector: '[data-tour="variant-configuration"]',
      title: 'Variant Configuration',
      badge: 'Architecture',
      content: 'Configure variant choices (Color, Size, Weight, Pack, Material) and bundle deals for this product.',
      position: 'bottom'
    },
    {
      id: 'variant-type',
      targetSelector: '[data-tour="variant-type"]',
      title: 'Variant Type',
      badge: 'Type',
      content: 'Select how customers choose variants on the store (Swatches, Quantity, Dropdown, Tiles, or Cards).',
      position: 'bottom'
    },
    {
      id: 'variant-options',
      targetSelector: '[data-tour="variant-options"]',
      title: 'Variant Options',
      badge: 'Options',
      content: 'Add available choices customers can select (e.g. Grey, White, Black, 1kg, 5 Pack).',
      position: 'top'
    },
    {
      id: 'variant-pricing',
      targetSelector: '[data-tour="variant-pricing"]',
      title: 'Variant Pricing',
      badge: 'Pricing',
      content: 'Set specific MRP, Sale Price, and Dealer Price for individual variant combinations.',
      position: 'top'
    },
    {
      id: 'variant-stock',
      targetSelector: '[data-tour="variant-stock"]',
      title: 'Variant Stock',
      badge: 'Inventory',
      content: 'Manage inventory independently per variant with automatic Out of Stock protection.',
      position: 'top'
    },
    {
      id: 'variant-images',
      targetSelector: '[data-tour="variant-images"]',
      title: 'Variant Images',
      badge: 'Images',
      content: 'Link product photos to variants so clicking photos auto-selects the corresponding variant.',
      position: 'top'
    },
    {
      id: 'variant-preview',
      targetSelector: '[data-tour="variant-preview"]',
      title: 'Customer Preview',
      badge: 'Preview',
      content: 'Test storefront customer selection experience, prices, and stock badges live before saving.',
      position: 'top'
    },
    {
      id: 'variant-save',
      targetSelector: '[data-tour="variant-save"]',
      title: 'Save Configuration',
      badge: 'Publish',
      content: 'Click Save Product to publish all option configurations, pricing, and stock updates live.',
      position: 'top'
    }
  ];

  currentStep = computed(() => {
    return this.steps[this.currentStepIndex()] || this.steps[0];
  });

  isFirstStep = computed(() => this.currentStepIndex() === 0);
  isLastStep = computed(() => this.currentStepIndex() === this.steps.length - 1);
  totalSteps = computed(() => this.steps.length);

  startTour() {
    this.isCompletedModalOpen.set(false);
    this.currentStepIndex.set(0);
    this.isActive.set(true);
    this.ensureVariantsTabVisibleAndScroll();
  }

  nextStep() {
    if (this.currentStepIndex() < this.steps.length - 1) {
      this.currentStepIndex.update(i => i + 1);
      this.ensureVariantsTabVisibleAndScroll();
    } else {
      this.completeTour();
    }
  }

  prevStep() {
    if (this.currentStepIndex() > 0) {
      this.currentStepIndex.update(i => i - 1);
      this.ensureVariantsTabVisibleAndScroll();
    }
  }

  skipTour() {
    this.isActive.set(false);
  }

  completeTour() {
    this.isActive.set(false);
    this.isCompletedModalOpen.set(true);
    localStorage.setItem(this.STORAGE_KEY, 'true');
  }

  restartTour() {
    this.isCompletedModalOpen.set(false);
    this.startTour();
  }

  closeCompletedModal() {
    this.isCompletedModalOpen.set(false);
  }

  hasCompletedBefore(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) === 'true';
  }

  private ensureVariantsTabVisibleAndScroll() {
    // If inside product editor tabs, click Variants tab if not active
    const variantsTabBtn: HTMLElement | null = document.querySelector('[data-tour-tab="variants"]') || 
      Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim().toLowerCase() === 'variants' || b.textContent?.trim().toLowerCase() === 'options') as HTMLElement;
    if (variantsTabBtn) {
      try { variantsTabBtn.click(); } catch {}
    }

    setTimeout(() => {
      const step = this.currentStep();
      if (!step) return;
      let el = document.querySelector(step.targetSelector);
      
      // Fallback selector resolution if primary target is missing
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

      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  }
}

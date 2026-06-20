import { Directive, ElementRef, Input, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appCountUp]',
  standalone: true
})
export class CountUpDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);
  private observer?: IntersectionObserver;

  @Input('appCountUp') targetValueStr: string = '0';
  @Input() durationMs: number = 2000;

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.startCounter();
            this.observer?.unobserve(this.el.nativeElement);
          }
        });
      },
      { threshold: 0.1 }
    );

    this.observer.observe(this.el.nativeElement);
  }

  private startCounter() {
    const text = this.targetValueStr;
    const numMatch = text.match(/[\d.]+/);
    if (!numMatch) {
      this.el.nativeElement.textContent = text;
      return;
    }

    const targetNum = parseFloat(numMatch[0]);
    const suffix = text.replace(numMatch[0], '');
    const isDecimal = numMatch[0].includes('.');

    const startTime = performance.now();

    const updateValue = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;
      if (elapsedTime >= this.durationMs) {
        this.el.nativeElement.textContent = text;
        return;
      }

      const progress = elapsedTime / this.durationMs;
      // EaseOutQuad
      const easeProgress = progress * (2 - progress);
      const currentNum = easeProgress * targetNum;

      const formattedNum = isDecimal ? currentNum.toFixed(1) : Math.floor(currentNum).toString();
      this.el.nativeElement.textContent = formattedNum + suffix;

      requestAnimationFrame(updateValue);
    };

    requestAnimationFrame(updateValue);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
}

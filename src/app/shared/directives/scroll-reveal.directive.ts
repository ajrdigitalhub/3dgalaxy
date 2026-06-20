import { Directive, ElementRef, Input, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appScrollReveal]',
  standalone: true
})
export class ScrollRevealDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);
  private observer?: IntersectionObserver;

  @Input('appScrollReveal') type: string = 'fade'; // fade, slide-up, scale-in, rotate-in
  @Input() delay: number = 0; // delay in ms
  @Input() duration: string = ''; // custom duration

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    const element = this.el.nativeElement;
    element.classList.add('reveal-init');
    element.classList.add(`reveal-${this.type}`);

    if (this.delay > 0) {
      element.style.transitionDelay = `${this.delay}ms`;
    }
    if (this.duration) {
      element.style.transitionDuration = this.duration;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            element.classList.add('reveal-active');
            this.observer?.unobserve(element);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    this.observer.observe(element);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
}

import { Directive, ElementRef, HostListener, Input, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appTilt]',
  standalone: true
})
export class TiltDirective {
  private el = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);

  @Input() tiltMax: number = 10;
  @Input() tiltPerspective: number = 1000;
  @Input() tiltEnabled: boolean = true;

  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    if (!isPlatformBrowser(this.platformId) || !this.tiltEnabled) return;

    const el = this.el.nativeElement;
    const rect = el.getBoundingClientRect();
    
    // Normalized cursor coordinates (-0.5 to 0.5)
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    const rotateX = -y * this.tiltMax;
    const rotateY = x * this.tiltMax;

    el.style.transform = `perspective(${this.tiltPerspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    el.style.transition = 'transform 0.1s ease-out, box-shadow 0.1s ease-out';

    const shadowX = -x * 12;
    const shadowY = -y * 12;
    el.style.boxShadow = `${shadowX}px ${shadowY}px 25px rgba(0,0,0,0.15), 0 10px 20px rgba(0,0,0,0.08)`;
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    if (!isPlatformBrowser(this.platformId)) return;
    const el = this.el.nativeElement;
    el.style.transform = `perspective(${this.tiltPerspective}px) rotateX(0deg) rotateY(0deg)`;
    el.style.transition = 'transform 0.4s ease, box-shadow 0.4s ease';
    el.style.boxShadow = '';
  }
}

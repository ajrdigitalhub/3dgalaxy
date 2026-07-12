import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="'skeleton ' + (width() || 'w-full') + ' ' + (height() || 'h-4') + ' ' + (borderRadius() || 'rounded-xl') + ' ' + (extraClasses() || '')"></div>
  `
})
export class SkeletonLoaderComponent {
  width = input<string>('w-full');
  height = input<string>('h-4');
  borderRadius = input<string>('rounded-xl');
  extraClasses = input<string>('');
}

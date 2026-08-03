import { Pipe, PipeTransform, inject } from '@angular/core';
import { DeliveryEstimateService } from '../../core/services/delivery-estimate.service';

@Pipe({
  name: 'deliveryEstimate',
  pure: true,
  standalone: true
})
export class DeliveryEstimatePipe implements PipeTransform {
  private estimateService = inject(DeliveryEstimateService);
  private cache = new Map<string, string>();

  transform(value: any, format: 'desktop' | 'mobile' = 'desktop'): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    const cacheKey = `${value}_${format}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    let encoded = 3;
    if (typeof value === 'number') {
      encoded = value;
    } else {
      encoded = this.estimateService.parseEstimateDays(String(value));
    }

    const result = this.estimateService.formatDeliveryRange(
      encoded,
      format === 'desktop',
      this.estimateService.getISTDate()
    );
    
    this.cache.set(cacheKey, result);
    return result;
  }
}

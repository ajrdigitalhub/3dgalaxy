import { Pipe, PipeTransform } from '@angular/core';
import { formatWeight } from '../utils/weight.utils';

@Pipe({
  name: 'weight',
  standalone: true
})
export class WeightPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatWeight(value);
  }
}

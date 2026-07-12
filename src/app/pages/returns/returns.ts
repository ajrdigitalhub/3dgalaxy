import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DatastoreService } from '../../services/datastore';

@Component({
  selector: 'app-returns',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  templateUrl: './returns.html'
})
export class ReturnPolicy {
  constructor(public ds: DatastoreService) {}
}

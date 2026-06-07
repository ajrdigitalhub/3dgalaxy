import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { DatastoreService } from '../../services/datastore';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './terms.html'
})
export class TermsAndConditions {
  constructor(public ds: DatastoreService) {}
}

import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin-pagination',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss'
})
export class PaginationComponent {
  Math = Math;
  totalItems = input<number>(0);
  itemsPerPage = input<number>(10);
  currentPage = input<number>(1);

  @Output() pageChange = new EventEmitter<number>();

  totalPages = computed(() => {
    return Math.ceil(this.totalItems() / this.itemsPerPage()) || 1;
  });

  get pages(): number[] {
    const list: number[] = [];
    for (let i = 1; i <= this.totalPages(); i++) {
      list.push(i);
    }
    return list;
  }

  setPage(page: number) {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.pageChange.emit(page);
    }
  }
}

import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { ApiService } from '../../../services/api.service';

export interface HomepageSection {
  id: string;
  name: string;
  type: string;
  sortOrder: number;
  isActive: boolean;
}

@Component({
  selector: 'app-homepage-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './homepage-builder.component.html',
  styleUrls: ['./homepage-builder.component.scss']
})
export class HomepageBuilderComponent implements OnInit {
  private api = inject(ApiService);
  private http = inject(HttpClient);

  sections = signal<HomepageSection[]>([]);
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Editing Section Modal/Form State
  editingSection = signal<HomepageSection | null>(null);
  editName = '';
  editType = 'HERO';
  editIsActive = true;
  isNewSection = false;

  // Predefined section types
  sectionTypes = [
    { value: 'HERO', label: 'Hero Slideshow Slider' },
    { value: 'CATEGORIES', label: 'Categories Row Grid' },
    { value: 'FLASH_DEALS', label: 'Flash Deals with Countdown' },
    { value: 'BEST_SELLERS', label: 'Best Sellers Row Grid' },
    { value: 'TRENDING', label: 'Trending Products Showcase' },
    { value: 'NEW_ARRIVALS', label: 'New Arrivals Product Cards' },
    { value: 'MATERIALS', label: 'Consumable Materials Grid' },
    { value: 'APPLICATIONS', label: 'Application Sectors Grid' },
    { value: 'COLLECTIONS', label: 'Curated Popular Collections' },
    { value: 'BUNDLES', label: 'Printer + Filament Combo Deals' },
    { value: 'REVIEWS', label: 'Verified Customer Testimonials' },
    { value: 'BLOGS', label: 'Recent Slicing & 3D Articles' },
    { value: 'SERVICES', label: 'Custom 3D Printing Highlights' },
    { value: 'WHY_CHOOSE_US', label: 'Trust & Shipping Highlights' },
    { value: 'NEWSLETTER', label: 'Integrated Subscriber Signup' },
    { value: 'BRANDS', label: 'Manufacturer Partner Logos' }
  ];

  ngOnInit() {
    this.loadSections();
  }

  loadSections() {
    this.loading.set(true);
    this.errorMessage.set('');
    this.api.get<any>('/api/homepage/admin').subscribe({
      next: (res) => {
        let list = res || [];
        if (res && res.success && res.data) {
          list = res.data;
        }
        // Ensure sorted by sortOrder
        list.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
        this.sections.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load homepage sections:', err);
        this.errorMessage.set('Could not fetch storefront sections. Please try again.');
        this.loading.set(false);
      }
    });
  }

  moveUp(index: number) {
    if (index === 0) return;
    const list = [...this.sections()];
    const temp = list[index];
    list[index] = list[index - 1];
    list[index - 1] = temp;
    
    // Recalculate sortOrder sequence
    list.forEach((sec, idx) => {
      sec.sortOrder = idx;
    });
    this.sections.set(list);
    this.saveReorderedSequence();
  }

  moveDown(index: number) {
    const list = [...this.sections()];
    if (index === list.length - 1) return;
    const temp = list[index];
    list[index] = list[index + 1];
    list[index + 1] = temp;

    // Recalculate sortOrder sequence
    list.forEach((sec, idx) => {
      sec.sortOrder = idx;
    });
    this.sections.set(list);
    this.saveReorderedSequence();
  }

  toggleActive(sec: HomepageSection) {
    sec.isActive = !sec.isActive;
    this.api.put<any>(`/api/homepage/${sec.id}`, {
      name: sec.name,
      type: sec.type,
      sequence: String(sec.sortOrder),
      isVisible: sec.isActive
    }).subscribe({
      next: () => {
        this.loadSections();
      },
      error: (err) => {
        console.error('Failed to toggle status:', err);
        this.errorMessage.set('Failed to update status.');
        sec.isActive = !sec.isActive; // revert
      }
    });
  }

  openEdit(sec: HomepageSection) {
    this.editingSection.set(sec);
    this.editName = sec.name;
    this.editType = sec.type;
    this.editIsActive = sec.isActive;
    this.isNewSection = false;
  }

  openAdd() {
    this.editingSection.set({
      id: '',
      name: '',
      type: 'HERO',
      sortOrder: this.sections().length,
      isActive: true
    });
    this.editName = '';
    this.editType = 'HERO';
    this.editIsActive = true;
    this.isNewSection = true;
  }

  closeEdit() {
    this.editingSection.set(null);
  }

  saveSection() {
    if (!this.editName.trim()) {
      alert('Section display name is required');
      return;
    }

    this.saving.set(true);
    const sec = this.editingSection();
    if (!sec) return;

    if (this.isNewSection) {
      // POST Create
      this.api.post<any>('/api/homepage', {
        name: this.editName,
        type: this.editType,
        sequence: String(sec.sortOrder),
        isVisible: this.editIsActive
      }).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeEdit();
          this.loadSections();
        },
        error: (err) => {
          console.error('Failed to create section:', err);
          this.errorMessage.set('Failed to save layout section.');
          this.saving.set(false);
        }
      });
    } else {
      // PUT Update
      this.api.put<any>(`/api/homepage/${sec.id}`, {
        name: this.editName,
        type: this.editType,
        sequence: String(sec.sortOrder),
        isVisible: this.editIsActive
      }).subscribe({
        next: () => {
          this.saving.set(false);
          this.closeEdit();
          this.loadSections();
        },
        error: (err) => {
          console.error('Failed to update section:', err);
          this.errorMessage.set('Failed to save layout section.');
          this.saving.set(false);
        }
      });
    }
  }

  deleteSection(id: string) {
    if (!confirm('Are you sure you want to remove this layout section from the homepage?')) return;

    this.loading.set(true);
    this.api.delete<any>(`/api/homepage/${id}`).subscribe({
      next: () => {
        this.loadSections();
      },
      error: (err) => {
        console.error('Failed to delete section:', err);
        this.errorMessage.set('Failed to remove layout section.');
        this.loading.set(false);
      }
    });
  }

  saveReorderedSequence() {
    this.saving.set(true);
    const updates = this.sections().map((sec) => {
      return this.api.put<any>(`/api/homepage/${sec.id}`, {
        name: sec.name,
        type: sec.type,
        sequence: String(sec.sortOrder),
        isVisible: sec.isActive
      }).toPromise();
    });

    Promise.all(updates).then(() => {
      this.saving.set(false);
    }).catch(err => {
      console.error('Failed saving sequence order:', err);
      this.errorMessage.set('Error saving sequence. Reloading...');
      this.saving.set(false);
      this.loadSections();
    });
  }
}

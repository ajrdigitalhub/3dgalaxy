import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CategoryService } from '../../shared/services/category.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { Category } from '../../../services/datastore';
import { ToastService } from '../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-admin-category-list',
  imports: [CommonModule, MatIconModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './category-list.component.html',
  styleUrl: './category-list.component.scss'
})
export class CategoryListComponent {
  toastService = inject(ToastService);
  categoryService = inject(CategoryService);

  // Form states
  editingCategory = signal<Category | null>(null);
  newCatName = signal<string>('');
  newCatParentId = signal<string>('');
  newCatDesc = signal<string>('');
  catImage = signal<string>('');
  catBanner = signal<string>('');
  catIcon = signal<string>('folder');
  catIsActive = signal<boolean>(true);
  catIsFeatured = signal<boolean>(false);
  catSeoTitle = signal<string>('');
  catSeoDescription = signal<string>('');

  startCategoryEdit(c: Category) {
    this.editingCategory.set(c);
    this.newCatName.set(c.name || '');
    this.newCatParentId.set(c.parent_id || c.parentId || '');
    this.newCatDesc.set(c.description || '');
    this.catImage.set(c.image || '');
    this.catBanner.set(c.banner || '');
    this.catIcon.set(c.icon || 'folder');
    this.catIsActive.set(c.isActive !== false);
    this.catIsFeatured.set(c.isFeatured === true);
    this.catSeoTitle.set(c.seoTitle || '');
    this.catSeoDescription.set(c.seoDescription || '');
  }

  cancelCategoryEdit() {
    this.editingCategory.set(null);
    this.newCatName.set('');
    this.newCatParentId.set('');
    this.newCatDesc.set('');
    this.catImage.set('');
    this.catBanner.set('');
    this.catIcon.set('folder');
    this.catIsActive.set(true);
    this.catIsFeatured.set(false);
    this.catSeoTitle.set('');
    this.catSeoDescription.set('');
  }

  async saveCategory() {
    const name = this.newCatName().trim();
    if (!name) {
      this.toastService.error('Category Name is required.');
      return;
    }

    let finalOrder = 1;
    const editing = this.editingCategory();
    if (editing) {
      finalOrder = editing.display_order || 1;
    } else {
      finalOrder = this.categoryService.categories().length + 1;
    }

    const parentId = this.newCatParentId() || null;

    const catData: any = {
      name,
      parent_id: parentId,
      parentId: parentId,
      slug: editing?.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      display_order: finalOrder,
      sortOrder: finalOrder,
      description: this.newCatDesc().trim(),
      image: this.catImage().trim(),
      banner: this.catBanner().trim(),
      icon: this.catIcon().trim(),
      isActive: this.catIsActive(),
      isFeatured: this.catIsFeatured(),
      seoTitle: this.catSeoTitle().trim(),
      seoDescription: this.catSeoDescription().trim()
    };

    try {
      if (editing) {
        await this.categoryService.editCategory(editing.id, catData);
        this.toastService.info('Category updated securely!');
      } else {
        await this.categoryService.addCategory(catData);
        this.toastService.success('Category added successfully!');
      }
      this.cancelCategoryEdit();
    } catch {
      this.toastService.error('Access Denied: You do not have permission to modify categories.');
    }
  }

  async deleteCategory(id: string) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await this.categoryService.deleteCategory(id);
      this.toastService.info('Category removed.');
    } catch {
      this.toastService.error('Operation failed.');
    }
  }
}

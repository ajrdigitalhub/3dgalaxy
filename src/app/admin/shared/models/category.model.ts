export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  parentId: string | null;
  display_order: number;
  sortOrder?: number;
  description?: string;
  icon?: string;
  image?: string;
  banner?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
}

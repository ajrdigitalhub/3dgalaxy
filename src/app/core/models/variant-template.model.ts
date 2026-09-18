import {
  VariantDisplayType,
  VariantSelectionMode,
  BundleTier,
  VariantGroupConfig
} from './variant-engine.model';

export type VariantTemplateCategory =
  | 'ALL'
  | 'FILAMENT'
  | '3D_PRINTER'
  | 'ACCESSORIES'
  | 'BUNDLES'
  | 'GENERAL';

export interface VariantTemplateGroup {
  variantName: string;
  displayName: string;
  displayType: VariantDisplayType;
  selectionMode: VariantSelectionMode;
  required?: boolean;
  active?: boolean;
  allowDuplicates?: boolean;
  values: string[];
  bundleTiers?: BundleTier[];
}

export interface VariantTemplate {
  id: string;
  name: string;
  category: VariantTemplateCategory;
  icon: string;
  description: string;
  version: number;
  tags?: string[];
  groups: VariantTemplateGroup[];
  suggestAutoCombinations?: boolean;
}

export type TemplateApplyMode = 'APPEND' | 'REPLACE';

export interface TemplateApplyEvent {
  template: VariantTemplate;
  groups: VariantGroupConfig[];
  mode: TemplateApplyMode;
  autoGenerateCombinations: boolean;
}

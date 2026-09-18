import { Injectable } from '@angular/core';
import {
  VariantTemplate,
  VariantTemplateCategory
} from '../models/variant-template.model';
import { VariantGroupConfig } from '../models/variant-engine.model';

@Injectable({
  providedIn: 'root'
})
export class VariantTemplateService {
  private readonly templates: VariantTemplate[] = [
    {
      id: 'filament-color',
      name: 'Filament Color',
      category: 'FILAMENT',
      icon: 'palette',
      description: 'Single color selection using authentic 3D printing color chip pills.',
      version: 1,
      tags: ['filament', 'color', 'pla', 'pills', 'single'],
      suggestAutoCombinations: true,
      groups: [
        {
          variantName: 'color',
          displayName: 'Color',
          displayType: 'chip',
          selectionMode: 'single',
          required: true,
          active: true,
          allowDuplicates: false,
          values: ['Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Black', 'White', 'Grey']
        }
      ]
    },
    {
      id: 'filament-weight',
      name: 'Filament Weight',
      category: 'FILAMENT',
      icon: 'scale',
      description: 'Standard spool weight variants (250g, 500g, 1kg, 2kg, 5kg) with weight integration.',
      version: 1,
      tags: ['filament', 'weight', 'spool', 'grams', 'kg'],
      suggestAutoCombinations: true,
      groups: [
        {
          variantName: 'weight',
          displayName: 'Spool Weight',
          displayType: 'weight-selector',
          selectionMode: 'weight',
          required: true,
          active: true,
          allowDuplicates: false,
          values: ['250g', '500g', '1kg', '2kg', '5kg'],
          bundleTiers: [
            { id: 'tier-250g', name: '250g Sample Spool', count: 1, priceType: 'per_variant', priceValue: 350, weightValue: 250, weightUnit: 'g' },
            { id: 'tier-500g', name: '500g Spool', count: 1, priceType: 'per_variant', priceValue: 550, weightValue: 500, weightUnit: 'g' },
            { id: 'tier-1kg', name: '1 kg Standard Spool', count: 1, priceType: 'per_variant', priceValue: 899, weightValue: 1, weightUnit: 'kg', isPopular: true, badgeText: 'Most Popular' },
            { id: 'tier-2kg', name: '2 kg Value Pack', count: 2, priceType: 'per_variant', priceValue: 1699, weightValue: 2, weightUnit: 'kg', savingsText: 'Save 5%' },
            { id: 'tier-5kg', name: '5 kg Mega Bulk Spool', count: 5, priceType: 'fixed', priceValue: 3999, weightValue: 5, weightUnit: 'kg', badgeText: 'Best Value', savingsText: 'Save 11%' }
          ]
        }
      ]
    },
    {
      id: 'material-color',
      name: 'Material + Color',
      category: 'FILAMENT',
      icon: 'layers',
      description: 'Two-group matrix: Polymer Material Type × Vibrant Color Chips.',
      version: 1,
      tags: ['material', 'pla', 'petg', 'abs', 'color', 'matrix'],
      suggestAutoCombinations: true,
      groups: [
        {
          variantName: 'material',
          displayName: 'Material',
          displayType: 'chip',
          selectionMode: 'single',
          required: true,
          active: true,
          allowDuplicates: false,
          values: ['PLA', 'PETG', 'ABS', 'TPU', 'Resin']
        },
        {
          variantName: 'color',
          displayName: 'Color',
          displayType: 'color-chips',
          selectionMode: 'single',
          required: true,
          active: true,
          allowDuplicates: false,
          values: ['Red', 'Blue', 'Green', 'Black', 'White', 'Grey']
        }
      ]
    },
    {
      id: 'material-weight-color',
      name: 'Material + Weight + Color',
      category: 'FILAMENT',
      icon: 'hub',
      description: 'Comprehensive 3-group matrix: Material × Spool Weight × Color.',
      version: 1,
      tags: ['material', 'weight', 'color', '3d printing', 'catalog'],
      suggestAutoCombinations: true,
      groups: [
        {
          variantName: 'material',
          displayName: 'Material',
          displayType: 'chip',
          selectionMode: 'single',
          required: true,
          active: true,
          values: ['PLA', 'PETG', 'ABS']
        },
        {
          variantName: 'weight',
          displayName: 'Spool Weight',
          displayType: 'chip',
          selectionMode: 'single',
          required: true,
          active: true,
          values: ['500g', '1kg']
        },
        {
          variantName: 'color',
          displayName: 'Color',
          displayType: 'color-chips',
          selectionMode: 'single',
          required: true,
          active: true,
          values: ['Black', 'White', 'Grey', 'Red', 'Blue']
        }
      ]
    },
    {
      id: 'product-size',
      name: 'Product Size',
      category: 'GENERAL',
      icon: 'straighten',
      description: 'Physical apparel, enclosure, and 3D print sizing from XS to XXL.',
      version: 1,
      tags: ['size', 'apparel', 'dimension', 'chips'],
      suggestAutoCombinations: true,
      groups: [
        {
          variantName: 'size',
          displayName: 'Size',
          displayType: 'chip',
          selectionMode: 'single',
          required: true,
          active: true,
          allowDuplicates: false,
          values: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
        }
      ]
    },
    {
      id: 'storage-capacity',
      name: 'Storage / Capacity',
      category: 'ACCESSORIES',
      icon: 'sd_card',
      description: 'Digital storage & memory cards options (32GB up to 1TB).',
      version: 1,
      tags: ['storage', 'capacity', 'sd card', 'gb', 'tb'],
      suggestAutoCombinations: true,
      groups: [
        {
          variantName: 'capacity',
          displayName: 'Storage Capacity',
          displayType: 'chip',
          selectionMode: 'single',
          required: true,
          active: true,
          allowDuplicates: false,
          values: ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB']
        }
      ]
    },
    {
      id: 'size-color',
      name: 'Size + Color',
      category: 'ACCESSORIES',
      icon: 'style',
      description: 'Multi-attribute configuration for wearable or protective gear.',
      version: 1,
      tags: ['size', 'color', 'apparel', 'accessories'],
      suggestAutoCombinations: true,
      groups: [
        {
          variantName: 'size',
          displayName: 'Size',
          displayType: 'chip',
          selectionMode: 'single',
          required: true,
          active: true,
          values: ['S', 'M', 'L', 'XL']
        },
        {
          variantName: 'color',
          displayName: 'Color',
          displayType: 'color-chips',
          selectionMode: 'single',
          required: true,
          active: true,
          values: ['Red', 'Blue', 'Black', 'White']
        }
      ]
    },
    {
      id: 'bundle-pack',
      name: 'Bundle Pack',
      category: 'BUNDLES',
      icon: 'inventory_2',
      description: 'Tiered volume discount starter kits (Buy 1, Buy 3, Buy 5) with slots.',
      version: 1,
      tags: ['bundle', 'pack', 'starter kit', 'discount', 'slots'],
      suggestAutoCombinations: false,
      groups: [
        {
          variantName: 'bundle_pack',
          displayName: 'Choose Bundle Pack',
          displayType: 'bundle-builder',
          selectionMode: 'bundle',
          required: true,
          active: true,
          allowDuplicates: true,
          values: ['Single Pack', '3-Pack Bundle', '5-Pack Mega Bundle'],
          bundleTiers: [
            { id: 'tier-1', name: 'Buy 1', count: 1, priceType: 'fixed', priceValue: 756 },
            { id: 'tier-3', name: 'Buy 3 (Save 15%)', count: 3, priceType: 'per_variant', priceValue: 642, isPopular: true, savingsText: 'Save 15%', badgeText: 'Most Popular' },
            { id: 'tier-5', name: 'Buy 5 (Best Value)', count: 5, priceType: 'fixed', priceValue: 3024, badgeText: 'Best Value', savingsText: 'Save 20%' }
          ]
        }
      ]
    },
    {
      id: 'printer-configuration',
      name: '3D Printer Configuration',
      category: '3D_PRINTER',
      icon: 'precision_manufacturing',
      description: 'Hardware model and accessory bundle package selection for 3D printers.',
      version: 1,
      tags: ['printer', 'hardware', 'bambu lab', 'creality', 'combo'],
      suggestAutoCombinations: true,
      groups: [
        {
          variantName: 'printer_model',
          displayName: 'Printer Model',
          displayType: 'card',
          selectionMode: 'single',
          required: true,
          active: true,
          allowDuplicates: false,
          values: ['Bambu Lab A1', 'Bambu Lab A1 Mini', 'Bambu Lab P1S', 'Creality K1', 'Custom Fabricator']
        },
        {
          variantName: 'package_configuration',
          displayName: 'Package Configuration',
          displayType: 'chip',
          selectionMode: 'single',
          required: true,
          active: true,
          allowDuplicates: false,
          values: ['Printer Only', 'Combo with AMS', 'With Complete Accessories Kit']
        }
      ]
    },
    {
      id: 'custom-variant',
      name: 'Custom Variant',
      category: 'GENERAL',
      icon: 'add_circle_outline',
      description: 'Blank starting group ready for full manual name, type, and options customization.',
      version: 1,
      tags: ['custom', 'blank', 'manual', 'options'],
      suggestAutoCombinations: true,
      groups: [
        {
          variantName: 'custom_option',
          displayName: 'Custom Option',
          displayType: 'chip',
          selectionMode: 'single',
          required: true,
          active: true,
          allowDuplicates: false,
          values: ['Option A', 'Option B', 'Option C']
        }
      ]
    }
  ];

  getTemplates(category: VariantTemplateCategory = 'ALL', search: string = ''): VariantTemplate[] {
    const q = (search || '').toLowerCase().trim();
    return this.templates.filter((t) => {
      const matchCat = category === 'ALL' || t.category === category;
      if (!matchCat) return false;
      if (!q) return true;

      const nameMatch = t.name.toLowerCase().includes(q);
      const descMatch = t.description.toLowerCase().includes(q);
      const tagsMatch = t.tags ? t.tags.some((tag) => tag.toLowerCase().includes(q)) : false;
      const groupMatch = t.groups.some((g) =>
        g.displayName.toLowerCase().includes(q) ||
        g.variantName.toLowerCase().includes(q) ||
        g.values.some((v) => v.toLowerCase().includes(q))
      );
      return nameMatch || descMatch || tagsMatch || groupMatch;
    });
  }

  getTemplateById(id: string): VariantTemplate | undefined {
    return this.templates.find((t) => t.id === id);
  }

  checkCollisions(template: VariantTemplate, existingGroups: any[]): { hasExisting: boolean; duplicateGroupNames: string[] } {
    if (!existingGroups || existingGroups.length === 0) {
      return { hasExisting: false, duplicateGroupNames: [] };
    }

    // Check if any existing group actually has values configured
    const validExisting = existingGroups.filter((g) => {
      const hasName = !!(g.variantName || g.name || g.displayName);
      const hasVals = Array.isArray(g.values) ? g.values.length > 0 : !!g.values;
      const hasTiers = Array.isArray(g.bundleTiers) && g.bundleTiers.length > 0;
      return hasName && (hasVals || hasTiers);
    });

    const hasExisting = validExisting.length > 0;

    // Check for duplicate group names (case-insensitive)
    const existingNames = validExisting.map((g) =>
      (g.variantName || g.name || g.displayName || '').toLowerCase().trim()
    );

    const duplicateGroupNames: string[] = [];
    for (const g of template.groups) {
      const gName = (g.variantName || g.displayName).toLowerCase().trim();
      const match = validExisting.find((eg) => {
        const egName = (eg.variantName || eg.name || eg.displayName || '').toLowerCase().trim();
        return egName === gName || (gName === 'color' && egName.includes('color')) || (gName === 'weight' && egName.includes('weight')) || (gName === 'size' && egName.includes('size'));
      });
      if (match) {
        duplicateGroupNames.push(match.displayName || match.variantName || match.name || g.displayName);
      }
    }

    return { hasExisting, duplicateGroupNames };
  }

  createGroupConfigs(template: VariantTemplate, basePrice: number = 756): VariantGroupConfig[] {
    const timestamp = Date.now();
    return template.groups.map((tg, idx) => {
      return {
        id: `grp_tpl_${template.id}_${timestamp}_${idx + 1}`,
        variantName: tg.variantName,
        displayName: tg.displayName,
        displayOrder: idx,
        required: tg.required !== false,
        active: tg.active !== false,
        displayType: tg.displayType,
        selectionMode: tg.selectionMode,
        allowDuplicates: tg.allowDuplicates ?? (tg.displayType === 'bundle-builder'),
        values: [...tg.values],
        bundleTiers: tg.bundleTiers ? tg.bundleTiers.map((t, tIdx) => ({
          ...t,
          id: `tier_${timestamp}_${tIdx + 1}`,
          priceValue: t.priceValue || basePrice
        })) : []
      } as VariantGroupConfig;
    });
  }
}

import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
  VariantTemplate,
  VariantTemplateCategory,
  TemplateApplyMode,
  TemplateApplyEvent
} from '../../../../core/models/variant-template.model';
import { VariantTemplateService } from '../../../../core/services/variant-template.service';
import { VariantGroupConfig } from '../../../../core/models/variant-engine.model';

@Component({
  selector: 'app-admin-variant-templates',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './admin-variant-templates.component.html',
  styleUrls: ['./admin-variant-templates.component.scss']
})
export class AdminVariantTemplatesComponent {
  private templateService = inject(VariantTemplateService);

  @Input() existingGroups: any[] = [];
  @Input() basePrice: number = 756;

  @Output() templateApplied = new EventEmitter<TemplateApplyEvent>();

  // UI State Signals
  isExpanded = signal<boolean>(false);
  selectedCategory = signal<VariantTemplateCategory>('ALL');
  searchQuery = signal<string>('');

  // Active Preview & Collision Modal State
  activePreviewTemplate = signal<VariantTemplate | null>(null);
  applyMode = signal<TemplateApplyMode>('APPEND');
  autoGenerateCombos = signal<boolean>(true);
  confirmReplaceOpen = signal<boolean>(false);
  successMessage = signal<string | null>(null);

  categories: { id: VariantTemplateCategory; label: string }[] = [
    { id: 'ALL', label: 'All Templates' },
    { id: 'FILAMENT', label: 'Filament' },
    { id: '3D_PRINTER', label: '3D Printer' },
    { id: 'ACCESSORIES', label: 'Accessories' },
    { id: 'BUNDLES', label: 'Bundles' },
    { id: 'GENERAL', label: 'General' }
  ];

  filteredTemplates = computed(() => {
    return this.templateService.getTemplates(
      this.selectedCategory(),
      this.searchQuery()
    );
  });

  collisionState = computed(() => {
    const tpl = this.activePreviewTemplate();
    if (!tpl) return { hasExisting: false, duplicateGroupNames: [] };
    return this.templateService.checkCollisions(tpl, this.existingGroups);
  });

  toggleExpanded() {
    this.isExpanded.update((v) => !v);
  }

  openPreview(template: VariantTemplate) {
    this.activePreviewTemplate.set(template);
    this.applyMode.set('APPEND');
    this.confirmReplaceOpen.set(false);
    this.autoGenerateCombos.set(template.suggestAutoCombinations !== false);
  }

  closePreview() {
    this.activePreviewTemplate.set(null);
    this.confirmReplaceOpen.set(false);
  }

  confirmAndApply(mode: TemplateApplyMode) {
    this.applyMode.set(mode);
    if (mode === 'REPLACE' && !this.confirmReplaceOpen()) {
      this.confirmReplaceOpen.set(true);
      return;
    }
    this.executeApply();
  }

  executeApply() {
    const tpl = this.activePreviewTemplate();
    if (!tpl) return;

    const generatedGroups: VariantGroupConfig[] = this.templateService.createGroupConfigs(
      tpl,
      this.basePrice
    );

    this.templateApplied.emit({
      template: tpl,
      groups: generatedGroups,
      mode: this.applyMode(),
      autoGenerateCombinations: this.autoGenerateCombos()
    });

    const msg = `Applied "${tpl.name}" template. Review and adjust options below.`;
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 4000);

    this.closePreview();
  }

  getColorHex(name: string): string {
    const c = (name || '').toLowerCase();
    if (c.includes('black')) return '#0f172a';
    if (c.includes('white')) return '#f8fafc';
    if (c.includes('grey') || c.includes('gray')) return '#94a3b8';
    if (c.includes('blue')) return '#3b82f6';
    if (c.includes('green')) return '#22c55e';
    if (c.includes('red')) return '#ef4444';
    if (c.includes('yellow')) return '#eab308';
    if (c.includes('orange')) return '#f97316';
    if (c.includes('purple')) return '#a855f7';
    if (c.includes('pink')) return '#ec4899';
    return '#cbd5e1';
  }
}

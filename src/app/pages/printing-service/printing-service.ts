import {Component, ChangeDetectionStrategy, inject, signal, computed} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {DatastoreService} from '../../services/datastore';

@Component({
  selector: 'app-printing-service',
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './printing-service.html',
  styleUrl: './printing-service.scss'
})
export class PrintingService {
  ds = inject(DatastoreService);

  // Selector Settings State
  selectedFileName = signal<string>('gear_mechanical_assembly.stl');
  selectedFileSize = signal<string>('18.4 MB');
  selectedMaterial = signal<'PLA' | 'PETG' | 'ABS' | 'TPU' | 'Resin'>('PETG');
  selectedColor = signal<string>('Neon Green');
  infillPercent = signal<number>(40);
  layerHeight = signal<number>(0.15);
  sourceVolume = signal<number>(288.5);

  // Customer draft parameters
  custName = signal<string>('Sumit Sharma');
  custPhone = signal<string>('9876543210');
  custEmail = signal<string>('sumit@3dgalaxy.co.in');
  notesText = signal<string>('');

  demoFiles = [
    { name: 'turbine_impeller_aerospace.stl', size: '24.6 MB', volume: 195, presetMaterial: 'ABS' as const, presetColor: 'Space Gray' },
    { name: 'sculpture_bust_artwork.obj', size: '45.2 MB', volume: 105, presetMaterial: 'Resin' as const, presetColor: 'Grey' },
    { name: 'chassis_robot_car.3mf', size: '8.2 MB', volume: 440, presetMaterial: 'PETG' as const, presetColor: 'Jet Black' }
  ];

  constructor() {
    // Synchronize default inputs if user profile exists
    const u = this.ds.activeUser();
    if (u) {
      this.custName.set(u.name);
      this.custPhone.set(u.phone || '');
      this.custEmail.set(u.email);
    }
  }

  // Volumetric slicer response
  estimatedReport = computed(() => {
    return this.ds.calculate3DPrintCost({
      material: this.selectedMaterial(),
      infillPercent: this.infillPercent(),
      layerHeight: this.layerHeight(),
      volumeCm3: this.sourceVolume()
    });
  });

  customerQuotes = computed(() => {
    return this.ds.quotes().filter(q => q.customerEmail === this.custEmail());
  });

  getQuoteStatusClass(status: string) {
    switch (status) {
      case 'submitted': return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/15';
      case 'estimated': return 'bg-blue-500/10 text-blue-500 border border-blue-500/15';
      case 'approved_by_customer': return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/15';
      case 'completed': return 'bg-purple-500/10 text-purple-500 border border-purple-500/15';
      default: return 'bg-neutral-500/10 text-neutral-500 border border-neutral-500/15';
    }
  }

  selectDemoFile(sample: { name: string; size: string; volume: number; presetMaterial: 'PLA' | 'PETG' | 'ABS' | 'TPU' | 'Resin'; presetColor: string }) {
    this.selectedFileName.set(sample.name);
    this.selectedFileSize.set(sample.size);
    this.sourceVolume.set(sample.volume);
    this.selectedMaterial.set(sample.presetMaterial);
    this.selectedColor.set(sample.presetColor);
  }

  onFileDropped(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedFileName.set(file.name);
      const sizeMb = Math.round((file.size / (1024 * 1024)) * 10) / 10;
      this.selectedFileSize.set(`${sizeMb} MB`);
      
      // Select a random mock volume size based on the file name
      const mockVolume = Math.floor(45 + Math.random() * 320);
      this.sourceVolume.set(mockVolume);
    }
  }

  clearFile() {
    this.selectedFileName.set('');
    this.selectedFileSize.set('');
    this.sourceVolume.set(50);
  }

  onMaterialChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value as 'PLA' | 'PETG' | 'ABS' | 'TPU' | 'Resin';
    this.selectedMaterial.set(val);
  }

  onColorChange(event: Event) {
    this.selectedColor.set((event.target as HTMLSelectElement).value);
  }

  onInfillChange(event: Event) {
    this.infillPercent.set(parseInt((event.target as HTMLInputElement).value, 10));
  }

  selectLayerHeight(v: number) {
    this.layerHeight.set(v);
  }

  async submitQuotation() {
    if (!this.selectedFileName()) return;
    
    try {
      await this.ds.submitQuotation({
        name: this.custName().trim() || 'Anonymous Maker',
        phone: this.custPhone().trim(),
        email: this.custEmail().trim(),
        fileName: this.selectedFileName(),
        fileSize: this.selectedFileSize(),
        material: this.selectedMaterial(),
        color: this.selectedColor(),
        infill: this.infillPercent(),
        layerHeight: this.layerHeight(),
        volumeSrc: this.sourceVolume(),
        notes: this.notesText()
      });

      // Clear notes text
      this.notesText.set('');
      alert('SUCCESS: Your custom 3D printing quotation has been evaluated instantly. The billing is waiting inside your list on the right!');
    } catch {
      alert('Quotation Submission Failed: Access Denied or Network Error.');
    }
  }

  async approveQuote(quoteId: string) {
    try {
      await this.ds.approveQuote(quoteId);
    } catch {
      alert('Access Denied or Network Error.');
    }
  }

  async rejectQuote(quoteId: string) {
    try {
      await this.ds.rejectQuote(quoteId);
    } catch {
      alert('Access Denied or Network Error.');
    }
  }
}

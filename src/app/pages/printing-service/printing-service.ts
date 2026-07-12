import {Component, ChangeDetectionStrategy, inject, signal, computed, ViewChild, ElementRef, AfterViewInit, OnDestroy, effect, OnInit, HostListener} from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {HttpClient} from '@angular/common/http';
import {DatastoreService} from '../../services/datastore';
import { SettingsService } from '../../core/services/settings.service';
import { ToastService } from '../../shared/components/toast/toast.service';
import { AppButton } from '../../shared/components/app-button/app-button';

@Component({
  selector: 'app-printing-service',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, AppButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './printing-service.html',
  styleUrl: './printing-service.scss'
})
export class PrintingService implements OnInit, AfterViewInit, OnDestroy {
  toastService = inject(ToastService);
  ds = inject(DatastoreService);
  settingsService = inject(SettingsService);
  http = inject(HttpClient);

  @ViewChild('viewportCanvas') viewportCanvas!: ElementRef<HTMLCanvasElement>;

  // Selection states
  selectedFileName = signal<string>('');
  selectedFileSize = signal<string>('');
  selectedMaterial = signal<string>('PLA');
  selectedColor = signal<string>('White');
  infillPercent = signal<number>(20);
  layerHeight = signal<number>(0.20);
  sourceVolume = signal<number>(0);
  activeConfigTab = signal<'quality' | 'material' | 'infill' | 'quantity'>('quality');

  // Searchable dropdown states
  openDropdownId = signal<string | null>(null);
  searchQuery = signal<string>('');

  // Dropdown list configurations loaded from backend API
  serviceConfig = signal<any>(null);

  // New configurations
  supportType = signal<string>('None');
  buildPlateAdhesion = signal<string>('None');
  nozzleSize = signal<string>('0.4 mm');
  layerHeightText = signal<string>('0.20 mm');
  printSpeed = signal<string>('Normal');
  wallCount = signal<string>('2');
  topLayers = signal<string>('3');
  bottomLayers = signal<string>('3');
  fillPattern = signal<string>('Grid');
  surfaceFinish = signal<string>('Matte');
  deliveryPriority = signal<string>('Standard');
  quantity = signal<number>(1);

  // Upload states
  uploading = signal<boolean>(false);
  uploadProgress = signal<number | null>(null);

  // Customer details
  custName = signal<string>('Sumit Sharma');
  custPhone = signal<string>('9876543210');
  custEmail = signal<string>('sumit@3dgalaxy.co.in');
  notesText = signal<string>('');

  // 3D Viewport states
  rotationX = signal<number>(25);
  rotationY = signal<number>(-45);
  scaleFactor = signal<number>(1.0);
  modelVertices: number[][] = [];
  modelFaces: number[][] = [];
  modelDimensions = signal<{x: number, y: number, z: number}>({ x: 0, y: 0, z: 0 });
  modelTriangles = signal<number>(0);
  modelVolume = signal<number>(0);

  // Advanced Custom Slicer Studio States
  visualMode = signal<'solid' | 'wireframe' | 'vertices'>('solid');
  simulationLayer = signal<number>(100);
  
  // Dynamic lists from serviceConfig computed
  materials = computed(() => this.serviceConfig()?.materials || []);
  qualities = computed(() => this.serviceConfig()?.qualities || []);
  selectedQualityName = computed(() => {
    const activeHeight = this.layerHeight();
    const qualitiesList = this.qualities();
    const matched = qualitiesList.find((q: any) => q.height === activeHeight);
    return matched ? matched.name : 'Select Quality';
  });
  defaultHexMap: Record<string, string> = {
    'white': '#ffffff',
    'black': '#000000',
    'red': '#ef4444',
    'blue': '#3b82f6',
    'green': '#22c55e',
    'yellow': '#eab308',
    'orange': '#f97316',
    'purple': '#a855f7',
    'silver': '#cbd5e1',
    'gold': '#fbbf24',
    'grey': '#6b7280',
    'pink': '#ec4899',
    'brown': '#78350f'
  };

  colors = computed(() => {
    const activeMatName = this.selectedMaterial();
    const mat = this.materials().find((m: any) => m.name === activeMatName);
    let rawList: any[] = [];
    if (mat && mat.colors && mat.colors.length > 0) {
      rawList = mat.colors;
    } else {
      rawList = this.serviceConfig()?.colors || [];
    }
    return rawList.map((c: any) => {
      if (typeof c === 'string') {
        const lower = c.toLowerCase();
        return { name: c, hex: this.defaultHexMap[lower] || '#3b82f6' };
      }
      return c;
    });
  });

  infillStandards = computed(() => {
    return this.serviceConfig()?.infillStandards || [
      { name: '10 - 30%', desc: 'Standard', min: 10, max: 30, default: 20 },
      { name: '31 - 50%', desc: 'Medium', min: 31, max: 50, default: 40 },
      { name: '51 - 80%', desc: 'Strong', min: 51, max: 80, default: 60 }
    ];
  });

  isInfillActive(inf: any): boolean {
    const infVal = this.infillPercent();
    return infVal >= inf.min && infVal <= inf.max;
  }

  isColorDark(hex: string): boolean {
    const rgb = this.hexToRgb(hex);
    const yiq = ((rgb.r * 299) + (rgb.g * 587) + (rgb.b * 114)) / 1000;
    return yiq < 128;
  }
  supports = computed(() => this.serviceConfig()?.supports || []);
  fillPatterns = computed(() => this.serviceConfig()?.fillPatterns || []);
  adhesionTypes = computed(() => this.serviceConfig()?.adhesionTypes || []);
  layerHeights = computed(() => this.serviceConfig()?.layerHeights || []);
  printSpeeds = computed(() => this.serviceConfig()?.printSpeeds || []);
  nozzleSizes = computed(() => this.serviceConfig()?.nozzleSizes || []);
  wallCounts = computed(() => this.serviceConfig()?.wallCounts || []);
  deliveryPriorities = computed(() => this.serviceConfig()?.deliveryPriorities || []);
  infillOptions = computed(() => this.serviceConfig()?.infillOptions || []);
  surfaceFinishes = computed(() => this.serviceConfig()?.surfaceFinishes || []);

  // Canvas context & loop
  private canvasContext?: CanvasRenderingContext2D;
  private animationFrameId?: number;
  private isDragging = false;
  private previousMouseX = 0;
  private previousMouseY = 0;

  // Step Indicators
  step1Active = computed(() => !!this.selectedFileName());
  step2Active = computed(() => this.step1Active() && !!this.layerHeight());
  step3Active = computed(() => this.step2Active() && !!this.selectedMaterial());
  step4Active = computed(() => this.step3Active() && this.infillPercent() > 0);
  step5Active = computed(() => this.step4Active() && !!this.estimatedReport().totalCost);
  step6Active = computed(() => {
    const quotes = this.customerQuotes();
    return quotes.some(q => q.status === 'approved_by_customer' || q.status === 'completed');
  });

  constructor() {
    const u = this.ds.activeUser();
    if (u) {
      this.custName.set(u.name);
      this.custPhone.set(u.phone || '');
      this.custEmail.set(u.email);
    }

    // Effect to auto-save selected options locally
    effect(() => {
      if (typeof window === 'undefined') return;
      localStorage.setItem('3dg_slicer_material', this.selectedMaterial());
      localStorage.setItem('3dg_slicer_color', this.selectedColor());
      localStorage.setItem('3dg_slicer_infill', String(this.infillPercent()));
      localStorage.setItem('3dg_slicer_layer_height', this.layerHeightText());
      localStorage.setItem('3dg_slicer_quality', String(this.layerHeight()));
      localStorage.setItem('3dg_slicer_support', this.supportType());
      localStorage.setItem('3dg_slicer_adhesion', this.buildPlateAdhesion());
      localStorage.setItem('3dg_slicer_nozzle', this.nozzleSize());
      localStorage.setItem('3dg_slicer_speed', this.printSpeed());
      localStorage.setItem('3dg_slicer_walls', this.wallCount());
      localStorage.setItem('3dg_slicer_top_layers', this.topLayers());
      localStorage.setItem('3dg_slicer_bottom_layers', this.bottomLayers());
      localStorage.setItem('3dg_slicer_pattern', this.fillPattern());
      localStorage.setItem('3dg_slicer_finish', this.surfaceFinish());
      localStorage.setItem('3dg_slicer_priority', this.deliveryPriority());
      localStorage.setItem('3dg_slicer_quantity', String(this.quantity()));
      localStorage.setItem('3dg_slicer_notes', this.notesText());
    });
  }

  ngOnInit() {
    this.loadServiceConfig();
    this.restoreOptionsFromLocal();
  }

  loadServiceConfig() {
    this.http.get<any>('/api/service-config').subscribe({
      next: (cfg) => {
        this.serviceConfig.set(cfg);
        // Apply defaults if not restored
        if (!localStorage.getItem('3dg_slicer_material') && cfg.materials?.length > 0) {
          this.selectedMaterial.set(cfg.materials[0].name);
        }
        if (!localStorage.getItem('3dg_slicer_color') && cfg.colors?.length > 0) {
          this.selectedColor.set(cfg.colors[0]);
        }
      },
      error: (err) => {
        console.error('Failed to load printing service configuration', err);
      }
    });
  }

  restoreOptionsFromLocal() {
    if (typeof window === 'undefined') return;
    const material = localStorage.getItem('3dg_slicer_material');
    if (material) this.selectedMaterial.set(material);
    
    const color = localStorage.getItem('3dg_slicer_color');
    if (color) this.selectedColor.set(color);
    
    const infill = localStorage.getItem('3dg_slicer_infill');
    if (infill) this.infillPercent.set(Number(infill));
    
    const layerHeightText = localStorage.getItem('3dg_slicer_layer_height');
    if (layerHeightText) this.layerHeightText.set(layerHeightText);
    
    const quality = localStorage.getItem('3dg_slicer_quality');
    if (quality) this.layerHeight.set(Number(quality));
    
    const support = localStorage.getItem('3dg_slicer_support');
    if (support) this.supportType.set(support);
    
    const adhesion = localStorage.getItem('3dg_slicer_adhesion');
    if (adhesion) this.buildPlateAdhesion.set(adhesion);
    
    const nozzle = localStorage.getItem('3dg_slicer_nozzle');
    if (nozzle) this.nozzleSize.set(nozzle);
    
    const speed = localStorage.getItem('3dg_slicer_speed');
    if (speed) this.printSpeed.set(speed);
    
    const walls = localStorage.getItem('3dg_slicer_walls');
    if (walls) this.wallCount.set(walls);
    
    const topLayers = localStorage.getItem('3dg_slicer_top_layers');
    if (topLayers) this.topLayers.set(topLayers);
    
    const bottomLayers = localStorage.getItem('3dg_slicer_bottom_layers');
    if (bottomLayers) this.bottomLayers.set(bottomLayers);
    
    const pattern = localStorage.getItem('3dg_slicer_pattern');
    if (pattern) this.fillPattern.set(pattern);
    
    const finish = localStorage.getItem('3dg_slicer_finish');
    if (finish) this.surfaceFinish.set(finish);
    
    const priority = localStorage.getItem('3dg_slicer_priority');
    if (priority) this.deliveryPriority.set(priority);
    
    const qty = localStorage.getItem('3dg_slicer_quantity');
    if (qty) this.quantity.set(Number(qty));
    
    const notes = localStorage.getItem('3dg_slicer_notes');
    if (notes) this.notesText.set(notes);
  }

  ngAfterViewInit() {
    if (this.viewportCanvas && this.selectedFileName()) {
      this.initCanvas(this.viewportCanvas.nativeElement);
    }
  }

  ngOnDestroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  initCanvasAfterUpload() {
    setTimeout(() => {
      const canvasEl = document.getElementById('viewportCanvas') as HTMLCanvasElement;
      if (canvasEl) {
        this.initCanvas(canvasEl);
      }
    }, 100);
  }

  // Cost estimation details
  estimatedReport = computed(() => {
    const cfg = this.serviceConfig() || {};
    const materialsList = cfg.materials || [];
    const qualitiesList = cfg.qualities || [];
    
    // Find active material
    const activeMatName = this.selectedMaterial();
    const mat = materialsList.find((m: any) => m.name === activeMatName) || { pricePerGram: 2.5, density: 1.25 };
    const density = mat.density || 1.25;
    const pricePerGram = mat.pricePerGram || 2.5;
    
    // Find quality
    const activeQualityHeight = this.layerHeight();
    const qual = qualitiesList.find((q: any) => q.height === activeQualityHeight) || { price: 50 };
    const qualityPrice = qual.price !== undefined ? qual.price : 50;
    
    const machineRate = cfg.machineFeePerHour !== undefined ? cfg.machineFeePerHour : 150;
    const setupCost = cfg.setupCost !== undefined ? cfg.setupCost : 100;
    const gstRate = cfg.gstTaxRate !== undefined ? cfg.gstTaxRate : 18;
    
    const volume = this.sourceVolume();
    const infillVal = this.infillPercent();
    const infillFactor = (20 + infillVal * 0.8) / 100;
    
    // Weight (grams)
    const estimatedWeight = Math.round(volume * density * infillFactor * 10) / 10;
    
    // Material Cost
    const materialCost = Math.round(estimatedWeight * pricePerGram);
    
    // Machine Time (hours)
    const speed = this.printSpeed();
    let speedFactor = 1.0;
    if (speed === 'Slow') speedFactor = 1.5;
    else if (speed === 'Fast') speedFactor = 0.7;
    else if (speed === 'Ultra Fast') speedFactor = 0.5;
    
    const layerHeightVal = Number(this.layerHeightText().replace(' mm', '')) || 0.20;
    const heightFactor = 0.20 / Math.max(0.04, layerHeightVal);
    
    const baseHours = volume * 0.08;
    const estimatedHours = Math.round(Math.max(1, baseHours * heightFactor * speedFactor * infillFactor) * 10) / 10;
    
    // Printing Cost = machine fee + quality price
    const machineFee = Math.round(estimatedHours * machineRate);
    const printingCost = machineFee + qualityPrice;
    
    // Subtotal before tax
    const qty = this.quantity();
    const subtotal = (materialCost + printingCost + setupCost) * qty;
    
    // GST
    const gstTax = Math.round(subtotal * (gstRate / 100));
    
    // Shipping
    const shippingThreshold = this.settingsService.shippingSettings()?.freeShippingMinSpent || 3000;
    const shippingFee = (subtotal >= shippingThreshold) ? 0 : 120;
    
    // Grand Total
    const totalCost = subtotal + gstTax + shippingFee;
    
    return {
      weightGrams: estimatedWeight,
      hours: estimatedHours,
      materialCost: materialCost * qty,
      printingCost: printingCost * qty,
      setupCost: setupCost * qty,
      gstTax: gstTax,
      shipping: shippingFee,
      totalCost: totalCost
    };
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

  onFileDropped(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Supported files validation
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'stl' && ext !== 'obj' && ext !== '3mf') {
        this.toastService.error('Unsupported file format! Please upload STL, OBJ or 3MF.');
        return;
      }
      
      this.simulateFileUpload(file);
    }
  }

  simulateFileUpload(file: File) {
    this.uploading.set(true);
    this.uploadProgress.set(0);
    
    const totalSteps = 100;
    const intervalTime = 15;
    let currentProgress = 0;
    
    const interval = setInterval(() => {
      currentProgress += 2;
      this.uploadProgress.set(currentProgress);
      
      if (currentProgress >= 100) {
        clearInterval(interval);
        this.uploading.set(false);
        this.uploadProgress.set(null);
        
        this.selectedFileName.set(file.name);
        const sizeMb = Math.round((file.size / (1024 * 1024)) * 10) / 10;
        this.selectedFileSize.set(`${sizeMb} MB`);
        
        if (file.name.toLowerCase().endsWith('.stl')) {
          this.parseSTLFile(file);
        } else {
          const mockVolume = Math.floor(45 + Math.random() * 320);
          this.sourceVolume.set(mockVolume);
          this.generateDefaultModel();
        }
        
        this.initCanvasAfterUpload();
        this.toastService.success(`Model "${file.name}" loaded successfully!`);
      }
    }, intervalTime);
  }

  clearFile() {
    this.selectedFileName.set('');
    this.selectedFileSize.set('');
    this.sourceVolume.set(0);
    this.modelVertices = [];
    this.modelFaces = [];
    this.modelTriangles.set(0);
    this.modelVolume.set(0);
    this.simulationLayer.set(100);
  }

  // Dropdown actions
  toggleDropdown(id: string, event?: Event) {
    if (event) event.stopPropagation();
    this.openDropdownId.update(current => current === id ? null : id);
    this.searchQuery.set('');
  }

  isDropdownOpen(id: string): boolean {
    return this.openDropdownId() === id;
  }

  selectOption(id: string, val: any) {
    if (id === 'material') {
      this.selectedMaterial.set(val);
      setTimeout(() => {
        const currentColors = this.colors();
        const hasColor = currentColors.some(c => c.name === this.selectedColor());
        if (currentColors.length > 0 && !hasColor) {
          this.selectedColor.set(currentColors[0].name);
        }
      }, 50);
    } else if (id === 'quality') {
      this.layerHeight.set(val.height);
      this.layerHeightText.set(`${val.height} mm`);
    } else if (id === 'infill') {
      const num = parseInt(val.replace('%', ''), 10);
      this.infillPercent.set(num);
    } else if (id === 'infill_standard') {
      this.infillPercent.set(val.default);
    } else if (id === 'support') {
      this.supportType.set(val);
    } else if (id === 'adhesion') {
      this.buildPlateAdhesion.set(val);
    } else if (id === 'nozzle') {
      this.nozzleSize.set(val);
    } else if (id === 'layerHeight') {
      this.layerHeightText.set(val);
    } else if (id === 'speed') {
      this.printSpeed.set(val);
    } else if (id === 'walls') {
      this.wallCount.set(val);
    } else if (id === 'topLayers') {
      this.topLayers.set(val);
    } else if (id === 'bottomLayers') {
      this.bottomLayers.set(val);
    } else if (id === 'pattern') {
      this.fillPattern.set(val);
    } else if (id === 'color') {
      this.selectedColor.set(val);
    } else if (id === 'finish') {
      this.surfaceFinish.set(val);
    } else if (id === 'priority') {
      this.deliveryPriority.set(val);
    }
    this.openDropdownId.set(null);
  }

  getFilteredOptions(id: string, options: any[]): any[] {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return options;
    return options.filter(opt => {
      const name = typeof opt === 'string' ? opt : (opt.name || '');
      return name.toLowerCase().includes(query);
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-container')) {
      this.openDropdownId.set(null);
    }
  }

  // Stepper handlers
  incrementQty() {
    this.quantity.update(q => q + 1);
  }

  decrementQty() {
    this.quantity.update(q => Math.max(1, q - 1));
  }

  resetRotation() {
    this.rotationX.set(25);
    this.rotationY.set(-45);
    this.scaleFactor.set(1.0);
  }

  zoomIn() {
    this.scaleFactor.update(s => Math.min(5.0, s * 1.15));
  }

  zoomOut() {
    this.scaleFactor.update(s => Math.max(0.2, s * 0.85));
  }

  isSubmitting = signal(false);

  async submitQuotation() {
    if (!this.selectedFileName() || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    
    try {
      const customNotes = `
=== SLICER PARAMETERS ===
- Quantity: ${this.quantity()}
- Support: ${this.supportType()}
- Adhesion: ${this.buildPlateAdhesion()}
- Nozzle: ${this.nozzleSize()}
- Layer Height: ${this.layerHeightText()}
- Speed: ${this.printSpeed()}
- Walls: ${this.wallCount()}
- Top/Bottom Layers: ${this.topLayers()} / ${this.bottomLayers()}
- Pattern: ${this.fillPattern()}
- Surface Finish: ${this.surfaceFinish()}
- Priority: ${this.deliveryPriority()}

=== INSTRUCTIONS ===
${this.notesText().trim()}
      `.trim();

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
        notes: customNotes
      });

      this.notesText.set('');
      this.toastService.success('SUCCESS: Your custom 3D printing quotation has been evaluated instantly. The billing is waiting inside your list below!');
    } catch {
      this.toastService.error('Quotation Submission Failed: Access Denied or Network Error.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async approveQuote(quoteId: string) {
    try {
      await this.ds.approveQuote(quoteId);
      this.toastService.success('Quotation approved. Instant invoice created!');
    } catch {
      this.toastService.error('Access Denied or Network Error.');
    }
  }

  async rejectQuote(quoteId: string) {
    try {
      await this.ds.rejectQuote(quoteId);
      this.toastService.info('Quote request rejected.');
    } catch {
      this.toastService.error('Access Denied or Network Error.');
    }
  }

  // --- INTERACTIVE CANVAS 3D RENDERER ---
  initCanvas(canvas: HTMLCanvasElement) {
    this.canvasContext = canvas.getContext('2d') || undefined;
    if (!this.canvasContext) return;
    
    this.generateDefaultModel();

    // Prevent default browser page scrolling when zooming on canvas
    canvas.addEventListener('wheel', (event: WheelEvent) => {
      event.preventDefault();
      const zoomDelta = event.deltaY < 0 ? 1.15 : 0.85;
      this.scaleFactor.update(s => Math.max(0.2, Math.min(5.0, s * zoomDelta)));
    }, { passive: false });

    const renderLoop = () => {
      if (this.canvasContext) {
        this.drawModel(canvas);
      }
      this.animationFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();
  }

  generateDefaultModel() {
    const vertices: number[][] = [];
    const faces: number[][] = [];
    
    // Generate keychain gear/plate default shape
    const w = 48, h = 26, d = 5;
    vertices.push([-w/2, -h/2, -d/2]); // 0
    vertices.push([ w/2, -h/2, -d/2]); // 1
    vertices.push([ w/2,  h/2, -d/2]); // 2
    vertices.push([-w/2,  h/2, -d/2]); // 3
    vertices.push([-w/2, -h/2,  d/2]); // 4
    vertices.push([ w/2, -h/2,  d/2]); // 5
    vertices.push([ w/2,  h/2,  d/2]); // 6
    vertices.push([-w/2,  h/2,  d/2]); // 7
    
    // Base Plate Faces (12 triangles)
    faces.push([0, 1, 2]); faces.push([0, 2, 3]);
    faces.push([4, 6, 5]); faces.push([4, 7, 6]);
    faces.push([0, 4, 5]); faces.push([0, 5, 1]);
    faces.push([2, 6, 7]); faces.push([2, 7, 3]);
    faces.push([0, 3, 7]); faces.push([0, 7, 4]);
    faces.push([1, 5, 6]); faces.push([1, 6, 2]);
    
    // Ring Hole Vertices
    const holeX = -17, holeR = 3.5;
    const segments = 12;
    const startVert = vertices.length;
    for (let i = 0; i < segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const dx = Math.cos(theta) * holeR;
      const dy = Math.sin(theta) * holeR;
      
      vertices.push([holeX + dx, dy, -d/2]);
      vertices.push([holeX + dx, dy, d/2]);
      
      const curr = startVert + i * 2;
      const next = startVert + ((i + 1) % segments) * 2;
      faces.push([curr, next, curr + 1]);
      faces.push([next, next + 1, curr + 1]);
    }
    
    this.modelVertices = vertices;
    this.modelFaces = faces;
    this.modelDimensions.set({ x: 48, y: 26, z: 5.0 });
    this.modelTriangles.set(faces.length);
    this.modelVolume.set(4.88);
    this.sourceVolume.set(4.88);
  }

  drawModel(canvas: HTMLCanvasElement) {
    const ctx = this.canvasContext;
    if (!ctx) return;
    
    // High-DPI (Retina) dynamic scaling for 100% crisp sharpness
    const rect = canvas.getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);
    
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    const isDark = this.isDarkTheme();

    const cx = width / 2;
    const cy = height / 2;
    
    const radX = (this.rotationX() * Math.PI) / 180;
    const radY = (this.rotationY() * Math.PI) / 180;
    
    const project = (x: number, y: number, z: number) => {
      // Rotation Y
      const x1 = x * Math.cos(radY) - z * Math.sin(radY);
      const z1 = x * Math.sin(radY) + z * Math.cos(radY);
      
      // Rotation X
      const y2 = y * Math.cos(radX) - z1 * Math.sin(radX);
      const z1_rotated = y * Math.sin(radX) + z1 * Math.cos(radX);
      
      // Scaled perspective coordinates based on dynamic canvas buffer size
      const perspective = 350 / (350 + z1_rotated);
      const scale = (width / 640) * this.scaleFactor() * perspective * 2.8;
      return {
        x: cx + x1 * scale,
        y: cy + y2 * scale,
        depth: z1_rotated
      };
    };

    // Draw 3D print bed grid
    ctx.strokeStyle = isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(226, 232, 240, 0.9)';
    ctx.lineWidth = 1 * dpr;
    
    // The model max Y is scaled to fit in 35. So bottom is at Y = 17.5. Let's place bed at Y = 18.
    const bedY = 18;
    const bedSize = 45;
    const step = 7.5;
    
    // Draw lines parallel to Z axis (changing X)
    for (let x = -bedSize; x <= bedSize; x += step) {
      const pStart = project(x, bedY, -bedSize);
      const pEnd = project(x, bedY, bedSize);
      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      ctx.lineTo(pEnd.x, pEnd.y);
      ctx.stroke();
    }
    
    // Draw lines parallel to X axis (changing Z)
    for (let z = -bedSize; z <= bedSize; z += step) {
      const pStart = project(-bedSize, bedY, z);
      const pEnd = project(bedSize, bedY, z);
      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      ctx.lineTo(pEnd.x, pEnd.y);
      ctx.stroke();
    }
    
    // Draw compact Slicers BED Axes at the corner of the grid bed
    const oX = -bedSize;
    const oY = bedY;
    const oZ = -bedSize;
    
    const o = project(oX, oY, oZ);
    const ax = project(oX + 15, oY, oZ);
    const ay = project(oX, oY - 15, oZ);
    const az = project(oX, oY, oZ + 15);
    
    ctx.lineWidth = 2 * dpr;
    ctx.strokeStyle = '#ef4444'; // X (Red)
    ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(ax.x, ax.y); ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold ' + Math.round(9 * dpr) + 'px monospace';
    ctx.fillText('X', ax.x + 3 * dpr, ax.y + 3 * dpr);
    
    ctx.strokeStyle = '#22c55e'; // Y (Green)
    ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(ay.x, ay.y); ctx.stroke();
    ctx.fillStyle = '#22c55e';
    ctx.fillText('Y', ay.x + 3 * dpr, ay.y - 3 * dpr);
    
    ctx.strokeStyle = '#3b82f6'; // Z (Blue)
    ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(az.x, az.y); ctx.stroke();
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('Z', az.x + 3 * dpr, az.y + 3 * dpr);
    
    if (this.modelVertices.length === 0) return;

    // Calculate Z threshold for slicing simulation
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const v of this.modelVertices) {
      if (v[2] < minZ) minZ = v[2];
      if (v[2] > maxZ) maxZ = v[2];
    }
    const zThreshold = minZ + (maxZ - minZ) * (this.simulationLayer() / 100);

    // Compute rotated coordinates in camera space first
    const rotatedVerts = this.modelVertices.map(v => {
      const x = v[0], y = v[1], z = v[2];
      // Rotation Y
      const x1 = x * Math.cos(radY) - z * Math.sin(radY);
      const z1 = x * Math.sin(radY) + z * Math.cos(radY);
      
      // Rotation X
      const y2 = y * Math.cos(radX) - z1 * Math.sin(radX);
      const z2 = y * Math.sin(radX) + z1 * Math.cos(radX);
      
      return [x1, y2, z2];
    });

    // Project rotated vertices
    const projectedVerts = rotatedVerts.map(rv => {
      const perspective = 350 / (350 + rv[2]);
      const scale = (width / 640) * this.scaleFactor() * perspective * 2.8;
      return {
        x: cx + rv[0] * scale,
        y: cy + rv[1] * scale,
        depth: rv[2]
      };
    });
    
    // Depth sort faces
    const sortedFaces = this.modelFaces.map((f, idx) => {
      const d = (projectedVerts[f[0]].depth + projectedVerts[f[1]].depth + projectedVerts[f[2]].depth) / 3;
      return { face: f, depth: d };
    }).sort((a, b) => b.depth - a.depth);
    
    const fillHex = this.getFilamentHexColor();

    if (this.visualMode() === 'vertices') {
      ctx.fillStyle = fillHex;
      for (let i = 0; i < projectedVerts.length; i++) {
        if (this.modelVertices[i][2] > zThreshold) continue;
        const p = projectedVerts[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.lineWidth = 0.5 * dpr;
      for (const sf of sortedFaces) {
        const f = sf.face;
        const z1 = this.modelVertices[f[0]][2];
        const z2 = this.modelVertices[f[1]][2];
        const z3 = this.modelVertices[f[2]][2];
        if (z1 > zThreshold || z2 > zThreshold || z3 > zThreshold) continue;

        const v0 = rotatedVerts[f[0]];
        const v1 = rotatedVerts[f[1]];
        const v2 = rotatedVerts[f[2]];

        const ax_edge = v1[0] - v0[0];
        const ay_edge = v1[1] - v0[1];
        const az_edge = v1[2] - v0[2];
        
        const bx_edge = v2[0] - v0[0];
        const by_edge = v2[1] - v0[1];
        const bz_edge = v2[2] - v0[2];

        // Cross product
        const nx = ay_edge * bz_edge - az_edge * by_edge;
        const ny = az_edge * bx_edge - ax_edge * bz_edge;
        const nz = ax_edge * by_edge - ay_edge * bx_edge;

        // Backface culling: skip faces facing away from screen
        if (nz <= 0) continue;

        const p1 = projectedVerts[f[0]];
        const p2 = projectedVerts[f[1]];
        const p3 = projectedVerts[f[2]];
        
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        
        if (this.visualMode() === 'solid') {
          // Normalize normal vector
          const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
          let intensity = 0.6; // Default fallback
          if (len > 0) {
            const nx_n = nx / len;
            const ny_n = ny / len;
            const nz_n = nz / len;

            // Invert normal for lighting since positive nz points away from camera
            const normalX = -nx_n;
            const normalY = -ny_n;
            const normalZ = -nz_n;

            // Dual light source (Key + Fill) for gorgeous depth flat shading
            const dot1 = Math.max(0, normalX * 0.4 + normalY * 0.5 + normalZ * 0.7);
            const dot2 = Math.max(0, normalX * -0.5 + normalY * -0.5 + normalZ * 0.7);
            intensity = 0.25 + 0.55 * dot1 + 0.2 * dot2;
          }

          const rgb = this.hexToRgb(fillHex);
          const r = Math.round(rgb.r * intensity);
          const g = Math.round(rgb.g * intensity);
          const b = Math.round(rgb.b * intensity);
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fill();
          
          ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
          ctx.stroke();
        } else if (this.visualMode() === 'wireframe') {
          ctx.strokeStyle = fillHex;
          ctx.lineWidth = 0.7 * dpr;
          ctx.stroke();
        }
      }
    }
  }

  isDarkTheme(): boolean {
    if (typeof document !== 'undefined') {
      return document.body.classList.contains('dark');
    }
    return false;
  }

  hexToRgb(hex: string): { r: number; g: number; b: number } {
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(char => char + char).join('');
    }
    const num = parseInt(cleanHex, 16) || 0;
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  shadeColor(color: string, percent: number): string {
    const num = parseInt(color.replace("#",""), 16),
    amt = Math.round(2.55 * (percent * 100 - 100)),
    R = (num >> 16) + amt,
    G = (num >> 8 & 0x00FF) + amt,
    B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<0?0:R:255)*0x10000 + (G<255?G<0?0:G:255)*0x100 + (B<255?B<0?0:B:255)).toString(16).slice(1);
  }

  getFilamentHexColor(): string {
    const colors = this.colors();
    const active = colors.find((c: any) => c.name.toLowerCase() === this.selectedColor().toLowerCase());
    return active ? active.hex : '#3b82f6';
  }

  getProgressPercent(): number {
    if (this.step6Active()) return 100;
    if (this.step5Active()) return 80;
    if (this.step4Active()) return 60;
    if (this.step3Active()) return 40;
    if (this.step2Active()) return 20;
    if (this.step1Active()) return 0;
    return 0;
  }

  // --- STL BINARY PARSER ---
  parseSTLFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const buffer = e.target.result as ArrayBuffer;
      try {
        const { vertices, faces } = this.parseBinarySTL(buffer);
        if (vertices.length > 0) {
          this.centerAndScaleModel(vertices, faces);
          this.toastService.success(`Successfully loaded mesh: ${faces.length} facets.`);
        } else {
          this.toastService.error('The selected file seems empty or unsupported.');
        }
      } catch (err) {
        console.error('Binary STL parsing error:', err);
        const mockVolume = Math.floor(45 + Math.random() * 320);
        this.sourceVolume.set(mockVolume);
        this.generateDefaultModel();
      }
    };
    reader.readAsArrayBuffer(file);
  }

  parseBinarySTL(buffer: ArrayBuffer) {
    const dataView = new DataView(buffer);
    const numFaces = dataView.getUint32(80, true);
    const vertices: number[][] = [];
    const faces: number[][] = [];
    
    let offset = 84;
    for (let i = 0; i < numFaces; i++) {
      if (offset + 50 > buffer.byteLength) break;
      
      const v1x = dataView.getFloat32(offset + 12, true);
      const v1y = dataView.getFloat32(offset + 16, true);
      const v1z = dataView.getFloat32(offset + 20, true);
      
      const v2x = dataView.getFloat32(offset + 24, true);
      const v2y = dataView.getFloat32(offset + 28, true);
      const v2z = dataView.getFloat32(offset + 32, true);
      
      const v3x = dataView.getFloat32(offset + 36, true);
      const v3y = dataView.getFloat32(offset + 40, true);
      const v3z = dataView.getFloat32(offset + 44, true);
      
      vertices.push([v1x, v1y, v1z]);
      vertices.push([v2x, v2y, v2z]);
      vertices.push([v3x, v3y, v3z]);
      
      const vIdx = vertices.length - 3;
      faces.push([vIdx, vIdx + 1, vIdx + 2]);
      offset += 50;
    }
    return { vertices, faces };
  }

  centerAndScaleModel(vertices: number[][], faces: number[][]) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    for (const v of vertices) {
      if (v[0] < minX) minX = v[0]; if (v[0] > maxX) maxX = v[0];
      if (v[1] < minY) minY = v[1]; if (v[1] > maxY) maxY = v[1];
      if (v[2] < minZ) minZ = v[2]; if (v[2] > maxZ) maxZ = v[2];
    }
    
    const dx = maxX - minX;
    const dy = maxY - minY;
    const dz = maxZ - minZ;
    
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const cz = (minZ + maxZ) / 2;
    
    const centeredVerts = vertices.map(v => [v[0] - cx, v[1] - cy, v[2] - cz]);
    const maxDim = Math.max(dx, dy, dz);
    const targetScale = maxDim > 0 ? (35 / maxDim) : 1.0;
    const scaledVerts = centeredVerts.map(v => [v[0] * targetScale, v[1] * targetScale, v[2] * targetScale]);
    
    this.modelVertices = scaledVerts;
    this.modelFaces = faces;
    
    this.modelDimensions.set({
      x: Math.round(dx * 100) / 100,
      y: Math.round(dy * 100) / 100,
      z: Math.round(dz * 100) / 100
    });
    this.modelTriangles.set(faces.length);
    
    // Volumetric slicing estimation
    const bboxVolumeCm3 = (dx * dy * dz) / 1000;
    const calculatedVolume = Math.round(Math.max(0.5, bboxVolumeCm3 * 0.42) * 100) / 100;
    this.modelVolume.set(calculatedVolume);
    this.sourceVolume.set(calculatedVolume);
    this.scaleFactor.set(1.0);
    this.simulationLayer.set(100);
  }

  // --- INTERACTION EVENT BINDINGS ---
  onMouseDown(event: MouseEvent) {
    this.isDragging = true;
    this.previousMouseX = event.clientX;
    this.previousMouseY = event.clientY;
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isDragging) return;
    const deltaX = event.clientX - this.previousMouseX;
    const deltaY = event.clientY - this.previousMouseY;
    
    this.rotationY.update(ry => ry + deltaX * 0.6);
    this.rotationX.update(rx => rx + deltaY * 0.6);
    
    this.previousMouseX = event.clientX;
    this.previousMouseY = event.clientY;
  }

  onMouseUp() {
    this.isDragging = false;
  }

  onSliderXChange(event: Event) {
    this.rotationX.set(parseFloat((event.target as HTMLInputElement).value));
  }

  onSliderYChange(event: Event) {
    this.rotationY.set(parseFloat((event.target as HTMLInputElement).value));
  }
}

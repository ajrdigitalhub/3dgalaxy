import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  effect,
  OnInit,
  HostListener,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { HttpClient } from "@angular/common/http";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { DatastoreService } from "../../services/datastore";
import { SettingsService } from "../../core/services/settings.service";
import { ToastService } from "../../shared/components/toast/toast.service";
import { AppButton } from "../../shared/components/app-button/app-button";
import { ServiceEnquiryService } from "../../core/services/service-enquiry.service";
import { FirebaseStorageService } from "../../core/services/firebase-storage.service";

export interface PreviewColorSwatch {
  name: string;
  hex: string;
  transparent?: boolean;
  opacity?: number;
}

@Component({
  selector: "app-printing-service",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./printing-service.html",
  styleUrl: "./printing-service.scss",
})
export class PrintingService implements OnInit, AfterViewInit, OnDestroy {
  toastService = inject(ToastService);
  ds = inject(DatastoreService);
  settingsService = inject(SettingsService);
  http = inject(HttpClient);
  enquiryService = inject(ServiceEnquiryService);
  fbStorageService = inject(FirebaseStorageService);

  @ViewChild("viewportCanvas") viewportCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild("viewportContainer") viewportContainer!: ElementRef<HTMLDivElement>;

  // Selection states
  selectedFileName = signal<string>("");
  selectedFileSize = signal<string>("");
  rawStlFile = signal<File | null>(null);
  selectedMaterial = signal<string>("PLA");
  selectedColor = signal<string>("White");
  infillPercent = signal<number>(20);
  layerHeight = signal<number>(0.2);
  sourceVolume = signal<number>(0);
  activeConfigTab = signal<"quality" | "material" | "infill" | "quantity">(
    "quality",
  );

  // Searchable dropdown states
  openDropdownId = signal<string | null>(null);
  searchQuery = signal<string>("");

  // Dropdown list configurations loaded from backend API
  serviceConfig = signal<any>(null);

  // Print configuration settings
  supportType = signal<string>("None");
  buildPlateAdhesion = signal<string>("None");
  nozzleSize = signal<string>("0.4 mm");
  layerHeightText = signal<string>("0.20 mm");
  printSpeed = signal<string>("Normal");
  wallCount = signal<string>("2");
  topLayers = signal<string>("3");
  bottomLayers = signal<string>("3");
  fillPattern = signal<string>("Grid");
  surfaceFinish = signal<string>("Matte");
  deliveryPriority = signal<string>("Standard");
  quantity = signal<number>(1);

  // Upload states
  uploading = signal<boolean>(false);
  uploadProgress = signal<number | null>(null);

  // Customer details
  custName = signal<string>("Sumit Sharma");
  custPhone = signal<string>("9876543210");
  custEmail = signal<string>("sumit@3dgalaxy.co.in");
  notesText = signal<string>("");

  // 3D Viewport states
  showGrid = signal<boolean>(true);
  showBoundingBox = signal<boolean>(true);
  showAxes = signal<boolean>(true);
  isFullscreen = signal<boolean>(false);
  visualMode = signal<"solid" | "wireframe" | "vertices">("solid");

  // Material Swatches for Preview (Purely visual)
  previewColors: PreviewColorSwatch[] = [
    { name: "Matte Gray", hex: "#d4d4d8" },
    { name: "Studio White", hex: "#f8fafc" },
    { name: "Stealth Black", hex: "#1e293b" },
    { name: "PLA Orange", hex: "#f97316" },
    { name: "PLA Red", hex: "#ef4444" },
    { name: "PLA Blue", hex: "#3b82f6" },
    { name: "PETG Clear", hex: "#0891b2", transparent: true, opacity: 0.65 },
    { name: "Resin Gray", hex: "#64748b" },
  ];
  selectedPreviewColor = signal<string>("#d4d4d8");

  // Telemetry & Mesh Health Analysis
  modelDimensions = signal<{ x: number; y: number; z: number }>({
    x: 0,
    y: 0,
    z: 0,
  });
  modelTriangles = signal<number>(0);
  modelVerticesCount = signal<number>(0);
  modelVolume = signal<number>(0);
  modelSurfaceArea = signal<number>(0);

  meshWarnings = signal<string[]>([]);
  meshIsHealthy = signal<boolean>(true);

  // Three.js Core Instances
  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;

  currentMesh?: THREE.Mesh;
  edgesLine?: THREE.LineSegments;
  pointsCloud?: THREE.Points;
  gridHelper?: THREE.GridHelper;
  buildVolumeLine?: THREE.LineSegments;
  axesHelper?: THREE.AxesHelper;
  private ambientLightNode?: THREE.AmbientLight;
  private hemiLightNode?: THREE.HemisphereLight;
  private dirLightNode?: THREE.DirectionalLight;
  private fillLightNode?: THREE.DirectionalLight;

  private loadedGeometry?: THREE.BufferGeometry;
  private uploadedRawBuffer?: ArrayBuffer;
  private animationFrameId?: number;

  // Dynamic lists from serviceConfig computed
  materials = computed(() => this.serviceConfig()?.materials || []);
  qualities = computed(() => this.serviceConfig()?.qualities || []);
  selectedQualityName = computed(() => {
    const activeHeight = this.layerHeight();
    const qualitiesList = this.qualities();
    const matched = qualitiesList.find((q: any) => q.height === activeHeight);
    return matched ? matched.name : "Select Quality";
  });
  defaultHexMap: Record<string, string> = {
    white: "#ffffff",
    black: "#000000",
    red: "#ef4444",
    blue: "#3b82f6",
    green: "#22c55e",
    yellow: "#eab308",
    orange: "#f97316",
    purple: "#a855f7",
    silver: "#cbd5e1",
    gold: "#fbbf24",
    grey: "#6b7280",
    pink: "#ec4899",
    brown: "#78350f",
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
      if (typeof c === "string") {
        const lower = c.toLowerCase();
        return { name: c, hex: this.defaultHexMap[lower] || "#3b82f6" };
      }
      return c;
    });
  });

  infillStandards = computed(() => {
    return (
      this.serviceConfig()?.infillStandards || [
        { name: "10 - 30%", desc: "Standard", min: 10, max: 30, default: 20 },
        { name: "31 - 50%", desc: "Medium", min: 31, max: 50, default: 40 },
        { name: "51 - 80%", desc: "Strong", min: 51, max: 80, default: 60 },
      ]
    );
  });

  isInfillActive(inf: any): boolean {
    const infVal = this.infillPercent();
    return infVal >= inf.min && infVal <= inf.max;
  }

  isColorDark(hex: string): boolean {
    const rgb = this.hexToRgb(hex);
    const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return yiq < 128;
  }

  supports = computed(() => this.serviceConfig()?.supports || []);
  fillPatterns = computed(() => this.serviceConfig()?.fillPatterns || []);
  adhesionTypes = computed(() => this.serviceConfig()?.adhesionTypes || []);
  layerHeights = computed(() => this.serviceConfig()?.layerHeights || []);
  printSpeeds = computed(() => this.serviceConfig()?.printSpeeds || []);
  nozzleSizes = computed(() => this.serviceConfig()?.nozzleSizes || []);
  wallCounts = computed(() => this.serviceConfig()?.wallCounts || []);
  deliveryPriorities = computed(
    () => this.serviceConfig()?.deliveryPriorities || [],
  );
  infillOptions = computed(() => this.serviceConfig()?.infillOptions || []);
  surfaceFinishes = computed(() => this.serviceConfig()?.surfaceFinishes || []);

  // Step Indicators
  step1Active = computed(() => !!this.selectedFileName());
  step2Active = computed(() => this.step1Active() && !!this.layerHeight());
  step3Active = computed(() => this.step2Active() && !!this.selectedMaterial());
  step4Active = computed(() => this.step3Active() && this.infillPercent() > 0);
  step5Active = computed(
    () => this.step4Active() && !!this.estimatedReport().totalCost,
  );
  step6Active = computed(() => {
    const quotes = this.customerQuotes();
    return quotes.some(
      (q) => q.status === "approved_by_customer" || q.status === "completed",
    );
  });

  constructor() {
    const u = this.ds.activeUser();
    if (u) {
      this.custName.set(u.name);
      this.custPhone.set(u.phone || "");
      this.custEmail.set(u.email);
    }

    // Effect to auto-save selected options locally
    effect(() => {
      if (typeof window === "undefined") return;
      localStorage.setItem("3dg_slicer_material", this.selectedMaterial());
      localStorage.setItem("3dg_slicer_color", this.selectedColor());
      localStorage.setItem("3dg_slicer_infill", String(this.infillPercent()));
      localStorage.setItem("3dg_slicer_layer_height", this.layerHeightText());
      localStorage.setItem("3dg_slicer_quality", String(this.layerHeight()));
      localStorage.setItem("3dg_slicer_support", this.supportType());
      localStorage.setItem("3dg_slicer_adhesion", this.buildPlateAdhesion());
      localStorage.setItem("3dg_slicer_nozzle", this.nozzleSize());
      localStorage.setItem("3dg_slicer_speed", this.printSpeed());
      localStorage.setItem("3dg_slicer_walls", this.wallCount());
      localStorage.setItem("3dg_slicer_top_layers", this.topLayers());
      localStorage.setItem("3dg_slicer_bottom_layers", this.bottomLayers());
      localStorage.setItem("3dg_slicer_pattern", this.fillPattern());
      localStorage.setItem("3dg_slicer_finish", this.surfaceFinish());
      localStorage.setItem("3dg_slicer_priority", this.deliveryPriority());
      localStorage.setItem("3dg_slicer_quantity", String(this.quantity()));
      localStorage.setItem("3dg_slicer_notes", this.notesText());
    });
  }

  ngOnInit() {
    this.loadServiceConfig();
    this.restoreOptionsFromLocal();
  }

  ngAfterViewInit() {
    if (this.viewportCanvas) {
      this.initThreeViewport(this.viewportCanvas.nativeElement);
    }
  }

  ngOnDestroy() {
    this.destroyThree();
  }

  @HostListener("window:resize")
  onWindowResize() {
    if (this.renderer && this.camera && this.viewportCanvas) {
      const canvas = this.viewportCanvas.nativeElement;
      const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 640;
      const height = canvas.clientHeight || canvas.parentElement?.clientHeight || 400;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height, false);
    }
  }

  loadServiceConfig() {
    this.http.get<any>("/api/service-config").subscribe({
      next: (cfg) => {
        const normalizedCfg =
          cfg?.data && typeof cfg.data === "object" ? cfg.data : cfg;
        this.serviceConfig.set(normalizedCfg || {});

        if (
          !localStorage.getItem("3dg_slicer_material") &&
          normalizedCfg.materials?.length > 0
        ) {
          this.selectedMaterial.set(normalizedCfg.materials[0].name);
        }
        if (
          !localStorage.getItem("3dg_slicer_color") &&
          normalizedCfg.colors?.length > 0
        ) {
          this.selectedColor.set(normalizedCfg.colors[0]);
        }
      },
      error: (err) => {
        console.error("Failed to load printing service configuration", err);
      },
    });
  }

  restoreOptionsFromLocal() {
    if (typeof window === "undefined") return;
    const material = localStorage.getItem("3dg_slicer_material");
    if (material) this.selectedMaterial.set(material);

    const color = localStorage.getItem("3dg_slicer_color");
    if (color) this.selectedColor.set(color);

    const infill = localStorage.getItem("3dg_slicer_infill");
    if (infill) this.infillPercent.set(Number(infill));

    const layerHeightText = localStorage.getItem("3dg_slicer_layer_height");
    if (layerHeightText) this.layerHeightText.set(layerHeightText);

    const quality = localStorage.getItem("3dg_slicer_quality");
    if (quality) this.layerHeight.set(Number(quality));

    const support = localStorage.getItem("3dg_slicer_support");
    if (support) this.supportType.set(support);

    const adhesion = localStorage.getItem("3dg_slicer_adhesion");
    if (adhesion) this.buildPlateAdhesion.set(adhesion);

    const nozzle = localStorage.getItem("3dg_slicer_nozzle");
    if (nozzle) this.nozzleSize.set(nozzle);

    const speed = localStorage.getItem("3dg_slicer_speed");
    if (speed) this.printSpeed.set(speed);

    const walls = localStorage.getItem("3dg_slicer_walls");
    if (walls) this.wallCount.set(walls);

    const topLayers = localStorage.getItem("3dg_slicer_top_layers");
    if (topLayers) this.topLayers.set(topLayers);

    const bottomLayers = localStorage.getItem("3dg_slicer_bottom_layers");
    if (bottomLayers) this.bottomLayers.set(bottomLayers);

    const pattern = localStorage.getItem("3dg_slicer_pattern");
    if (pattern) this.fillPattern.set(pattern);

    const finish = localStorage.getItem("3dg_slicer_finish");
    if (finish) this.surfaceFinish.set(finish);

    const priority = localStorage.getItem("3dg_slicer_priority");
    if (priority) this.deliveryPriority.set(priority);

    const qty = localStorage.getItem("3dg_slicer_quantity");
    if (qty) this.quantity.set(Number(qty));

    const notes = localStorage.getItem("3dg_slicer_notes");
    if (notes) this.notesText.set(notes);
  }

  // Cost estimation details
  estimatedReport = computed(() => {
    const cfg = this.serviceConfig() || {};
    const materialsList = cfg.materials || [];
    const qualitiesList = cfg.qualities || [];

    const activeMatName = this.selectedMaterial();
    const mat = materialsList.find((m: any) => m.name === activeMatName) || {
      pricePerGram: 2.5,
      density: 1.25,
    };
    const density = mat.density || 1.25;
    const pricePerGram = mat.pricePerGram || 2.5;

    const activeQualityHeight = this.layerHeight();
    const qual = qualitiesList.find(
      (q: any) => q.height === activeQualityHeight,
    ) || { price: 50 };
    const qualityPrice = qual.price !== undefined ? qual.price : 50;

    const machineRate =
      cfg.machineFeePerHour !== undefined ? cfg.machineFeePerHour : 150;
    const setupCost = cfg.setupCost !== undefined ? cfg.setupCost : 100;

    const volume = this.sourceVolume();
    const infillVal = this.infillPercent();
    const infillFactor = (20 + infillVal * 0.8) / 100;

    const estimatedWeight =
      Math.round(volume * density * infillFactor * 10) / 10;
    const materialCost = Math.round(estimatedWeight * pricePerGram);

    const speed = this.printSpeed();
    let speedFactor = 1.0;
    if (speed === "Slow") speedFactor = 1.5;
    else if (speed === "Fast") speedFactor = 0.7;
    else if (speed === "Ultra Fast") speedFactor = 0.5;

    const layerHeightVal =
      Number(this.layerHeightText().replace(" mm", "")) || 0.2;
    const heightFactor = 0.2 / Math.max(0.04, layerHeightVal);

    const baseHours = volume * 0.08;
    const estimatedHours =
      Math.round(
        Math.max(1, baseHours * heightFactor * speedFactor * infillFactor) * 10,
      ) / 10;

    const machineFee = Math.round(estimatedHours * machineRate);
    const printingCost = machineFee + qualityPrice;

    const qty = this.quantity();
    const subtotal = (materialCost + printingCost + setupCost) * qty;

    const shippingThreshold =
      this.settingsService.shippingSettings()?.freeShippingMinSpent || 3000;
    const shippingFee = subtotal >= shippingThreshold ? 0 : 120;
    const totalCost = subtotal + shippingFee;

    return {
      weightGrams: estimatedWeight,
      hours: estimatedHours,
      materialCost: materialCost * qty,
      printingCost: printingCost * qty,
      setupCost: setupCost * qty,
      shipping: shippingFee,
      totalCost: totalCost,
    };
  });

  customerQuotes = computed(() => {
    return this.ds.quotes().filter((q) => q.customerEmail === this.custEmail());
  });

  // --- STRICT STL FILE UPLOAD & VALIDATION ---
  onFileDropped(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const ext = file.name.split(".").pop()?.toLowerCase();

      // STRICT REQUIREMENT: Support ONLY STL (.stl) files alone!
      if (ext !== "stl") {
        this.toastService.error(
          "Unsupported format! Only STL (.stl) files are supported in this studio.",
        );
        input.value = "";
        return;
      }

      const maxSizeMb = this.serviceConfig()?.maxFileSizeMB || 50;
      if (file.size > maxSizeMb * 1024 * 1024) {
        this.toastService.error(
          `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of ${maxSizeMb}MB.`,
        );
        input.value = "";
        return;
      }

      this.simulateFileUpload(file);
    }
  }

  simulateFileUpload(file: File) {
    this.rawStlFile.set(file);
    this.uploading.set(true);
    this.uploadProgress.set(0);

    const intervalTime = 12;
    let currentProgress = 0;

    const interval = setInterval(() => {
      currentProgress += 4;
      this.uploadProgress.set(Math.min(100, currentProgress));

      if (currentProgress >= 100) {
        clearInterval(interval);
        this.uploading.set(false);
        this.uploadProgress.set(null);

        this.selectedFileName.set(file.name);
        const sizeMb = Math.round((file.size / (1024 * 1024)) * 10) / 10;
        this.selectedFileSize.set(`${sizeMb} MB`);

        this.parseSTLFile(file);
      }
    }, intervalTime);
  }

  clearFile() {
    this.selectedFileName.set("");
    this.selectedFileSize.set("");
    this.sourceVolume.set(0);
    this.modelDimensions.set({ x: 0, y: 0, z: 0 });
    this.modelTriangles.set(0);
    this.modelVerticesCount.set(0);
    this.modelVolume.set(0);
    this.modelSurfaceArea.set(0);
    this.meshWarnings.set([]);
    this.meshIsHealthy.set(true);
    this.loadedGeometry = undefined;
    this.uploadedRawBuffer = undefined;

    if (this.currentMesh && this.scene) {
      this.scene.remove(this.currentMesh);
      if (this.currentMesh.geometry) this.currentMesh.geometry.dispose();
      this.currentMesh = undefined;
    }
    if (this.edgesLine && this.scene) {
      this.scene.remove(this.edgesLine);
      this.edgesLine.geometry.dispose();
      this.edgesLine = undefined;
    }
    if (this.pointsCloud && this.scene) {
      this.scene.remove(this.pointsCloud);
      this.pointsCloud.geometry.dispose();
      this.pointsCloud = undefined;
    }
  }

  // --- HIGH-QUALITY THREE.JS STL RENDERER & GEOMETRY PROCESSING ---
  initThreeViewport(canvas: HTMLCanvasElement) {
    if (!canvas) return;

    const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 640;
    const height = canvas.clientHeight || canvas.parentElement?.clientHeight || 400;

    // 1. Scene
    this.scene = new THREE.Scene();
    const isDark = this.isDarkTheme();
    this.scene.background = new THREE.Color(isDark ? 0x0f172a : 0xf8fafc);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    this.camera.position.set(180, 220, 260);

    // 3. Renderer (WebGL 2.0 with ACES Filmic Tone Mapping & Anti-Aliasing)
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // 4. Orbit Controls (Rotate, Pan, Zoom, Screen Space Panning)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 1000;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.05; // Lock camera from going below build plate

    // 5. Physically Correct Studio Lighting (Hemisphere + Key + Fill + Ambient)
    this.ambientLightNode = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(this.ambientLightNode);

    this.hemiLightNode = new THREE.HemisphereLight(0xffffff, 0x333333, 0.65);
    this.hemiLightNode.position.set(0, 200, 0);
    this.scene.add(this.hemiLightNode);

    this.dirLightNode = new THREE.DirectionalLight(0xffffff, 1.2);
    this.dirLightNode.position.set(150, 250, 150);
    this.dirLightNode.castShadow = true;
    this.dirLightNode.shadow.mapSize.width = 2048;
    this.dirLightNode.shadow.mapSize.height = 2048;
    this.dirLightNode.shadow.camera.near = 0.5;
    this.dirLightNode.shadow.camera.far = 1000;
    this.dirLightNode.shadow.bias = -0.0001;
    this.scene.add(this.dirLightNode);

    this.fillLightNode = new THREE.DirectionalLight(0x90b0ff, 0.45);
    this.fillLightNode.position.set(-150, 100, -150);
    this.scene.add(this.fillLightNode);

    // 6. Build Plate & Grid Helper (256mm x 256mm build volume)
    const bedSize = 256;
    this.gridHelper = new THREE.GridHelper(
      bedSize,
      32,
      new THREE.Color(0x3b82f6),
      new THREE.Color(isDark ? 0x334155 : 0xcbd5e1)
    );
    this.gridHelper.position.y = 0;
    this.scene.add(this.gridHelper);

    // Bounding Box Envelope (256x256x256 build envelope)
    const bedBoxGeom = new THREE.BoxGeometry(bedSize, bedSize, bedSize);
    const bedBoxEdges = new THREE.EdgesGeometry(bedBoxGeom);
    const bedBoxMat = new THREE.LineDashedMaterial({
      color: 0x3b82f6,
      dashSize: 4,
      gapSize: 4,
      opacity: 0.3,
      transparent: true,
    });
    this.buildVolumeLine = new THREE.LineSegments(bedBoxEdges, bedBoxMat);
    this.buildVolumeLine.computeLineDistances();
    this.buildVolumeLine.position.y = bedSize / 2;
    this.scene.add(this.buildVolumeLine);

    // Origin Axes Helper
    this.axesHelper = new THREE.AxesHelper(35);
    this.axesHelper.position.set(-bedSize / 2, 0.1, -bedSize / 2);
    this.scene.add(this.axesHelper);

    // 7. Render Loop
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      if (this.controls) this.controls.update();
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    animate();

    // Re-render loaded geometry if canvas initialized after file parse
    if (this.loadedGeometry) {
      this.displayGeometryInScene(this.loadedGeometry);
    }
  }

  parseSTLFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const buffer = e.target.result as ArrayBuffer;
      this.uploadedRawBuffer = buffer;

      try {
        const loader = new STLLoader();
        let geometry: THREE.BufferGeometry;

        try {
          geometry = loader.parse(buffer);
        } catch (err) {
          // ASCII STL Fallback Parser
          const text = new TextDecoder("utf-8").decode(buffer);
          const asciiRes = this.parseAsciiSTL(text);
          if (asciiRes && asciiRes.vertices.length > 0) {
            geometry = this.buildBufferGeometry(asciiRes.vertices);
          } else {
            throw err;
          }
        }

        if (
          geometry &&
          geometry.attributes["position"] &&
          geometry.attributes["position"].count > 0
        ) {
          this.processLoadedSTL(geometry, file);
        } else {
          this.toastService.error("Could not parse 3D mesh geometry from STL file.");
        }
      } catch (err) {
        console.error("STL parsing error:", err);
        this.toastService.error("Failed to parse STL file. Geometry may be corrupted.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  processLoadedSTL(geometry: THREE.BufferGeometry, file: File) {
    // 1. Compute smooth vertex normals for PBR shading
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();

    // 2. Auto-center model
    geometry.center();

    // 3. Place bottom of model directly on the build plate (Y = 0)
    const box = geometry.boundingBox!;
    const minY = box.min.y;
    geometry.translate(0, -minY, 0);
    geometry.computeBoundingBox();

    this.loadedGeometry = geometry;

    // 4. Calculate Dimensions & Mesh Statistics
    const size = new THREE.Vector3();
    geometry.boundingBox!.getSize(size);
    const dx = Math.round(size.x * 100) / 100;
    const dy = Math.round(size.z * 100) / 100; // Z is depth in STL space
    const dz = Math.round(size.y * 100) / 100; // Y is height in Three.js

    const triangleCount = geometry.index
      ? geometry.index.count / 3
      : geometry.attributes["position"].count / 3;
    const vertexCount = geometry.attributes["position"].count;

    const { volCm3, areaCm2 } = this.calculateMeshVolumeAndArea(geometry);

    this.modelDimensions.set({ x: dx, y: dy, z: dz });
    this.modelTriangles.set(triangleCount);
    this.modelVerticesCount.set(vertexCount);
    this.modelVolume.set(volCm3);
    this.modelSurfaceArea.set(areaCm2);
    this.sourceVolume.set(volCm3);

    // 5. Mesh Health Analysis Diagnostics
    this.runMeshDiagnostics(dx, dy, dz, volCm3, triangleCount, vertexCount);

    // 6. Display in Three.js Studio Scene
    if (!this.renderer && this.viewportCanvas) {
      this.initThreeViewport(this.viewportCanvas.nativeElement);
    } else if (this.loadedGeometry) {
      this.displayGeometryInScene(this.loadedGeometry);
    }

    this.toastService.success(
      `Loaded STL model "${file.name}" (${triangleCount.toLocaleString()} triangles)`,
    );
  }

  calculateMeshVolumeAndArea(geometry: THREE.BufferGeometry) {
    const pos = geometry.attributes["position"];
    let volume = 0;
    let area = 0;

    const p1 = new THREE.Vector3();
    const p2 = new THREE.Vector3();
    const p3 = new THREE.Vector3();
    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    const v3 = new THREE.Vector3();

    const numTriangles = pos.count / 3;
    for (let i = 0; i < numTriangles; i++) {
      p1.fromBufferAttribute(pos, i * 3);
      p2.fromBufferAttribute(pos, i * 3 + 1);
      p3.fromBufferAttribute(pos, i * 3 + 2);

      // Volume of tetrahedron formed with origin
      v3.crossVectors(p2, p3);
      volume += p1.dot(v3) / 6.0;

      // Surface area of triangle facet
      v1.subVectors(p2, p1);
      v2.subVectors(p3, p1);
      v3.crossVectors(v1, v2);
      area += v3.length() / 2.0;
    }

    const volCm3 = Math.max(0.1, Math.round((Math.abs(volume) / 1000) * 100) / 100);
    const areaCm2 = Math.round((area / 100) * 100) / 100;

    return { volCm3, areaCm2 };
  }

  runMeshDiagnostics(
    dx: number,
    dy: number,
    dz: number,
    volCm3: number,
    triangles: number,
    vertices: number,
  ) {
    const warnings: string[] = [];

    if (dx > 256 || dy > 256 || dz > 256) {
      warnings.push(`Model dimensions (${dx}×${dy}×${dz} mm) exceed build plate volume (256×256×256 mm).`);
    }
    if (volCm3 <= 0.05) {
      warnings.push("Extremely low volume or zero-thickness mesh detected.");
    }
    if (Math.min(dx, dy, dz) < 0.8) {
      warnings.push("Thin wall structures (< 0.8mm) detected. Parts may be fragile.");
    }
    if (triangles > 800000) {
      warnings.push("High poly count (> 800k facets). Slicing calculation time may increase.");
    }

    this.meshWarnings.set(warnings);
    this.meshIsHealthy.set(warnings.length === 0);
  }

  displayGeometryInScene(geometry: THREE.BufferGeometry) {
    if (!this.scene) return;

    // Remove previous mesh elements
    if (this.currentMesh) {
      this.scene.remove(this.currentMesh);
      if (this.currentMesh.geometry) this.currentMesh.geometry.dispose();
      this.currentMesh = undefined;
    }
    if (this.edgesLine) {
      this.scene.remove(this.edgesLine);
      this.edgesLine.geometry.dispose();
      this.edgesLine = undefined;
    }
    if (this.pointsCloud) {
      this.scene.remove(this.pointsCloud);
      this.pointsCloud.geometry.dispose();
      this.pointsCloud = undefined;
    }

    // Material setup from Swatches
    const activeColorObj =
      this.previewColors.find((c) => c.hex === this.selectedPreviewColor()) ||
      this.previewColors[0];
    const isTrans = activeColorObj.transparent || false;
    const opacityVal = activeColorObj.opacity || 1.0;

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(activeColorObj.hex),
      roughness: 0.55,
      metalness: 0.08,
      flatShading: false,
      transparent: isTrans,
      opacity: opacityVal,
      side: THREE.DoubleSide,
    });

    this.currentMesh = new THREE.Mesh(geometry, material);
    this.currentMesh.castShadow = true;
    this.currentMesh.receiveShadow = true;
    this.scene.add(this.currentMesh);

    // Edge Highlight Line Segments for sharp CAD detail clarity
    const edgesGeom = new THREE.EdgesGeometry(geometry, 25);
    const edgesMat = new THREE.LineBasicMaterial({
      color: 0x3b82f6,
      linewidth: 1,
      opacity: 0.35,
      transparent: true,
    });
    this.edgesLine = new THREE.LineSegments(edgesGeom, edgesMat);
    this.scene.add(this.edgesLine);

    // Apply active visual mode
    this.applyVisualMode();

    // Auto-fit camera
    this.fitCameraToModel();
  }

  applyVisualMode() {
    if (!this.currentMesh) return;

    const mode = this.visualMode();
    if (mode === "solid") {
      this.currentMesh.visible = true;
      (this.currentMesh.material as THREE.MeshStandardMaterial).wireframe = false;
      if (this.edgesLine) this.edgesLine.visible = true;
      if (this.pointsCloud) this.pointsCloud.visible = false;
    } else if (mode === "wireframe") {
      this.currentMesh.visible = true;
      (this.currentMesh.material as THREE.MeshStandardMaterial).wireframe = true;
      if (this.edgesLine) this.edgesLine.visible = false;
      if (this.pointsCloud) this.pointsCloud.visible = false;
    } else if (mode === "vertices") {
      this.currentMesh.visible = false;
      if (this.edgesLine) this.edgesLine.visible = false;

      if (!this.pointsCloud && this.loadedGeometry && this.scene) {
        const pMat = new THREE.PointsMaterial({
          color: 0x3b82f6,
          size: 2,
          sizeAttenuation: true,
        });
        this.pointsCloud = new THREE.Points(this.loadedGeometry, pMat);
        this.scene.add(this.pointsCloud);
      }
      if (this.pointsCloud) this.pointsCloud.visible = true;
    }
  }

  setPreviewColor(hex: string) {
    this.selectedPreviewColor.set(hex);
    if (this.currentMesh) {
      const activeColorObj =
        this.previewColors.find((c) => c.hex === hex) || this.previewColors[0];
      const mat = this.currentMesh.material as THREE.MeshStandardMaterial;
      mat.color.setHex(parseInt(hex.replace("#", ""), 16));
      mat.transparent = activeColorObj.transparent || false;
      mat.opacity = activeColorObj.opacity || 1.0;
      mat.needsUpdate = true;
    }
  }

  fitCameraToModel() {
    if (!this.camera || !this.controls || !this.currentMesh) return;

    const boundingBox = new THREE.Box3().setFromObject(this.currentMesh);
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    const size = new THREE.Vector3();
    boundingBox.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 2.2;

    cameraZ = Math.max(cameraZ, 80);

    const targetPos = new THREE.Vector3(
      center.x + cameraZ * 0.75,
      center.y + cameraZ * 0.85,
      center.z + cameraZ * 1.15,
    );

    this.camera.position.copy(targetPos);
    this.camera.lookAt(center);
    this.controls.target.copy(center);
    this.controls.update();
  }

  resetCameraView() {
    if (this.camera && this.controls) {
      if (this.currentMesh) {
        this.fitCameraToModel();
      } else {
        this.camera.position.set(180, 220, 260);
        this.controls.target.set(0, 50, 0);
        this.controls.update();
      }
    }
  }

  toggleFullscreen() {
    if (!this.viewportContainer) return;
    const container = this.viewportContainer.nativeElement;
    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        this.isFullscreen.set(true);
        setTimeout(() => this.onWindowResize(), 100);
      }).catch(err => console.warn(err));
    } else {
      document.exitFullscreen().then(() => {
        this.isFullscreen.set(false);
        setTimeout(() => this.onWindowResize(), 100);
      }).catch(err => console.warn(err));
    }
  }

  downloadCurrentSTL() {
    if (!this.uploadedRawBuffer || !this.selectedFileName()) {
      this.toastService.error("No STL file available to download.");
      return;
    }

    const blob = new Blob([this.uploadedRawBuffer], {
      type: "model/stl",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = this.selectedFileName();
    a.click();
    URL.revokeObjectURL(url);
    this.toastService.success(`Downloaded "${this.selectedFileName()}"`);
  }

  parseAsciiSTL(text: string) {
    const vertices: number[][] = [];
    const vertRegex = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/gi;
    let match;

    while ((match = vertRegex.exec(text)) !== null) {
      const x = parseFloat(match[1]);
      const y = parseFloat(match[2]);
      const z = parseFloat(match[3]);
      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
        vertices.push([x, y, z]);
      }
    }

    const faces: number[][] = [];
    for (let i = 0; i < vertices.length; i += 3) {
      if (i + 2 < vertices.length) {
        faces.push([i, i + 1, i + 2]);
      }
    }

    return { vertices, faces };
  }

  buildBufferGeometry(vertices: number[][]): THREE.BufferGeometry {
    const geom = new THREE.BufferGeometry();
    const flatVerts = new Float32Array(vertices.length * 3);

    for (let i = 0; i < vertices.length; i++) {
      flatVerts[i * 3] = vertices[i][0];
      flatVerts[i * 3 + 1] = vertices[i][1];
      flatVerts[i * 3 + 2] = vertices[i][2];
    }

    geom.setAttribute("position", new THREE.BufferAttribute(flatVerts, 3));
    geom.computeVertexNormals();
    return geom;
  }

  destroyThree() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.controls) {
      this.controls.dispose();
      this.controls = undefined;
    }
    if (this.currentMesh && this.scene) {
      this.scene.remove(this.currentMesh);
      if (this.currentMesh.geometry) this.currentMesh.geometry.dispose();
      if (Array.isArray(this.currentMesh.material)) {
        this.currentMesh.material.forEach((m) => m.dispose());
      } else if (this.currentMesh.material) {
        this.currentMesh.material.dispose();
      }
      this.currentMesh = undefined;
    }
    if (this.edgesLine && this.scene) {
      this.scene.remove(this.edgesLine);
      this.edgesLine.geometry.dispose();
      this.edgesLine = undefined;
    }
    if (this.pointsCloud && this.scene) {
      this.scene.remove(this.pointsCloud);
      this.pointsCloud.geometry.dispose();
      this.pointsCloud = undefined;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = undefined;
    }
    this.scene = undefined;
    this.camera = undefined;
  }

  hexToRgb(hex: string): { r: number; g: number; b: number } {
    let cleanHex = hex.replace("#", "");
    if (cleanHex.length === 3) {
      cleanHex = cleanHex
        .split("")
        .map((char) => char + char)
        .join("");
    }
    const num = parseInt(cleanHex, 16) || 0;
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }

  isDarkTheme(): boolean {
    if (typeof document !== "undefined") {
      return document.body.classList.contains("dark");
    }
    return false;
  }

  toggleDropdown(id: string, event?: Event) {
    if (event) event.stopPropagation();
    this.openDropdownId.update((current) => (current === id ? null : id));
    this.searchQuery.set("");
  }

  isDropdownOpen(id: string): boolean {
    return this.openDropdownId() === id;
  }

  selectOption(id: string, val: any) {
    if (id === "material") {
      this.selectedMaterial.set(val);
      setTimeout(() => {
        const currentColors = this.colors();
        const hasColor = currentColors.some(
          (c) => c.name === this.selectedColor(),
        );
        if (currentColors.length > 0 && !hasColor) {
          this.selectedColor.set(currentColors[0].name);
        }
      }, 50);
    } else if (id === "quality") {
      this.layerHeight.set(val.height);
      this.layerHeightText.set(`${val.height} mm`);
    } else if (id === "infill") {
      const num = parseInt(val.replace("%", ""), 10);
      this.infillPercent.set(num);
    } else if (id === "infill_standard") {
      this.infillPercent.set(val.default);
    } else if (id === "support") {
      this.supportType.set(val);
    } else if (id === "adhesion") {
      this.buildPlateAdhesion.set(val);
    } else if (id === "nozzle") {
      this.nozzleSize.set(val);
    } else if (id === "layerHeight") {
      this.layerHeightText.set(val);
    } else if (id === "speed") {
      this.printSpeed.set(val);
    } else if (id === "walls") {
      this.wallCount.set(val);
    } else if (id === "topLayers") {
      this.topLayers.set(val);
    } else if (id === "bottomLayers") {
      this.bottomLayers.set(val);
    } else if (id === "pattern") {
      this.fillPattern.set(val);
    } else if (id === "color") {
      this.selectedColor.set(val);
    } else if (id === "finish") {
      this.surfaceFinish.set(val);
    } else if (id === "priority") {
      this.deliveryPriority.set(val);
    }
    this.openDropdownId.set(null);
  }

  getFilteredOptions(id: string, options: any[]): any[] {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return options;
    return options.filter((opt) => {
      const name = typeof opt === "string" ? opt : opt.name || "";
      return name.toLowerCase().includes(query);
    });
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest(".dropdown-container")) {
      this.openDropdownId.set(null);
    }
  }

  incrementQty() {
    this.quantity.update((q) => q + 1);
  }

  decrementQty() {
    this.quantity.update((q) => Math.max(1, q - 1));
  }

  quotes = signal<any[]>([]);
  isSubmitting = signal<boolean>(false);

  getQuoteStatusClass(status: string): string {
    switch (status) {
      case "approved_by_customer":
      case "completed":
        return "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-500 border border-red-500/20";
      case "quoted":
        return "bg-blue-500/10 text-blue-500 border border-blue-500/20";
      default:
        return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
    }
  }

  async submitQuotation() {
    await this.submitQuoteRequest();
  }

  async createQuote(payload: any) {
    const newQuote = {
      id: "Q-" + Math.floor(100000 + Math.random() * 900000),
      createdAt: new Date().toISOString(),
      status: "pending",
      ...payload,
    };
    this.quotes.update((list) => [newQuote, ...list]);
    if (typeof window !== "undefined") {
      localStorage.setItem("3dg_quotes", JSON.stringify(this.quotes()));
    }
    return newQuote;
  }

  showSuccessModal = signal<boolean>(false);
  submittedEnquiry = signal<any>(null);

  async submitQuoteRequest() {
    if (!this.selectedFileName()) {
      this.toastService.error("Please upload an STL model first.");
      return;
    }

    this.isSubmitting.set(true);
    const user = this.ds.activeUser();
    const stlFile = this.rawStlFile();

    const postEnquiry = (fileBase64: string) => {
      const payload = {
        userId: (user as any)?.id || null,
        customerName: this.custName() || user?.name || "Valued Customer",
        customerPhone: this.custPhone() || user?.phone || "",
        customerEmail: this.custEmail() || user?.email || "customer@example.com",
        modelName: this.selectedFileName(),
        fileSize: this.selectedFileSize(),
        fileBase64,
        material: this.selectedMaterial(),
        color: this.selectedColor(),
        infillPercent: this.infillPercent(),
        layerHeight: this.layerHeightText(),
        nozzleSize: this.nozzleSize(),
        supportType: this.supportType(),
        buildPlateAdhesion: this.buildPlateAdhesion(),
        printSpeed: this.printSpeed(),
        surfaceFinish: this.surfaceFinish(),
        quantity: this.quantity(),
        dimensions: this.modelDimensions(),
        volumeCm3: this.modelVolume(),
        surfaceAreaCm2: this.modelSurfaceArea(),
        weightGrams: this.estimatedReport().weightGrams,
        triangleCount: this.modelTriangles(),
        estimatedHours: this.estimatedReport().hours,
        notes: this.notesText(),
      };

      this.enquiryService.submitEnquiry(payload).subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          const enquiry = res.data;
          this.submittedEnquiry.set(enquiry);
          this.showSuccessModal.set(true);
          this.toastService.success(`Quotation Request Submitted! Order #: ${enquiry.orderId || enquiry.id}`);
          this.createQuote(enquiry);
        },
        error: () => {
          this.isSubmitting.set(false);
          this.toastService.error("Failed to submit request to server.");
        },
      });
    };

    if (stlFile) {
      const reader = new FileReader();
      reader.onload = () => {
        postEnquiry(reader.result as string);
      };
      reader.readAsDataURL(stlFile);
    } else {
      postEnquiry("");
    }
  }

  copyText(text: string, label: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      this.toastService.success(`${label} copied to clipboard!`);
    }
  }

  closeSuccessModal() {
    this.showSuccessModal.set(false);
  }

  goToTracking(trackingNumber: string) {
    this.showSuccessModal.set(false);
    window.location.href = `/track-service?query=${encodeURIComponent(trackingNumber)}`;
  }

  goToAccountRequests() {
    this.showSuccessModal.set(false);
    window.location.href = `/account?tab=service_requests`;
  }

  async approveQuote(quoteId: string) {
    try {
      this.quotes.update((list) =>
        list.map((q) =>
          q.id === quoteId ? { ...q, status: "approved_by_customer" } : q,
        ),
      );
      if (typeof window !== "undefined") {
        localStorage.setItem("3dg_quotes", JSON.stringify(this.quotes()));
      }
      this.toastService.success("Quote approved! Proceeding to dispatch.");
    } catch {
      this.toastService.error("Failed to approve quote.");
    }
  }

  async rejectQuote(quoteId: string) {
    try {
      this.quotes.update((list) =>
        list.map((q) => (q.id === quoteId ? { ...q, status: "rejected" } : q)),
      );
      if (typeof window !== "undefined") {
        localStorage.setItem("3dg_quotes", JSON.stringify(this.quotes()));
      }
      this.toastService.info("Quote request rejected.");
    } catch {
      this.toastService.error("Access Denied or Network Error.");
    }
  }
}

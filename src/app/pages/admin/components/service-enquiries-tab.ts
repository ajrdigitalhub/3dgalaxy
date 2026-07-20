import { Component, ChangeDetectionStrategy, inject, signal, OnInit, ViewChild, ElementRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { ServiceEnquiryService, ServiceEnquiry, ServiceFile } from "../../../core/services/service-enquiry.service";
import { FirebaseStorageService } from "../../../core/services/firebase-storage.service";
import { ToastService } from "../../../shared/components/toast/toast.service";
import { environment } from "../../../../environments/environment";

@Component({
  selector: "app-admin-service-enquiries-tab",
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./service-enquiries-tab.html",
})
export class AdminServiceEnquiriesTab implements OnInit {
  private enquiryService = inject(ServiceEnquiryService);
  private fbStorageService = inject(FirebaseStorageService);
  private toastService = inject(ToastService);

  @ViewChild("adminStlCanvas") adminStlCanvas!: ElementRef<HTMLCanvasElement>;
  isAdminStlLoading = signal<boolean>(false);
  private adminScene: any;
  private adminCamera: any;
  private adminRenderer: any;
  private adminMesh: any;

  enquiries = this.enquiryService.adminEnquiries;
  stats = this.enquiryService.adminStats;
  loading = this.enquiryService.loading;

  searchQuery = "";
  selectedStatusFilter = signal<string>("all");

  activeOverviewEnquiry = signal<ServiceEnquiry | null>(null);
  activeQuoteModalEnquiry = signal<ServiceEnquiry | null>(null);
  activeUploadModalEnquiry = signal<ServiceEnquiry | null>(null);

  currentEnquiryFiles = signal<ServiceFile[]>([]);
  selectedAdminFile = signal<File | null>(null);

  quoteForm = {
    materialCost: 200,
    printingCost: 150,
    laborFee: 50,
    shippingFee: 120,
  };

  uploadForm = {
    folder: "quotation",
    fileName: "",
  };

  statusFilters = [
    { id: "all", label: "All Enquiries" },
    { id: "submitted", label: "Submitted" },
    { id: "quotation_generated", label: "Quote Sent" },
    { id: "quotation_accepted", label: "Quote Accepted" },
    { id: "printing_started", label: "Printing" },
    { id: "shipped", label: "Shipped" },
    { id: "completed", label: "Completed" },
  ];

  statusOptions = [
    { id: "submitted", label: "Enquiry Submitted" },
    { id: "received", label: "Received by Node" },
    { id: "file_review", label: "3D Mesh File Review" },
    { id: "quotation_generated", label: "Quotation Generated" },
    { id: "waiting_customer_approval", label: "Waiting Customer Approval" },
    { id: "quotation_accepted", label: "Quotation Accepted" },
    { id: "payment_pending", label: "Payment Pending" },
    { id: "payment_completed", label: "Payment Verified" },
    { id: "printing_started", label: "3D Printing Started" },
    { id: "quality_check", label: "Quality Check (QC)" },
    { id: "packing", label: "ESD Packing" },
    { id: "ready_for_dispatch", label: "Ready for Dispatch" },
    { id: "shipped", label: "Shipped via Courier" },
    { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
    { id: "rejected", label: "Declined" },
  ];

  ngOnInit() {
    this.loadEnquiries();
  }

  loadEnquiries() {
    this.enquiryService
      .getAdminEnquiries(this.selectedStatusFilter(), this.searchQuery)
      .subscribe();
  }

  openOverviewDrawer(enquiry: ServiceEnquiry) {
    this.activeOverviewEnquiry.set(enquiry);
    this.loadEnquiryFiles(enquiry.trackingNumber);
    if (enquiry.fileUrl) {
      this.initAdminStlViewer(enquiry.fileUrl);
    }
  }

  initAdminStlViewer(stlUrl: string) {
    if (!stlUrl || typeof window === "undefined") return;
    this.isAdminStlLoading.set(true);

    import("three").then(async (THREE) => {
      const { STLLoader } = await import("three/examples/jsm/loaders/STLLoader.js");
      const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");

      setTimeout(() => {
        const canvas = this.adminStlCanvas?.nativeElement;
        if (!canvas) return;

        const width = canvas.clientWidth || 500;
        const height = canvas.clientHeight || 300;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x09090b);

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight1.position.set(1, 1, 1);
        scene.add(dirLight1);

        const dirLight2 = new THREE.DirectionalLight(0x3b82f6, 0.6);
        dirLight2.position.set(-1, -1, -1);
        scene.add(dirLight2);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        const loader = new STLLoader();
        loader.load(
          stlUrl,
          (geometry: any) => {
            geometry.center();
            geometry.computeVertexNormals();

            const material = new THREE.MeshStandardMaterial({
              color: 0x3b82f6,
              roughness: 0.3,
              metalness: 0.2,
            });

            const mesh = new THREE.Mesh(geometry, material);
            scene.add(mesh);

            geometry.computeBoundingSphere();
            const radius = geometry.boundingSphere.radius || 50;
            camera.position.set(radius * 2, radius * 2, radius * 2);
            camera.lookAt(0, 0, 0);

            this.adminScene = scene;
            this.adminCamera = camera;
            this.adminRenderer = renderer;
            this.adminMesh = mesh;

            this.isAdminStlLoading.set(false);

            const animate = () => {
              requestAnimationFrame(animate);
              controls.update();
              renderer.render(scene, camera);
            };
            animate();
          },
          undefined,
          () => {
            this.isAdminStlLoading.set(false);
          }
        );
      }, 100);
    });
  }

  resetAdminCamera() {
    if (this.adminCamera && this.adminMesh) {
      this.adminMesh.geometry.computeBoundingSphere();
      const radius = this.adminMesh.geometry.boundingSphere.radius || 50;
      this.adminCamera.position.set(radius * 2, radius * 2, radius * 2);
      this.adminCamera.lookAt(0, 0, 0);
    }
  }

  fitAdminModel() {
    this.resetAdminCamera();
  }

  loadEnquiryFiles(trackingNumber: string) {
    this.enquiryService.getFiles(trackingNumber).subscribe({
      next: (res) => {
        if (res.data) {
          this.currentEnquiryFiles.set(res.data);
        }
      },
    });
  }

  updateStatus(id: string, newStatus: string) {
    this.enquiryService
      .updateAdminEnquiry(id, { status: newStatus })
      .subscribe({
        next: (res) => {
          this.toastService.success("Status updated to " + newStatus);
          if (this.activeOverviewEnquiry()?.id === id) {
            this.activeOverviewEnquiry.set(res.data);
          }
        },
        error: () => this.toastService.error("Failed to update status."),
      });
  }

  openFileUploadModal(enquiry: ServiceEnquiry) {
    this.uploadForm = {
      folder: "quotation",
      fileName: enquiry.id + "_Official_Quotation.pdf",
    };
    this.selectedAdminFile.set(null);
    this.activeUploadModalEnquiry.set(enquiry);
  }

  onAdminFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedAdminFile.set(file);
      this.uploadForm.fileName = file.name;
    }
  }

  async submitFileUpload() {
    const eq = this.activeUploadModalEnquiry();
    if (!eq || !this.uploadForm.fileName) return;

    const file = this.selectedAdminFile();
    let firebaseUrl = "";

    if (file) {
      const storagePath = "services/" + eq.trackingNumber + "/" + this.uploadForm.folder + "/" + file.name;
      firebaseUrl = await this.fbStorageService.uploadFile(file, storagePath);
    }

    const payload = {
      trackingNumber: eq.trackingNumber,
      folder: this.uploadForm.folder,
      fileName: this.uploadForm.fileName,
      fileSize: file ? Math.round((file.size / (1024 * 1024)) * 10) / 10 + " MB" : "1.4 MB",
      downloadUrl: firebaseUrl,
      uploadedBy: "Admin Console",
    };

    this.enquiryService.uploadFile(payload).subscribe({
      next: () => {
        this.toastService.success("File uploaded to Firebase Storage (services/" + eq.trackingNumber + "/" + this.uploadForm.folder + "/)");
        this.activeUploadModalEnquiry.set(null);
        this.selectedAdminFile.set(null);
        this.loadEnquiryFiles(eq.trackingNumber);
      },
      error: () => this.toastService.error("Failed to upload file."),
    });
  }

  downloadFile(file: ServiceFile) {
    this.enquiryService.downloadFile(file.id, "Admin Staff").subscribe({
      next: (res) => {
        this.toastService.success("Downloading " + file.fileName + " (Downloads: " + (res.downloadCount || 1) + ")");
        const targetUrl = res.downloadUrl || file.downloadUrl;

        if (targetUrl) {
          const a = document.createElement("a");
          a.href = targetUrl;
          a.target = "_blank";
          a.download = file.fileName || "downloaded_file.stl";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }

        if (this.activeOverviewEnquiry()) {
          this.loadEnquiryFiles(file.trackingNumber);
        }
      },
      error: () => this.toastService.error("Download failed."),
    });
  }

  deleteFileRecord(fileId: string) {
    if (confirm("Delete file record?")) {
      this.enquiryService.deleteFile(fileId).subscribe({
        next: () => {
          this.toastService.success("File record deleted.");
          const activeEq = this.activeOverviewEnquiry();
          if (activeEq) {
            this.loadEnquiryFiles(activeEq.trackingNumber);
          }
        },
        error: () => this.toastService.error("Failed to delete file record."),
      });
    }
  }

  openQuoteModal(enquiry: ServiceEnquiry) {
    this.quoteForm = {
      materialCost: Math.round(enquiry.estimatedCost * 0.45),
      printingCost: Math.round(enquiry.estimatedCost * 0.35),
      laborFee: 50,
      shippingFee: 120,
    };
    this.activeQuoteModalEnquiry.set(enquiry);
  }

  submitQuotationForm() {
    const eq = this.activeQuoteModalEnquiry();
    if (!eq) return;

    const payload = {
      enquiryId: eq.id,
      materialCost: this.quoteForm.materialCost,
      printingCost: this.quoteForm.printingCost,
      laborFee: this.quoteForm.laborFee,
      shippingFee: this.quoteForm.shippingFee,
    };

    this.enquiryService.generateAdminQuote(payload).subscribe({
      next: () => {
        this.toastService.success("Official quotation generated for " + eq.id);
        this.activeQuoteModalEnquiry.set(null);
      },
      error: () => this.toastService.error("Failed to generate quotation."),
    });
  }

  deleteEnquiry(id: string) {
    if (confirm("Are you sure you want to delete Enquiry " + id + "?")) {
      this.enquiryService.deleteAdminEnquiry(id).subscribe({
        next: () => this.toastService.success("Enquiry " + id + " soft deleted."),
        error: () => this.toastService.error("Failed to delete enquiry."),
      });
    }
  }
}

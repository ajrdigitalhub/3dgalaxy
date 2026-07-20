import { Component, ChangeDetectionStrategy, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule, ActivatedRoute } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { ServiceEnquiryService, ServiceEnquiry, ServiceFile } from "../../core/services/service-enquiry.service";
import { ToastService } from "../../shared/components/toast/toast.service";
import { environment } from "../../../environments/environment";

@Component({
  selector: "app-track-service",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./track-service.html",
  styleUrl: "./track-service.scss",
})
export class TrackServiceComponent {
  private route = inject(ActivatedRoute);
  private enquiryService = inject(ServiceEnquiryService);
  private toastService = inject(ToastService);

  trackingQuery = signal<string>("");
  authVal = signal<string>("");
  loading = signal<boolean>(false);
  enquiry = signal<ServiceEnquiry | null>(null);
  files = signal<ServiceFile[]>([]);
  searched = signal<boolean>(false);

  allWorkflowStages = [
    { key: "submitted", label: "Submitted" },
    { key: "received", label: "Node Received" },
    { key: "file_review", label: "Mesh Review" },
    { key: "quotation_generated", label: "Quote Ready" },
    { key: "quotation_accepted", label: "Quote Accepted" },
    { key: "payment_completed", label: "Payment Done" },
    { key: "printing_started", label: "Printing" },
    { key: "quality_check", label: "QC Checked" },
    { key: "ready_for_dispatch", label: "Packing" },
    { key: "shipped", label: "Shipped" },
    { key: "completed", label: "Delivered" },
  ];

  constructor() {
    const trk = this.route.snapshot.queryParamMap.get("trk");
    if (trk) {
      this.trackingQuery.set(trk);
      this.searchTracking();
    }
  }

  searchTracking() {
    const query = this.trackingQuery().trim();
    if (!query) {
      this.toastService.error("Please enter a valid Tracking Number or Enquiry ID.");
      return;
    }

    this.loading.set(true);
    this.searched.set(true);

    this.enquiryService.trackRequest(query, this.authVal()).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.data) {
          this.enquiry.set(res.data);
          this.loadFiles(res.data.trackingNumber);
          this.toastService.success("Service Request details loaded.");
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.enquiry.set(null);
        this.files.set([]);
        this.toastService.error(err.error?.error || "No matching service request found.");
      },
    });
  }

  loadFiles(trackingNumber: string) {
    this.enquiryService.getFiles(trackingNumber).subscribe({
      next: (res) => {
        if (res.data) {
          this.files.set(res.data);
        }
      },
    });
  }

  downloadFile(file: ServiceFile) {
    this.enquiryService.downloadFile(file.id, "Customer").subscribe({
      next: (res) => {
        this.toastService.success(`Downloading "${file.fileName}"...`);
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
      },
      error: () => this.toastService.error("Download failed."),
    });
  }

  isStageCompleted(stageKey: string): boolean {
    const e = this.enquiry();
    if (!e || !e.timeline) return false;
    return e.timeline.some((t) => t.status === stageKey);
  }

  isStageActive(stageKey: string): boolean {
    return this.enquiry()?.status === stageKey;
  }

  acceptQuote() {
    const e = this.enquiry();
    if (!e) return;
    this.enquiryService.customerAction(e.id, "accept_quote").subscribe({
      next: (res) => {
        this.enquiry.set(res.data);
        this.toastService.success("Official quotation accepted!");
      },
      error: () => this.toastService.error("Failed to accept quotation."),
    });
  }

  rejectQuote() {
    const e = this.enquiry();
    if (!e) return;
    this.enquiryService.customerAction(e.id, "reject_quote").subscribe({
      next: (res) => {
        this.enquiry.set(res.data);
        this.toastService.info("Quotation declined.");
      },
      error: () => this.toastService.error("Failed to reject quotation."),
    });
  }
}

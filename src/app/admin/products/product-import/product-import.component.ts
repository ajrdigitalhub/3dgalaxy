import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { filter, lastValueFrom, share } from "rxjs";
import { HttpClient, HttpEventType, HttpRequest } from "@angular/common/http";
import { RouterModule } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { ToastService } from "../../../shared/components/toast/toast.service";

@Component({
  selector: "app-admin-product-import",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./product-import.component.html",
  styleUrls: ["./product-import.component.scss"],
})
export class ProductImportComponent {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);

  selectedFile = signal<File | null>(null);
  selectedFileName = signal<string>("No file selected");
  previewData = signal<any>(null);
  importResult = signal<any>(null);
  previewError = signal<string>("");
  importError = signal<string>("");
  loadingPreview = signal<boolean>(false);
  loadingImport = signal<boolean>(false);
  importProgress = signal<number>(0);
  modeValue = signal<
    "create_update" | "update_existing" | "create_only" | "skip_existing"
  >("create_update");
  matchByValue = signal<"sku" | "slug">("sku");

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.selectedFile.set(file);
    this.selectedFileName.set(file ? file.name : "No file selected");
    this.previewData.set(null);
    this.importResult.set(null);
    this.previewError.set("");
    this.importError.set("");
  }

  private buildFormData() {
    const form = new FormData();
    const file = this.selectedFile();
    if (file) {
      form.append("file", file, file.name);
    }
    return form;
  }

  async previewImport() {
    const file = this.selectedFile();
    if (!file) {
      this.previewError.set("Please choose a CSV file first.");
      return;
    }

    this.previewError.set("");
    this.importResult.set(null);
    this.loadingPreview.set(true);

    try {
      const form = this.buildFormData();
      const response = await lastValueFrom(
        this.http.post<any>("/api/admin/products/import/preview", form),
      );
      this.previewData.set(response?.data || null);
      if (!response?.data) {
        this.previewError.set("No preview data returned from server.");
      }
    } catch (error: any) {
      this.previewError.set(error?.message || "Failed to generate preview.");
    } finally {
      this.loadingPreview.set(false);
    }
  }

  async submitImport() {
    const file = this.selectedFile();
    if (!file) {
      this.importError.set("Please choose a CSV file first.");
      return;
    }

    this.importError.set("");
    this.importResult.set(null);
    this.loadingImport.set(true);
    this.importProgress.set(0);

    try {
      const form = this.buildFormData();
      form.append("mode", this.modeValue());
      form.append("matchBy", this.matchByValue());

      const request = new HttpRequest(
        "POST",
        "/api/admin/products/import",
        form,
        {
          reportProgress: true,
          responseType: "json",
        },
      );

      const request$ = this.http.request<any>(request).pipe(share());

      request$
        .pipe(filter((event) => event.type === HttpEventType.UploadProgress))
        .subscribe((event: any) => {
          const percent = event.total
            ? Math.round((event.loaded / event.total) * 100)
            : 0;
          this.importProgress.set(Math.min(100, percent));
        });

      const response = await lastValueFrom(
        request$.pipe(filter((event) => event.type === HttpEventType.Response)),
      );

      const data = response.body?.data || null;
      this.importResult.set(data);
      this.previewData.set(null);
      this.importProgress.set(100);
      this.toastService.success("Import completed successfully.");
    } catch (error: any) {
      this.importError.set(
        error?.error?.message || error?.message || "Failed to import products.",
      );
    } finally {
      this.loadingImport.set(false);
    }
  }

  formatCategoryPath(raw: string): string[] {
    const normalized = raw?.trim();
    if (!normalized || normalized === "-") {
      return ["-"];
    }

    const segments = normalized
      .replace(/\s*\\\s*/g, " > ")
      .replace(/\s*\|\s*/g, " > ")
      .split(/\s*>\s*/)
      .map((segment) => segment.trim())
      .filter(Boolean);

    return segments.length ? segments : [normalized];
  }

  downloadSampleCsv() {
    try {
      this.http
        .get("/api/admin/products/import/sample", {
          responseType: "blob",
        })
        .subscribe(
          (blob: Blob) => {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `sample-products-${Date.now()}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            this.toastService.success("Sample CSV downloaded successfully.");
          },
          (error: any) => {
            this.toastService.success("Failed to download sample CSV.");
            console.error("Download error:", error);
          },
        );
    } catch (error: any) {
      this.toastService.success("Failed to download sample CSV.");
      console.error("Download error:", error);
    }
  }
}

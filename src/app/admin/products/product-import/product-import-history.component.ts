import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector: "app-admin-product-import-history",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./product-import-history.component.html",
  styleUrls: ["./product-import-history.component.scss"],
})
export class ProductImportHistoryComponent implements OnInit {
  history = signal<any[]>([]);
  loading = signal<boolean>(false);
  error = signal<string>("");

  formatDate(value: string | number | Date | undefined): string {
    if (!value) return "";
    const date =
      typeof value === "string" || typeof value === "number"
        ? new Date(value)
        : value instanceof Date
          ? value
          : new Date(String(value));
    return isNaN(date.getTime()) ? "" : date.toLocaleString();
  }

  async ngOnInit() {
    this.loading.set(true);
    try {
      const response = await fetch("/api/admin/products/import/history", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
        },
      });
      if (!response.ok) {
        throw new Error("Could not load history");
      }
      const payload = await response.json();
      this.history.set(payload.data || []);
    } catch (err: any) {
      console.error(err);
      this.error.set(err?.message || "Failed to load import history.");
    } finally {
      this.loading.set(false);
    }
  }
}

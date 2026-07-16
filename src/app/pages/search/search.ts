import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  signal,
  effect,
} from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { FormsModule } from "@angular/forms";
import { PLATFORM_ID } from "@angular/core";
import { DatastoreService } from "../../services/datastore";

@Component({
  selector: "app-search-results",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./search.html",
})
export class SearchComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  public ds = inject(DatastoreService);

  query = signal<string>("");
  activeTab = signal<string>("all");

  results = signal<any>({
    products: [],
    categories: [],
    brands: [],
    services: [],
  });
  loading = signal<boolean>(false);

  priceRange = signal([0, 10000]);

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params["q"]) {
        this.query.set(params["q"]);
        if (params["tab"]) {
          this.activeTab.set(params["tab"]);
        }
        this.performSearch(params["q"]);
      }
    });
  }

  getImageUrl(img: any): string {
    if (!img) return "";
    if (typeof img === "string") return img;
    if (typeof img === "object") {
      return img.url || img.imageUrl || img.src || "";
    }
    return "";
  }

  getProductImage(product: any): string {
    if (product?.image) {
      return this.getImageUrl(product.image);
    }
    if (Array.isArray(product?.images) && product.images.length > 0) {
      return this.getImageUrl(product.images[0]);
    }
    return "https://via.placeholder.com/400x400?text=No+Image";
  }

  performSearch(q: string) {
    if (!q) return;
    this.loading.set(true);

    this.http.get<any>(`/api/search?q=${encodeURIComponent(q)}`).subscribe({
      next: (res) => {
        if (res.success) {
          this.results.set(res.data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }
}

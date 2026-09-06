import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  signal,
  DestroyRef,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Router, ActivatedRoute, RouterModule } from "@angular/router";
import { MatIconModule } from "@angular/material/icon";
import { FormsModule } from "@angular/forms";
import { DatastoreService } from "../../services/datastore";
import { Subject, of } from "rxjs";
import { debounceTime, distinctUntilChanged, switchMap, catchError } from "rxjs/operators";

import { DeliveryEstimatePipe } from "../../shared/pipes/delivery-estimate.pipe";

@Component({
  selector: "app-search-results",
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, FormsModule, DeliveryEstimatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./search.html",
})
export class SearchComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  public ds = inject(DatastoreService);
  private destroyRef = inject(DestroyRef);

  query = signal<string>("");
  activeTab = signal<string>("all");

  results = signal<any>({
    products: [],
    categories: [],
    brands: [],
    services: [],
  });
  loading = signal<boolean>(false);
  Math = Math;

  priceRange = signal([0, 10000]);

  private searchSubject = new Subject<string>();

  ngOnInit() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) => {
        const clean = (q || '').trim();
        if (!clean) {
          this.loading.set(false);
          return of({ success: true, data: { products: [], categories: [], brands: [], services: [] } });
        }
        this.loading.set(true);
        return this.http.get<any>(`/api/search?q=${encodeURIComponent(clean)}`).pipe(
          catchError((err) => {
            console.error("Search failed:", err);
            return of({ success: false, data: { products: [], categories: [], brands: [], services: [] } });
          })
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((res: any) => {
      this.loading.set(false);
      if (res && res.success && res.data) {
        this.results.set(res.data);
      }
    });

    this.route.queryParams.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((params) => {
      if (params["q"]) {
        this.query.set(params["q"]);
        if (params["tab"]) {
          this.activeTab.set(params["tab"]);
        }
        this.searchSubject.next(params["q"]);
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
    this.searchSubject.next(q);
  }
}

import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { ProductListComponent } from "./product-list/product-list.component";
import { ProductCreateComponent } from "./product-create/product-create.component";
import { ProductEditComponent } from "./product-edit/product-edit.component";
import { ProductDetailsComponent } from "./product-details/product-details.component";
import { ProductImportComponent } from "./product-import/product-import.component";
import { ProductExportComponent } from "./product-import/product-export.component";
import { ProductImportHistoryComponent } from "./product-import/product-import-history.component";
const routes: Routes = [
  { path: "", component: ProductListComponent },
  { path: "create", component: ProductCreateComponent },
  { path: "import", component: ProductImportComponent },
  { path: "export", component: ProductExportComponent },
  { path: "import-history", component: ProductImportHistoryComponent },
  { path: "edit/:id", component: ProductEditComponent },
  { path: ":id", component: ProductDetailsComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProductsRoutingModule {}

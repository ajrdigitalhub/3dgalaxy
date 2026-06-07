import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrandsRoutingModule } from './brands-routing.module';
import { BrandListComponent } from './brand-list/brand-list.component';

@NgModule({
  imports: [
    CommonModule,
    BrandsRoutingModule,
    BrandListComponent
  ]
})
export class BrandsModule {}

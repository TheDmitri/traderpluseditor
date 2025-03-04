import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StorageService } from '../../../core/services/storage.service';
import { Product } from '../../../core/models';
import { Subject } from 'rxjs';
import { ProductListComponent } from '../../../shared/components/product-list/product-list.component';

// Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-product-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    RouterModule,
    ProductListComponent
  ],
  templateUrl: './product-editor.component.html',
  styleUrls: ['./product-editor.component.scss']
})
export class ProductEditorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  products: Product[] = [];

  constructor(private storageService: StorageService) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.products = this.storageService.products();
  }

  addProduct(): void {
    // This will be implemented later with the product modal
    console.log('Add product clicked');
  }

  removeAllProducts(): void {
    this.storageService.saveProducts([]);
    this.loadProducts();
  }

  onProductRemoved(productId: string): void {
    const updatedProducts = this.products.filter(p => p.productId !== productId);
    this.storageService.saveProducts(updatedProducts);
    this.loadProducts();
  }

  onProductEdited(product: Product): void {
    // Will be implemented with product edit modal
    console.log('Edit product:', product);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
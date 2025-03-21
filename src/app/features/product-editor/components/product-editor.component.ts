import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

// Application imports
import { Product } from '../../../core/models';
import { InitializationService, StorageService } from '../../../core/services';
import { ConfirmDialogComponent, ProductListComponent, ProductModalComponent, LoaderComponent } from '../../../shared/components';
import { NotificationService } from '../../../shared/services';

@Component({
  selector: 'app-product-editor',
  standalone: true,
  imports: [
      CommonModule,
      ReactiveFormsModule,
      MatCardModule,
      MatTooltipModule,
      MatIconModule,
      MatButtonModule,
      MatMenuModule,
      MatDialogModule,
      RouterModule,
      ProductListComponent,
      LoaderComponent,
  ],
  templateUrl: './product-editor.component.html',
  styleUrls: ['./product-editor.component.scss'],
})
export class ProductEditorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  products: Product[] = [];
  isCreatingDefaultProducts = false;

  constructor(
    private storageService: StorageService,
    private dialog: MatDialog,
    private notificationService: NotificationService,
    private initializationService: InitializationService,
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.products = this.storageService.products();
  }

  addProduct(): void {
    const dialogRef = this.dialog.open(ProductModalComponent, {
      data: {},
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.product) {
        const updatedProducts = [...this.products, result.product];
        this.storageService.saveProducts(updatedProducts);
        this.loadProducts();
        this.notificationService.success('Product created successfully');
      }
    });
  }

  removeAllProducts(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete All Products',
        message:
          'Are you sure you want to delete all products? \nThis action cannot be undone.',
        confirmText: 'Delete All',
        cancelText: 'Cancel',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.storageService.saveProducts([]);
        this.loadProducts();
        this.notificationService.success('All products deleted successfully');
      }
    });
  }

  onProductRemoved(productId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Product',
        message:
          'Are you sure you want to delete this product? \nThis action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const updatedProducts = this.products.filter(
          (p) => p.productId !== productId
        );
        this.storageService.saveProducts(updatedProducts);
        this.loadProducts();
        this.notificationService.success('Product deleted successfully');
      }
    });
  }

  onProductEdited(product: Product): void {
    const dialogRef = this.dialog.open(ProductModalComponent, {
      data: { product },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.product) {
        const updatedProducts = this.products.map((p) =>
          p.productId === result.product.productId ? result.product : p
        );
        this.storageService.saveProducts(updatedProducts);
        this.loadProducts();
        this.notificationService.success('Product updated successfully');
      }
    });
  }

  /**
   * Create default products for quick startup
   * 
   * This method creates a set of standard products.
   */
  createDefaultProducts(): void {
    this.isCreatingDefaultProducts = true;
    
    // Use setTimeout to allow the UI to update and show the loader
    setTimeout(() => {
      const defaultProducts = this.initializationService.createDefaultProducts();
      this.storageService.saveProducts(defaultProducts);
      
      // Simulate some processing time to show the loader
      setTimeout(() => {
        this.loadProducts();
        this.isCreatingDefaultProducts = false;
        this.notificationService.success('Default products created successfully');
      }, 800);
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

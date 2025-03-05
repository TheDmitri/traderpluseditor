import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StorageService } from '../../../core/services/storage.service';
import { Product } from '../../../core/models';
import { Subject } from 'rxjs';
import { ProductListComponent } from '../../../shared/components/product-list/product-list.component';
import { ProductModalComponent } from '../../../shared/components/product-modal/product-modal.component';

// Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { NotificationService } from '../../../shared/services/notification.service';

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
    ProductListComponent,
  ],
  templateUrl: './product-editor.component.html',
  styleUrls: ['./product-editor.component.scss'],
})
export class ProductEditorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  products: Product[] = [];

  constructor(
    private storageService: StorageService,
    private dialog: MatDialog,
    private notificationService: NotificationService
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

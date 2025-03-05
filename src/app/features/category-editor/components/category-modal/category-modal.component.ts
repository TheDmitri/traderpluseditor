import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { Category, Product } from '../../../../core/models';
import { StorageService } from '../../../../core/services/storage.service';
import { ProductListComponent } from '../../../../shared/components/product-list/product-list.component';
import { MatDialog } from '@angular/material/dialog';
import { ProductModalComponent } from '../../../../shared/components/product-modal/product-modal.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AssignProductsDialogComponent } from '../../../../shared/components/assign-products-dialog/assign-products-dialog.component';

@Component({
  selector: 'app-category-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    ProductListComponent,
  ],
  templateUrl: './category-modal.component.html',
  styleUrls: ['./category-modal.component.scss'],
})
export class CategoryModalComponent implements OnInit {
  categoryForm: FormGroup;
  categoryProducts: Product[] = [];
  isEditMode: boolean;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CategoryModalComponent>,
    private storageService: StorageService,
    private dialog: MatDialog,
    private notificationService: NotificationService,
    @Inject(MAT_DIALOG_DATA) public data: { category?: Category }
  ) {
    this.dialogRef.disableClose = true;
    // Prevent dialog from closing on escape key
    this.dialogRef.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
      }
    });
    this.isEditMode = !!data.category;
    this.categoryForm = this.fb.group({
      categoryName: ['', Validators.required],
      icon: [''],
      licensesRequired: [''],
      isVisible: [data.category?.isVisible ?? true],
    });
  }

  ngOnInit(): void {
    if (this.isEditMode && this.data.category) {
      this.loadCategoryProducts();

      this.categoryForm.patchValue({
        categoryName: this.data.category.categoryName,
        icon: this.data.category.icon,
        licensesRequired: this.data.category.licensesRequired.join(', '),
        isVisible: this.data.category.isVisible,
      });
    }
  }

  loadCategoryProducts(): void {
    if (this.data.category) {
      const allProducts = this.storageService.products();
      this.categoryProducts = allProducts.filter((product) =>
        this.data.category!.productIds.includes(product.productId)
      );
    }
  }

  onProductRemoved(productId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Remove Product from Category',
        message:
          'Are you sure you want to remove this product from the category?',
        confirmText: 'Remove',
        cancelText: 'Cancel',
        type: 'warning',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && this.data.category) {
        const updatedProductIds = this.data.category.productIds.filter(
          (id) => id !== productId
        );
        this.data.category.productIds = updatedProductIds;
        this.loadCategoryProducts();
        this.notificationService.success('Product removed from category');
      }
    });
  }

  onProductEdited(product: Product): void {
    // Prevent event propagation
    event?.preventDefault();
    event?.stopPropagation();

    const dialogRef = this.dialog.open(ProductModalComponent, {
      width: '600px',
      disableClose: true, // Prevent closing on backdrop click
      data: {
        product,
        categoryId: this.data.category?.categoryId,
      },
    });

    // Use setTimeout to ensure event handling is complete
    setTimeout(() => {
      dialogRef.afterClosed().subscribe((result) => {
        if (result?.product) {
          const allProducts = this.storageService.products();
          const updatedProducts = allProducts.map((p) =>
            p.productId === result.product.productId ? result.product : p
          );
          this.storageService.saveProducts(updatedProducts);
          this.loadCategoryProducts();
        }
      });
    });
  }

  addProductToCategory(): void {
    // Prevent event propagation
    event?.preventDefault();
    event?.stopPropagation();

    const dialogRef = this.dialog.open(ProductModalComponent, {
      width: '600px',
      disableClose: true, // Prevent closing on backdrop click
      data: {
        categoryId: this.data.category?.categoryId,
      },
    });

    // Use setTimeout to ensure event handling is complete
    setTimeout(() => {
      dialogRef.afterClosed().subscribe((result) => {
        if (result?.product) {
          const allProducts = this.storageService.products();
          const updatedProducts = [...allProducts, result.product];
          this.storageService.saveProducts(updatedProducts);

          if (this.data.category) {
            this.data.category.productIds.push(result.product.productId);
            this.notificationService.success('Product added to category successfully');
          }

          this.loadCategoryProducts();
        }
      });
    });
  }

  assignExistingProducts(): void {
    event?.preventDefault();
    event?.stopPropagation();
  
    const dialogRef = this.dialog.open(AssignProductsDialogComponent, {
      width: '800px',
      maxHeight: '65vh',
      disableClose: true,
      autoFocus: false, // Verhindert Auto-Fokus auf das erste Element
      data: {
        allProducts: this.storageService.products(),
        currentProductIds: this.data.category?.productIds || []
      }
    });
  
    setTimeout(() => {
      dialogRef.afterClosed().subscribe(result => {
        if (result && this.data.category) {
          this.data.category.productIds = result;
          this.loadCategoryProducts();
          this.notificationService.success('Products assigned successfully');
        }
      });
    });
  }

  onSubmit(): void {
    if (this.categoryForm.valid) {
      const formValue = this.categoryForm.value;
      const category: Partial<Category> = {
        categoryName: formValue.categoryName,
        icon: formValue.icon,
        isVisible: formValue.isVisible,
        licensesRequired: formValue.licensesRequired
          ? formValue.licensesRequired.split(',').map((s: string) => s.trim())
          : [],
        productIds: this.isEditMode ? this.data.category?.productIds : [],
      };
      this.dialogRef.close(category);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

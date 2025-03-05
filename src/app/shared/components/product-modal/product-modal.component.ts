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
  MatDialog,
} from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Product } from '../../../core/models';
import { TextFieldModule } from '@angular/cdk/text-field';
import { NotificationService } from '../../services/notification.service';
import { MatExpansionModule } from '@angular/material/expansion';
import { AssignProductsDialogComponent } from '../assign-products-dialog/assign-products-dialog.component';
import { StorageService } from '../../../core/services/storage.service';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-product-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule,
    TextFieldModule,
    MatExpansionModule,
  ],
  templateUrl: './product-modal.component.html',
  styleUrls: ['./product-modal.component.scss'],
})
export class ProductModalComponent implements OnInit {
  productForm: FormGroup;
  isEditMode: boolean;
  attachmentProducts: Product[] = [];
  variantProducts: Product[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ProductModalComponent>,
    private notificationService: NotificationService,
    private storageService: StorageService,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      product?: Product;
      categoryId?: string; // Optional category ID when called from category-modal
    }
  ) {
    this.dialogRef.disableClose = true;
    this.isEditMode = !!data.product;

    // Prevent dialog from closing on escape key
    this.dialogRef.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.onCancel();
      }
    });

    this.productForm = this.fb.group({
      className: ['', Validators.required],
      coefficient: [1, [Validators.required, Validators.min(0)]],
      maxStock: [100, [Validators.required, Validators.min(0)]],
      tradeQuantity: [1, [Validators.required, Validators.min(1)]],
      buyPrice: [0, [Validators.required, Validators.min(0)]],
      sellPrice: [0, [Validators.required, Validators.min(0)]],
      stockSettings: [0, [Validators.required, Validators.min(0)]],
      attachments: [''],
      variants: [''],
    });
  }

  ngOnInit(): void {
    if (this.isEditMode && this.data.product) {
      const allProducts = this.storageService.products();
      this.attachmentProducts = allProducts.filter((p) =>
        this.data.product?.attachments?.includes(p.productId)
      );
      this.variantProducts = allProducts.filter((p) =>
        this.data.product?.variants?.includes(p.productId)
      );

      this.productForm.patchValue({
        className: this.data.product.className,
        coefficient: this.data.product.coefficient,
        maxStock: this.data.product.maxStock,
        tradeQuantity: this.data.product.tradeQuantity,
        buyPrice: this.data.product.buyPrice,
        sellPrice: this.data.product.sellPrice,
        stockSettings: this.data.product.stockSettings,
        // Set the string values for attachments and variants
        attachments: this.attachmentProducts.map((p) => p.productId).join(', '),
        variants: this.variantProducts.map((p) => p.productId),
      });
    }
  }

  addAttachments(): void {
    const dialogRef = this.dialog.open(AssignProductsDialogComponent, {
      disableClose: true,
      data: {
        allProducts: this.storageService.products(),
        currentProductIds: this.attachmentProducts.map((p) => p.productId),
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.attachmentProducts = this.storageService
          .products()
          .filter((p) => result.includes(p.productId));
      }
    });
  }

  addVariants(): void {
    const dialogRef = this.dialog.open(AssignProductsDialogComponent, {
      disableClose: true,
      data: {
        allProducts: this.storageService.products(),
        currentProductIds: this.variantProducts.map((p) => p.productId),
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.variantProducts = this.storageService
          .products()
          .filter((p) => result.includes(p.productId));
      }
    });
  }

  removeAttachment(productId: string): void {
    this.attachmentProducts = this.attachmentProducts.filter(
      (p) => p.productId !== productId
    );
  }

  removeVariant(productId: string): void {
    this.variantProducts = this.variantProducts.filter(
      (p) => p.productId !== productId
    );
  }

  onSubmit(): void {
    if (this.productForm.valid) {
      const formValue = this.productForm.value;
      const product: Partial<Product> = {
        className: formValue.className,
        coefficient: formValue.coefficient,
        maxStock: formValue.maxStock,
        tradeQuantity: formValue.tradeQuantity,
        buyPrice: formValue.buyPrice,
        sellPrice: formValue.sellPrice,
        stockSettings: formValue.stockSettings,
        productId: this.isEditMode
          ? this.data.product?.productId
          : crypto.randomUUID(),
        attachments: this.attachmentProducts.map((p) => p.productId),
        variants: this.variantProducts.map((p) => p.productId),
      };

      this.dialogRef.close({
        product,
        categoryId: this.data.categoryId,
      });
    } else {
      this.notificationService.error('Please fill in all required fields');
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

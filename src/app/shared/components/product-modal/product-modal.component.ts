import { Component, OnInit, Inject } from '@angular/core';
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

/**
 * ProductModalComponent provides a dialog interface for creating and editing products.
 *
 * This component handles:
 * - Creating new products with appropriate ID generation
 * - Editing existing products while preserving original IDs
 * - Adding/removing attachments and variants
 * - Form validation and submission
 */
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
  /** Form group for product data */
  productForm: FormGroup;

  /** Flag indicating whether we're editing an existing product or creating a new one */
  isEditMode: boolean;

  /** Lists of related products for attachments and variants */
  attachmentProducts: Product[] = [];
  variantProducts: Product[] = [];

  /**
   * Constructor initializes required services and form controls
   *
   * @param fb - FormBuilder service for creating reactive forms
   * @param dialogRef - Reference to the dialog containing this component
   * @param notificationService - Service for displaying user notifications
   * @param storageService - Service for accessing product data
   * @param dialog - Material dialog service for opening nested dialogs
   * @param data - Injected data containing product information when editing
   */
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

  /**
   * OnInit lifecycle hook - Loads product data if in edit mode
   */
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

  /**
   * Creates a safe ID base from a product class name
   * Transforms the name by converting to lowercase, removing spaces and special characters
   *
   * @param className - The original product class name
   * @returns A sanitized string safe for use in IDs
   */
  private createSafeIdBase(className: string): string {
    return className
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9_]/g, '');
  }

  /**
   * Generates a unique product ID based on the class name
   *
   * Format: prod_classname_001
   *
   * The method ensures uniqueness by:
   * 1. Creating a base ID from the sanitized class name
   * 2. Finding any existing products with the same base name
   * 3. Determining the highest existing suffix number
   * 4. Generating a new ID with an incremented suffix
   *
   * @param className - The class name of the product
   * @returns A unique ID in the format prod_classname_XXX
   */
  private generateProductId(className: string): string {
    // Create safe base ID from product class name
    const baseName = this.createSafeIdBase(className);

    // Find existing products with the same base name and determine highest suffix
    const products = this.storageService.products();
    let highestSuffix = 0;

    products.forEach((product) => {
      // Check if this product has the same base name in its ID
      if (
        product.productId &&
        product.productId.startsWith(`prod_${baseName}_`)
      ) {
        const suffixMatch = product.productId.match(/_(\d{3})$/);
        if (suffixMatch) {
          const suffix = parseInt(suffixMatch[1], 10);
          highestSuffix = Math.max(highestSuffix, suffix);
        }
      }
    });

    // Generate new ID with incremented suffix
    const nextSuffix = (highestSuffix + 1).toString().padStart(3, '0');
    return `prod_${baseName}_${nextSuffix}`;
  }

  /**
   * Opens a dialog to select product attachments
   * Updates the list of attachment products based on user selection
   */
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

  /**
   * Opens a dialog to select product variants
   * Updates the list of variant products based on user selection
   */
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

  /**
   * Removes an attachment product from the list
   *
   * @param productId - ID of the product to remove from attachments
   */
  removeAttachment(productId: string): void {
    this.attachmentProducts = this.attachmentProducts.filter(
      (p) => p.productId !== productId
    );
  }

  /**
   * Removes a variant product from the list
   *
   * @param productId - ID of the product to remove from variants
   */
  removeVariant(productId: string): void {
    this.variantProducts = this.variantProducts.filter(
      (p) => p.productId !== productId
    );
  }

  /**
   * Handles form submission
   * Validates the form, creates or updates the product, and closes the dialog
   */
  onSubmit(): void {
    if (this.productForm.valid) {
      const formValue = this.productForm.value;

      // For new products, generate ID based on className
      // For existing products, preserve the original ID
      const productId = this.isEditMode
        ? this.data.product?.productId
        : this.generateProductId(formValue.className);

      const product: Partial<Product> = {
        className: formValue.className,
        coefficient: formValue.coefficient,
        maxStock: formValue.maxStock,
        tradeQuantity: formValue.tradeQuantity,
        buyPrice: formValue.buyPrice,
        sellPrice: formValue.sellPrice,
        stockSettings: formValue.stockSettings,
        productId: productId,
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

  /**
   * Handles cancel button click
   * Closes the dialog without saving changes
   */
  onCancel(): void {
    this.dialogRef.close();
  }
}

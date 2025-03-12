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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { Category, Product, License } from '../../../../core/models';
import { StorageService } from '../../../../core/services/storage.service';
import { GeneralSettingsService } from '../../../../core/services/general-settings.service';
import { ProductListComponent } from '../../../../shared/components/product-list/product-list.component';
import { MatDialog } from '@angular/material/dialog';
import { ProductModalComponent } from '../../../../shared/components/product-modal/product-modal.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { NotificationService } from '../../../../shared/services/notification.service';
import { AssignProductsDialogComponent } from '../../../../shared/components/assign-products-dialog/assign-products-dialog.component';

// Interface for tracking license display status
interface DisplayLicense extends License {
  isInGeneralSettings: boolean; // Whether this license exists in general settings
}

@Component({
  selector: 'app-category-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatCheckboxModule,
    MatTooltipModule,
    ProductListComponent,
  ],
  templateUrl: './category-modal.component.html',
  styleUrls: ['./category-modal.component.scss'],
})
export class CategoryModalComponent implements OnInit {
  categoryForm: FormGroup;
  categoryProducts: Product[] = [];
  isEditMode: boolean;
  
  // Available licenses from all sources (general settings + category)
  displayLicenses: DisplayLicense[] = [];
  
  // Selected license IDs for the category
  selectedLicenseIds: string[] = [];
  
  // Property to store product IDs for new categories
  selectedProductIds: string[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CategoryModalComponent>,
    private storageService: StorageService,
    private generalSettingsService: GeneralSettingsService,
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
    
    // Initialize selected product IDs if we're editing
    if (this.isEditMode && this.data.category) {
      this.selectedProductIds = [...this.data.category.productIds];
      // Initialize selected license IDs if editing
      this.selectedLicenseIds = [...this.data.category.licensesRequired || []];
    }
    
    this.categoryForm = this.fb.group({
      categoryName: ['', Validators.required],
      icon: [''],
      isVisible: [data.category?.isVisible ?? true],
    });
  }

  ngOnInit(): void {
    // Load available licenses from general settings AND category
    this.loadAllLicenses();
    
    if (this.isEditMode && this.data.category) {
      this.loadCategoryProducts();

      this.categoryForm.patchValue({
        categoryName: this.data.category.categoryName,
        icon: this.data.category.icon,
        isVisible: this.data.category.isVisible,
      });
    } else {
      // Initialize empty products array for new category
      this.categoryProducts = [];
    }
  }

  /**
   * Load licenses from both general settings and the category
   */
  loadAllLicenses(): void {
    // Get licenses from general settings
    const settings = this.generalSettingsService.getGeneralSettings();
    const generalSettingsLicenses = settings?.licenses || [];
    
    // Map of license IDs to avoid duplicates
    const licenseMap = new Map<string, DisplayLicense>();
    
    // First add licenses from general settings
    generalSettingsLicenses.forEach(license => {
      if (license.licenseId) {
        licenseMap.set(license.licenseId, {
          ...license,
          isInGeneralSettings: true
        });
      }
    });
    
    // If editing a category, add any licenses from the category that don't exist in general settings
    if (this.isEditMode && this.data.category && this.data.category.licensesRequired) {
      this.data.category.licensesRequired.forEach(licenseId => {
        if (!licenseMap.has(licenseId)) {
          // Add missing license with warning
          licenseMap.set(licenseId, {
            licenseId: licenseId,
            licenseName: licenseId, // Use ID as name since we don't have actual name
            description: 'This license is not defined in general settings',
            isInGeneralSettings: false
          });
        }
      });
    }
    
    // Convert map to array
    this.displayLicenses = Array.from(licenseMap.values());
  }

  /**
   * Check if a license is selected for this category
   * @param licenseId The ID of the license to check
   * @returns True if the license is selected
   */
  isLicenseSelected(licenseId: string): boolean {
    return this.selectedLicenseIds.includes(licenseId);
  }

  /**
   * Toggle a license selection for this category
   * @param license The license to toggle
   */
  toggleLicense(license: DisplayLicense): void {
    if (!license.licenseId) return;
    
    if (this.isLicenseSelected(license.licenseId)) {
      // Remove the license if it's already selected
      this.selectedLicenseIds = this.selectedLicenseIds.filter(id => id !== license.licenseId);
    } else {
      // Add the license if it's not selected
      this.selectedLicenseIds.push(license.licenseId);
    }
  }

  loadCategoryProducts(): void {
    const allProducts = this.storageService.products();
    
    // Use selectedProductIds when we don't have a category yet (new category)
    // or use the category's productIds when editing
    const productIds = this.isEditMode && this.data.category 
      ? this.data.category.productIds 
      : this.selectedProductIds;
    
    this.categoryProducts = allProducts.filter((product) =>
      productIds.includes(product.productId)
    );
    
    // Log for debugging
    console.log(`Loaded ${this.categoryProducts.length} products for ${this.isEditMode ? 'existing' : 'new'} category`);
    
    // Trigger change detection with a new array reference
    this.categoryProducts = [...this.categoryProducts];
  }

  onProductRemoved(productId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Remove Product from Category',
        message:
          'Are you sure you want to remove this product from the category?\nThis action cannot be undone.',
        confirmText: 'Remove',
        cancelText: 'Cancel',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (this.isEditMode && this.data.category) {
          // Remove from existing category
          this.data.category.productIds = this.data.category.productIds.filter(
            (id) => id !== productId
          );
          this.selectedProductIds = [...this.data.category.productIds];
        } else {
          // Remove from new category
          this.selectedProductIds = this.selectedProductIds.filter(
            (id) => id !== productId
          );
        }
        
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
      disableClose: true, // Prevent closing on backdrop click
      data: {
        categoryId: this.isEditMode ? this.data.category?.categoryId : undefined,
      },
    });

    // Use setTimeout to ensure event handling is complete
    setTimeout(() => {
      dialogRef.afterClosed().subscribe((result) => {
        if (result?.product) {
          const allProducts = this.storageService.products();
          const updatedProducts = [...allProducts, result.product];
          this.storageService.saveProducts(updatedProducts);

          if (this.isEditMode && this.data.category) {
            // Add to existing category
            this.data.category.productIds.push(result.product.productId);
            this.selectedProductIds = [...this.data.category.productIds];
          } else {
            // Add to new category
            this.selectedProductIds.push(result.product.productId);
          }
          
          this.loadCategoryProducts();
          this.notificationService.success('Product added to category successfully');
        }
      });
    });
  }

  assignExistingProducts(): void {
    event?.preventDefault();
    event?.stopPropagation();
  
    const dialogRef = this.dialog.open(AssignProductsDialogComponent, {
      disableClose: true,
      autoFocus: false,
      data: {
        allProducts: this.storageService.products(),
        // Use selectedProductIds for both new and existing categories
        currentProductIds: this.selectedProductIds
      }
    });
  
    setTimeout(() => {
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          if (this.isEditMode && this.data.category) {
            // Update existing category
            this.data.category.productIds = result;
          }
          
          // Always update selectedProductIds
          this.selectedProductIds = result;
          
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
        // Use selected license IDs
        licensesRequired: this.selectedLicenseIds,
        // Use selectedProductIds for both new and existing categories
        productIds: this.selectedProductIds,
      };
      this.dialogRef.close(category);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

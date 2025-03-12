import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
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
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
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
    MatRadioModule,
    MatSelectModule,
  ],
  templateUrl: './product-modal.component.html',
  styleUrls: ['./product-modal.component.scss'],
})
export class ProductModalComponent implements OnInit {
  /** Form group for product data */
  productForm!: FormGroup;

  /** Flag indicating whether we're editing an existing product or creating a new one */
  isEditMode: boolean;

  /** Lists of related products for attachments and variants */
  attachmentProducts: Product[] = [];
  variantProducts: Product[] = [];

  /** Define TraderPlus quantity modes according to documentation */
  // Sell modes
  readonly SELL_NO_MATTER = 0;
  readonly SELL_EMPTY = 1;
  readonly SELL_FULL = 2;
  readonly SELL_COEFFICIENT = 3;
  readonly SELL_STATIC = 4;

  // Buy modes
  readonly BUY_EMPTY = 0;
  readonly BUY_FULL = 2;
  readonly BUY_COEFFICIENT = 3;
  readonly BUY_STATIC = 4;

  /** Options for the trade quantity modes */
  sellModeOptions = [
    { value: 0, label: 'As-Is (No Change)' },
    { value: 1, label: 'Empty (0%)' },
    { value: 2, label: 'Full (100%)' },
    { value: 3, label: 'Percentage of Maximum' },
    { value: 4, label: 'Specific Amount' },
  ];

  buyModeOptions = [
    { value: 0, label: 'Empty (0%)' },
    { value: 2, label: 'Full (100%)' },
    { value: 3, label: 'Percentage of Maximum' },
    { value: 4, label: 'Specific Amount' },
  ];

  /** Available options for behavior at restart */
  behaviorOptions = [
    { value: 0, label: 'No change to stock' },
    { value: 1, label: 'Reset to maximum stock' },
    { value: 2, label: 'Random value between 0 and maximum' },
  ];

  /** Availability check for products */
  private availableProductsCount = 0;

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

    this.initializeForm();
  }

  /**
   * Initialize the form with the appropriate validators and default values
   */
  private initializeForm(): void {
    this.productForm = this.fb.group({
      // Basic information
      className: ['', Validators.required],
      
      // Stock configuration
      stockType: ['defined'], // 'infinite' or 'defined'
      maxStock: [100, [Validators.required, this.maxStockValidator]],
      
      // Trade Quantity configuration
      tradeQuantity: [1, [Validators.required, Validators.min(1)]],
      buyQuantityMode: [this.BUY_FULL],
      sellQuantityMode: [this.SELL_NO_MATTER],
      buyQuantityValue: [0, [Validators.min(0)]],
      sellQuantityValue: [0, [Validators.min(0)]],
      
      // Price configuration
      priceType: ['static'], // 'static' or 'dynamic'
      buyPrice: [0, [Validators.required, Validators.min(0)]],
      sellPrice: [0, [Validators.required, Validators.min(0)]],
      minPrice: [0, [Validators.required, Validators.min(0)]],
      maxPrice: [0, [Validators.required, Validators.min(0)]],
      
      // Coefficient is calculated or user-defined depending on priceType
      coefficient: [1, [Validators.required, Validators.min(0)]],
      
      // Stock settings components
      destockCoefficient: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      behaviorAtRestart: [0],
      
      // Combined stock settings (calculated from components)
      stockSettings: [0, [Validators.required]],
      
      // Product relationships
      attachments: [''],
      variants: [''],
    }, { validators: [this.priceValidator] });
    
    // Setup conditional validation based on form value changes
    this.setupFormListeners();
  }
  
  /**
   * Setup listeners for form controls that affect the visibility
   * or validation of other controls
   */
  private setupFormListeners(): void {
    // When stock type changes
    this.productForm.get('stockType')?.valueChanges.subscribe(stockType => {
      if (stockType === 'infinite') {
        // Set maxStock to -1 for infinite stock
        this.productForm.get('maxStock')?.setValue(-1);
        this.productForm.get('coefficient')?.setValue(0);
        
        // Disable stock-specific controls
        this.productForm.get('destockCoefficient')?.disable();
        this.productForm.get('behaviorAtRestart')?.disable();
        this.productForm.get('priceType')?.setValue('static');
        this.productForm.get('priceType')?.disable();
        
        // Set stockSettings to 0 for infinite stock
        this.productForm.get('stockSettings')?.setValue(0);
      } else {
        // Enable stock-specific controls
        this.productForm.get('destockCoefficient')?.enable();
        this.productForm.get('behaviorAtRestart')?.enable();
        this.productForm.get('priceType')?.enable();
        
        // Set maxStock to default value if currently -1
        if (this.productForm.get('maxStock')?.value === -1) {
          this.productForm.get('maxStock')?.setValue(100);
        }
        
        // Update stockSettings when re-enabling
        this.updateStockSettings();
      }
    });
    
    // When price type changes
    this.productForm.get('priceType')?.valueChanges.subscribe(priceType => {
      if (priceType === 'dynamic') {
        // For dynamic pricing, we need min and max price
        this.productForm.get('minPrice')?.enable();
        this.productForm.get('maxPrice')?.enable();
        this.productForm.get('sellPrice')?.disable();
        
        // Initial calculations if values exist
        this.updateDynamicPricing();
      } else {
        // For static pricing, we need buy and sell price
        this.productForm.get('minPrice')?.disable();
        this.productForm.get('maxPrice')?.disable();
        this.productForm.get('sellPrice')?.enable();
      }
    });
    
    // Listen for changes to values that affect stockSettings calculation
    this.productForm.get('destockCoefficient')?.valueChanges.subscribe(() => this.updateStockSettings());
    this.productForm.get('behaviorAtRestart')?.valueChanges.subscribe(() => this.updateStockSettings());
    
    // Listen for changes to dynamic price inputs
    this.productForm.get('minPrice')?.valueChanges.subscribe(() => this.updateDynamicPricing());
    this.productForm.get('maxPrice')?.valueChanges.subscribe(() => this.updateDynamicPricing());

    // When buy quantity mode changes
    this.productForm.get('buyQuantityMode')?.valueChanges.subscribe(mode => {
      const buyQuantityValue = this.productForm.get('buyQuantityValue');
      
      if (mode === this.BUY_COEFFICIENT || mode === this.BUY_STATIC) {
        buyQuantityValue?.enable();
        
        // Add validators based on mode
        if (mode === this.BUY_COEFFICIENT) {
          buyQuantityValue?.setValidators([Validators.required, Validators.min(0), Validators.max(100)]);
        } else {
          buyQuantityValue?.setValidators([Validators.required, Validators.min(0)]);
        }
      } else {
        buyQuantityValue?.disable();
      }
      
      buyQuantityValue?.updateValueAndValidity();
      this.updateTradeQuantityValue();
    });

    // When sell quantity mode changes
    this.productForm.get('sellQuantityMode')?.valueChanges.subscribe(mode => {
      const sellQuantityValue = this.productForm.get('sellQuantityValue');
      
      if (mode === this.SELL_COEFFICIENT || mode === this.SELL_STATIC) {
        sellQuantityValue?.enable();
        
        // Add validators based on mode
        if (mode === this.SELL_COEFFICIENT) {
          sellQuantityValue?.setValidators([Validators.required, Validators.min(0), Validators.max(100)]);
        } else {
          sellQuantityValue?.setValidators([Validators.required, Validators.min(0)]);
        }
      } else {
        sellQuantityValue?.disable();
      }
      
      sellQuantityValue?.updateValueAndValidity();
      this.updateTradeQuantityValue();
    });

    // When buy or sell quantity values change
    this.productForm.get('buyQuantityValue')?.valueChanges.subscribe(() => this.updateTradeQuantityValue());
    this.productForm.get('sellQuantityValue')?.valueChanges.subscribe(() => this.updateTradeQuantityValue());
  }
  
  /**
   * Update coefficient and buyPrice based on dynamic pricing inputs
   */
  private updateDynamicPricing(): void {
    if (this.productForm.get('priceType')?.value === 'dynamic') {
      const minPrice = +this.productForm.get('minPrice')?.value || 0;
      const maxPrice = +this.productForm.get('maxPrice')?.value || 0;
      
      if (maxPrice > minPrice && maxPrice > 0) {
        // Calculate coefficient based on min and max price
        const coefficient = (maxPrice - minPrice) / maxPrice;
        this.productForm.get('coefficient')?.setValue(parseFloat(coefficient.toFixed(2)));
        
        // Set buyPrice to maxPrice for dynamic pricing
        this.productForm.get('buyPrice')?.setValue(maxPrice);
      }
    }
  }
  
  /**
   * Update the stockSettings value by combining destockCoefficient and behaviorAtRestart
   */
  private updateStockSettings(): void {
    if (this.productForm.get('stockType')?.value === 'defined') {
      const destockCoefficient = Math.min(+this.productForm.get('destockCoefficient')?.value || 0, 100);
      const behaviorAtRestart = +this.productForm.get('behaviorAtRestart')?.value || 0;
      
      // Convert percentage to integer representation (0-127)
      const destockInt = Math.round(destockCoefficient);
      
      // Combine using bitwise operations
      // Bits 0-6 (7 bits): Destock coefficient (0-127)
      // Bits 7-8 (2 bits): Behavior at restart (0-3)
      const stockSettings = (behaviorAtRestart << 7) | (destockInt & 0x7F);
      
      this.productForm.get('stockSettings')?.setValue(stockSettings);
    }
  }
  
  /**
   * Extract destock coefficient and behavior at restart from combined stockSettings value
   * @param stockSettings The combined stockSettings value
   * @returns Object with separated values
   */
  private extractStockSettings(stockSettings: number): { destockCoefficient: number, behaviorAtRestart: number } {
    const destockCoefficient = stockSettings & 0x7F; // Extract bits 0-6 (7 bits)
    const behaviorAtRestart = (stockSettings >> 7) & 0x3; // Extract bits 7-8 (2 bits)
    
    return {
      destockCoefficient,
      behaviorAtRestart
    };
  }
  
  /**
   * Calculate the tradeQuantity value from the individual components
   * using bit-packing as described in the TraderPlus documentation
   */
  private updateTradeQuantityValue(): void {
    const buyMode = +this.productForm.get('buyQuantityMode')?.value || 0;
    const sellMode = +this.productForm.get('sellQuantityMode')?.value || 0;
    const buyQuantity = +this.productForm.get('buyQuantityValue')?.value || 0;
    const sellQuantity = +this.productForm.get('sellQuantityValue')?.value || 0;
    
    // Pack the bits according to the documentation:
    // - Sell mode: 3 bits (0-2)
    // - Buy mode: 3 bits (3-5)
    // - Sell quantity: 13 bits (6-18)
    // - Buy quantity: remaining bits (19+)
    const tradeQuantityValue = 
      (sellMode & 0x7) |             // Sell mode in bits 0-2
      ((buyMode & 0x7) << 3) |       // Buy mode in bits 3-5
      ((sellQuantity & 0x1FFF) << 6) | // Sell quantity in bits 6-18
      ((buyQuantity & 0xFFFFFFFF) << 19); // Buy quantity in bits 19+
    
    this.productForm.get('tradeQuantity')?.setValue(tradeQuantityValue);
  }
  
  /**
   * Extract the individual components from a tradeQuantity value
   * @param tradeQuantity The packed trade quantity value
   */
  private extractTradeQuantityComponents(tradeQuantity: number): {
    sellMode: number;
    buyMode: number;
    sellQuantity: number;
    buyQuantity: number;
  } {
    return {
      sellMode: tradeQuantity & 0x7,                // Extract bits 0-2
      buyMode: (tradeQuantity >> 3) & 0x7,          // Extract bits 3-5
      sellQuantity: (tradeQuantity >> 6) & 0x1FFF,  // Extract bits 6-18
      buyQuantity: (tradeQuantity >> 19) & 0xFFFFFFFF, // Extract bits 19+
    };
  }

  /**
   * Validator for maxStock field
   * - Only -1 (infinite) or values > 0 are allowed
   */
  private maxStockValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    
    if (value === -1 || value > 0) {
      return null;
    }
    
    return { invalidMaxStock: true };
  }
  
  /**
   * Form-level validator for price-related fields
   * - For static pricing: sellPrice must be < buyPrice
   * - For dynamic pricing: minPrice must be < maxPrice
   */
  private priceValidator(form: FormGroup): ValidationErrors | null {
    const priceType = form.get('priceType')?.value;
    
    if (priceType === 'static') {
      const buyPrice = +form.get('buyPrice')?.value || 0;
      const sellPrice = +form.get('sellPrice')?.value || 0;
      
      if (sellPrice >= buyPrice) {
        return { sellPriceExceedsBuyPrice: true };
      }
    } else if (priceType === 'dynamic') {
      const minPrice = +form.get('minPrice')?.value || 0;
      const maxPrice = +form.get('maxPrice')?.value || 0;
      
      if (minPrice >= maxPrice) {
        return { minPriceExceedsMaxPrice: true };
      }
    }
    
    return null;
  }

  /**
   * OnInit lifecycle hook - Loads product data if in edit mode
   */
  ngOnInit(): void {
    // Cache the count of available products for button enabling/disabling
    this.availableProductsCount = this.storageService.products().length;

    if (this.isEditMode && this.data.product) {
      const allProducts = this.storageService.products();
      this.attachmentProducts = allProducts.filter((p) =>
        this.data.product?.attachments?.includes(p.productId)
      );
      this.variantProducts = allProducts.filter((p) =>
        this.data.product?.variants?.includes(p.productId)
      );

      // Determine stock type based on maxStock value
      const stockType = this.data.product.maxStock === -1 ? 'infinite' : 'defined';
      
      // Extract stock settings components if defined stock
      const { destockCoefficient, behaviorAtRestart } = 
        this.extractStockSettings(this.data.product.stockSettings);
      
      // Extract trade quantity components
      const { sellMode, buyMode, sellQuantity, buyQuantity } = 
        this.extractTradeQuantityComponents(this.data.product.tradeQuantity);
      
      // Determine price type based on coefficient value
      // This is a heuristic - if coefficient is significant, assume dynamic pricing
      const priceType = this.data.product.coefficient > 0.05 ? 'dynamic' : 'static';
      
      // Calculate min price for dynamic pricing
      let minPrice = 0;
      if (priceType === 'dynamic' && this.data.product.coefficient > 0) {
        const buyPrice = this.data.product.buyPrice;
        const coefficient = this.data.product.coefficient;
        minPrice = buyPrice * (1 - coefficient);
      }
      
      // Update the form values
      this.productForm.patchValue({
        className: this.data.product.className,
        stockType: stockType,
        maxStock: this.data.product.maxStock,
        tradeQuantity: this.data.product.tradeQuantity,
        buyQuantityMode: buyMode,
        sellQuantityMode: sellMode,
        buyQuantityValue: buyQuantity,
        sellQuantityValue: sellQuantity,
        priceType: priceType,
        buyPrice: this.data.product.buyPrice,
        sellPrice: this.data.product.sellPrice,
        minPrice: minPrice,
        maxPrice: this.data.product.buyPrice, // maxPrice is buyPrice in dynamic pricing
        coefficient: this.data.product.coefficient,
        destockCoefficient: destockCoefficient,
        behaviorAtRestart: behaviorAtRestart,
        stockSettings: this.data.product.stockSettings,
        attachments: this.attachmentProducts.map((p) => p.productId).join(', '),
        variants: this.variantProducts.map((p) => p.productId),
      });
      
      // Apply conditional disabling based on stock and price type
      if (stockType === 'infinite') {
        this.productForm.get('destockCoefficient')?.disable();
        this.productForm.get('behaviorAtRestart')?.disable();
        this.productForm.get('priceType')?.disable();
      }
      
      if (priceType === 'dynamic') {
        this.productForm.get('sellPrice')?.disable();
      } else {
        this.productForm.get('minPrice')?.disable();
        this.productForm.get('maxPrice')?.disable();
      }

      // Apply conditional disabling based on trade quantity modes
      if (sellMode !== this.SELL_COEFFICIENT && sellMode !== this.SELL_STATIC) {
        this.productForm.get('sellQuantityValue')?.disable();
      }
      
      if (buyMode !== this.BUY_COEFFICIENT && buyMode !== this.BUY_STATIC) {
        this.productForm.get('buyQuantityValue')?.disable();
      }
    } else {
      // Initialize for new product
      // Default: start with defined stock and static pricing
      this.productForm.get('minPrice')?.disable();
      this.productForm.get('maxPrice')?.disable();
      
      // Default trade quantity settings
      this.productForm.get('buyQuantityMode')?.setValue(this.BUY_FULL);
      this.productForm.get('sellQuantityMode')?.setValue(this.SELL_NO_MATTER);
      this.productForm.get('buyQuantityValue')?.disable();
      this.productForm.get('sellQuantityValue')?.disable();
      
      // Initialize with default packed trade quantity value
      this.updateTradeQuantityValue();
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
   * Checks if there are available products to assign
   * Used to enable/disable the attachment and variant buttons
   */
  hasAvailableProducts(): boolean {
    return this.availableProductsCount > 0;
  }

  /**
   * Handles form submission
   * Validates the form, creates or updates the product, and closes the dialog
   */
  onSubmit(): void {
    // Re-enable disabled controls to include their values in the submission
    const stockType = this.productForm.get('stockType')?.value;
    const priceType = this.productForm.get('priceType')?.value;
    
    if (stockType === 'defined') {
      this.productForm.get('destockCoefficient')?.enable();
      this.productForm.get('behaviorAtRestart')?.enable();
    }
    
    if (priceType === 'dynamic') {
      this.productForm.get('sellPrice')?.enable();
    } else {
      this.productForm.get('minPrice')?.enable();
      this.productForm.get('maxPrice')?.enable();
    }
    
    // Ensure trade quantity value is calculated from the components
    this.updateTradeQuantityValue();
    
    if (this.productForm.valid) {
      const formValue = this.productForm.value;

      // For new products, generate ID based on className
      // For existing products, preserve the original ID
      const productId = this.isEditMode
        ? this.data.product?.productId
        : this.generateProductId(formValue.className);

      const product: Partial<Product> = {
        className: formValue.className,
        maxStock: formValue.maxStock,
        tradeQuantity: formValue.tradeQuantity,
        stockSettings: formValue.stockSettings,
        productId: productId,
        attachments: this.attachmentProducts.map((p) => p.productId),
        variants: this.variantProducts.map((p) => p.productId),
      };
      
      // Set price-related fields based on price type
      if (priceType === 'dynamic') {
        // For dynamic pricing, buyPrice is maxPrice
        product.buyPrice = formValue.maxPrice;
        // For consistency, sellPrice is minPrice
        product.sellPrice = formValue.minPrice;
        // Coefficient is calculated based on price difference
        product.coefficient = formValue.coefficient;
      } else {
        // For static pricing, use direct values
        product.buyPrice = formValue.buyPrice;
        product.sellPrice = formValue.sellPrice;
        // For infinite stock, coefficient should be 0
        product.coefficient = stockType === 'infinite' ? 0 : formValue.coefficient;
      }

      this.dialogRef.close({
        product,
        categoryId: this.data.categoryId,
      });
    } else {
      // Find the first invalid control
      const firstInvalidControl = this.findInvalidControls().pop();
      let errorMessage = 'Please fix the following errors:';
      
      // Form-level errors
      if (this.productForm.hasError('sellPriceExceedsBuyPrice')) {
        errorMessage += ' Sell price must be less than buy price.';
      }
      
      if (this.productForm.hasError('minPriceExceedsMaxPrice')) {
        errorMessage += ' Minimum price must be less than maximum price.';
      }
      
      // Display the error message
      this.notificationService.error(errorMessage);
    }
  }

  /**
   * Find all invalid controls in the form
   * @returns List of invalid control names
   */
  private findInvalidControls(): string[] {
    const invalidControls: string[] = [];
    const controls = this.productForm.controls;
    
    for (const name in controls) {
      if (controls[name].invalid) {
        invalidControls.push(name);
      }
    }
    
    return invalidControls;
  }

  /**
   * Handles cancel button click
   * Closes the dialog without saving changes
   */
  onCancel(): void {
    this.dialogRef.close();
  }
}

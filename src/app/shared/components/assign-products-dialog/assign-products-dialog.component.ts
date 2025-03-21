import {
  Component,
  ElementRef,
  Inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

// Application imports
import { Product } from '../../../core/models';

@Component({
  selector: 'app-assign-products-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatTooltipModule,
  ],
  templateUrl: './assign-products-dialog.component.html',
  styleUrls: ['./assign-products-dialog.component.scss'],
})
export class AssignProductsDialogComponent implements OnInit {
  // Products displayed in the lists
  availableProducts: Product[] = [];
  selectedProducts: Product[] = [];
  hasAnyProducts = false;

  // Filtering
  filterValue: string = '';

  // References to all products (filtered or not)
  private unfilteredAvailableProducts: Product[] = [];
  private unfilteredSelectedProducts: Product[] = [];

  // Lazy loading parameters
  private readonly BATCH_SIZE = 100;
  private displayedAvailableCount = 0;
  private displayedSelectedCount = 0;
  public isFiltering = false;

  // Loader for operations
  isProcessing = false;

  // References for scroll containers
  @ViewChild('availableContainer') availableContainer!: ElementRef;
  @ViewChild('selectedContainer') selectedContainer!: ElementRef;

  constructor(
    private dialogRef: MatDialogRef<AssignProductsDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      allProducts: Product[];
      currentProductIds: string[];
    }
  ) {}

  ngOnInit(): void {
    this.initializeLists();
    this.hasAnyProducts = this.data.allProducts.length > 0;
  }

  private initializeLists(): void {
    // Initialize complete lists
    this.unfilteredSelectedProducts = this.data.allProducts.filter((p) =>
      this.data.currentProductIds.includes(p.productId)
    );
    this.unfilteredAvailableProducts = this.data.allProducts.filter(
      (p) => !this.data.currentProductIds.includes(p.productId)
    );

    // Fill initial lists with the first BATCH_SIZE entries
    this.displayedAvailableCount = Math.min(
      this.BATCH_SIZE,
      this.unfilteredAvailableProducts.length
    );
    this.displayedSelectedCount = Math.min(
      this.BATCH_SIZE,
      this.unfilteredSelectedProducts.length
    );

    this.availableProducts = this.unfilteredAvailableProducts.slice(
      0,
      this.displayedAvailableCount
    );
    this.selectedProducts = this.unfilteredSelectedProducts.slice(
      0,
      this.displayedSelectedCount
    );
  }

  applyFilter(filterValue: string): void {
    this.isProcessing = true;
    setTimeout(() => {
      const filter = filterValue.toLowerCase().trim();
      this.filterValue = filter;

      if (filter) {
        // When filtering is active, show all matching entries
        this.isFiltering = true;
        this.availableProducts = this.unfilteredAvailableProducts.filter(
          (product) => product.className.toLowerCase().includes(filter)
        );
        this.selectedProducts = this.unfilteredSelectedProducts.filter(
          (product) => product.className.toLowerCase().includes(filter)
        );

        // Show all matching products when filtering
        this.displayedAvailableCount = this.availableProducts.length;
        this.displayedSelectedCount = this.selectedProducts.length;
      } else {
        // Reset to lazy loading when filter is empty
        this.isFiltering = false;
        this.displayedAvailableCount = Math.min(
          this.BATCH_SIZE,
          this.unfilteredAvailableProducts.length
        );
        this.displayedSelectedCount = Math.min(
          this.BATCH_SIZE,
          this.unfilteredSelectedProducts.length
        );

        this.availableProducts = this.unfilteredAvailableProducts.slice(
          0,
          this.displayedAvailableCount
        );
        this.selectedProducts = this.unfilteredSelectedProducts.slice(
          0,
          this.displayedSelectedCount
        );
      }

      this.isProcessing = false;
    }, 10);
  }

  moveToSelected(product: Product): void {
    this.moveProduct(product, this.availableProducts, this.selectedProducts);
  }

  moveToAvailable(product: Product): void {
    this.moveProduct(product, this.selectedProducts, this.availableProducts);
  }

  moveAllVisibleToSelected(): void {
    const startTime = performance.now();
    this.isProcessing = true;

    // Use all products from either the unfiltered or filtered list
    const productsToMove = this.isFiltering
      ? [...this.availableProducts]
      : [...this.unfilteredAvailableProducts];

    setTimeout(() => {
      // Move all products to the selected list
      productsToMove.forEach((product) => {
        const index = this.unfilteredAvailableProducts.findIndex(
          (p) => p.productId === product.productId
        );
        if (index > -1) {
          const [movedProduct] = this.unfilteredAvailableProducts.splice(
            index,
            1
          );
          this.unfilteredSelectedProducts.push(movedProduct);
        }
      });

      // Rebuild lists
      if (this.isFiltering) {
        // Recalculate filtered lists when filter is active
        this.applyFilter(this.filterValue);
      } else {
        // Show first BATCH_SIZE entries when filter is inactive
        this.displayedAvailableCount = Math.min(
          this.BATCH_SIZE,
          this.unfilteredAvailableProducts.length
        );
        this.displayedSelectedCount = Math.min(
          this.BATCH_SIZE,
          this.unfilteredSelectedProducts.length
        );

        this.availableProducts = this.unfilteredAvailableProducts.slice(
          0,
          this.displayedAvailableCount
        );
        this.selectedProducts = this.unfilteredSelectedProducts.slice(
          0,
          this.displayedSelectedCount
        );
      }

      // Hide loader when finished
      this.isProcessing = false;
    }, Math.max(10, performance.now() - startTime > 300 ? 0 : 300));
  }

  moveAllVisibleToAvailable(): void {
    const startTime = performance.now();
    this.isProcessing = true;

    // Use all products from either the unfiltered or filtered list
    const productsToMove = this.isFiltering
      ? [...this.selectedProducts]
      : [...this.unfilteredSelectedProducts];

    setTimeout(() => {
      // Move all products to the available list
      productsToMove.forEach((product) => {
        const index = this.unfilteredSelectedProducts.findIndex(
          (p) => p.productId === product.productId
        );
        if (index > -1) {
          const [movedProduct] = this.unfilteredSelectedProducts.splice(
            index,
            1
          );
          this.unfilteredAvailableProducts.push(movedProduct);
        }
      });

      // Rebuild lists
      if (this.isFiltering) {
        // Recalculate filtered lists when filter is active
        this.applyFilter(this.filterValue);
      } else {
        // Show first BATCH_SIZE entries when filter is inactive
        this.displayedAvailableCount = Math.min(
          this.BATCH_SIZE,
          this.unfilteredAvailableProducts.length
        );
        this.displayedSelectedCount = Math.min(
          this.BATCH_SIZE,
          this.unfilteredSelectedProducts.length
        );

        this.availableProducts = this.unfilteredAvailableProducts.slice(
          0,
          this.displayedAvailableCount
        );
        this.selectedProducts = this.unfilteredSelectedProducts.slice(
          0,
          this.displayedSelectedCount
        );
      }

      // Hide loader when finished
      this.isProcessing = false;
    }, Math.max(10, performance.now() - startTime > 300 ? 0 : 300));
  }

  private moveProduct(
    product: Product,
    fromArray: Product[],
    toArray: Product[]
  ): void {
    const startTime = performance.now();

    // First move in the unfiltered arrays
    if (fromArray === this.availableProducts) {
      const index = this.unfilteredAvailableProducts.findIndex(
        (p) => p.productId === product.productId
      );
      if (index > -1) {
        const [movedProduct] = this.unfilteredAvailableProducts.splice(
          index,
          1
        );
        this.unfilteredSelectedProducts.push(movedProduct);
      }
    } else {
      const index = this.unfilteredSelectedProducts.findIndex(
        (p) => p.productId === product.productId
      );
      if (index > -1) {
        const [movedProduct] = this.unfilteredSelectedProducts.splice(index, 1);
        this.unfilteredAvailableProducts.push(movedProduct);
      }
    }

    // Reapply filter to update the display
    if (this.isFiltering) {
      // Simple removal when filtering is active
      const displayIndex = fromArray.findIndex(
        (p) => p.productId === product.productId
      );
      if (displayIndex > -1) {
        fromArray.splice(displayIndex, 1);
        toArray.push(product);
      }
    } else {
      // Recalculate lists when filtering is inactive
      this.displayedAvailableCount = Math.min(
        this.BATCH_SIZE,
        this.unfilteredAvailableProducts.length
      );
      this.displayedSelectedCount = Math.min(
        this.BATCH_SIZE,
        this.unfilteredSelectedProducts.length
      );

      this.availableProducts = this.unfilteredAvailableProducts.slice(
        0,
        this.displayedAvailableCount
      );
      this.selectedProducts = this.unfilteredSelectedProducts.slice(
        0,
        this.displayedSelectedCount
      );
    }

    // Show loader if the action takes longer
    if (performance.now() - startTime > 300) {
      this.isProcessing = true;
      setTimeout(() => {
        this.isProcessing = false;
      }, 100);
    }
  }

  onScroll(container: 'available' | 'selected'): void {
    // No endless scroll function when filter is active
    if (this.isFiltering) return;

    if (container === 'available') {
      const element = this.availableContainer.nativeElement;
      // Check if we're near the end of the container
      if (
        element.scrollHeight - element.scrollTop - element.clientHeight <
        50
      ) {
        // Check if there are more products
        if (
          this.displayedAvailableCount < this.unfilteredAvailableProducts.length
        ) {
          // Load more products
          const newCount = Math.min(
            this.displayedAvailableCount + this.BATCH_SIZE,
            this.unfilteredAvailableProducts.length
          );

          // Show more products
          this.availableProducts = this.unfilteredAvailableProducts.slice(
            0,
            newCount
          );
          this.displayedAvailableCount = newCount;
        }
      }
    } else if (container === 'selected') {
      const element = this.selectedContainer.nativeElement;
      // Check if we're near the end of the container
      if (
        element.scrollHeight - element.scrollTop - element.clientHeight <
        50
      ) {
        // Check if there are more products
        if (
          this.displayedSelectedCount < this.unfilteredSelectedProducts.length
        ) {
          // Load more products
          const newCount = Math.min(
            this.displayedSelectedCount + this.BATCH_SIZE,
            this.unfilteredSelectedProducts.length
          );

          // Show more products
          this.selectedProducts = this.unfilteredSelectedProducts.slice(
            0,
            newCount
          );
          this.displayedSelectedCount = newCount;
        }
      }
    }
  }

  onSave(): void {
    // Use the unfiltered list for saving
    this.dialogRef.close(
      this.unfilteredSelectedProducts.map((p) => p.productId)
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  // Display list information texts
  getAvailableCountText(): string {
    return this.isFiltering
      ? `${this.availableProducts.length} matching products`
      : `${this.displayedAvailableCount} of ${this.unfilteredAvailableProducts.length} products`;
  }

  getSelectedCountText(): string {
    return this.isFiltering
      ? `${this.selectedProducts.length} matching products`
      : `${this.displayedSelectedCount} of ${this.unfilteredSelectedProducts.length} products`;
  }
}

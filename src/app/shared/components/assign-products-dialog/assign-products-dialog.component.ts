import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
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
    MatTooltipModule
  ],
  templateUrl:
    './assign-products-dialog.component.html',
  styleUrls: [
    './assign-products-dialog.component.scss',
  ],
})
export class AssignProductsDialogComponent implements OnInit {
  availableProducts: Product[] = [];
  selectedProducts: Product[] = [];
  hasAnyProducts = false;

  filterValue: string = '';
  private unfilteredAvailableProducts: Product[] = [];
  private unfilteredSelectedProducts: Product[] = [];

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
    this.unfilteredSelectedProducts = this.data.allProducts.filter((p) =>
      this.data.currentProductIds.includes(p.productId)
    );
    this.unfilteredAvailableProducts = this.data.allProducts.filter(
      (p) => !this.data.currentProductIds.includes(p.productId)
    );
    this.selectedProducts = [...this.unfilteredSelectedProducts];
    this.availableProducts = [...this.unfilteredAvailableProducts];
  }

  applyFilter(filterValue: string): void {
    const filter = filterValue.toLowerCase().trim();

    if (filter) {
      // Filter only the display, don't modify unfilteredArrays
      this.availableProducts = this.unfilteredAvailableProducts.filter(
        (product) => product.className.toLowerCase().includes(filter)
      );
      this.selectedProducts = this.unfilteredSelectedProducts.filter(
        (product) => product.className.toLowerCase().includes(filter)
      );
    } else {
      // Show all products when filter is empty
      this.availableProducts = [...this.unfilteredAvailableProducts];
      this.selectedProducts = [...this.unfilteredSelectedProducts];
    }
  }

  moveToSelected(product: Product): void {
    this.moveProduct(product, this.availableProducts, this.selectedProducts);
  }

  moveToAvailable(product: Product): void {
    this.moveProduct(product, this.selectedProducts, this.availableProducts);
  }

  moveAllVisibleToSelected(): void {
    // Move all currently visible products to the selected list
    for (const product of [...this.availableProducts]) {
      this.moveToSelected(product);
    }
  }

  moveAllVisibleToAvailable(): void {
    // Move all currently visible products to the available list
    for (const product of [...this.selectedProducts]) {
      this.moveToAvailable(product);
    }
  }

  private moveProduct(
    product: Product,
    fromArray: Product[],
    toArray: Product[]
  ): void {
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
    this.applyFilter(this.filterValue);
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
}

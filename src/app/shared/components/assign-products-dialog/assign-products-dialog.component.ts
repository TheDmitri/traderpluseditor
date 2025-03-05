import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule, MatSelectionList } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { Product } from '../../../core/models';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';

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
    '../../../shared/components/assign-products-dialog/assign-products-dialog.component.html',
  styleUrls: [
    '../../../shared/components/assign-products-dialog/assign-products-dialog.component.scss',
  ],
})
export class AssignProductsDialogComponent implements OnInit {
  availableProducts: Product[] = [];
  selectedProducts: Product[] = [];

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
      // Nur die Anzeige filtern, nicht die unfilteredArrays verändern
      this.availableProducts = this.unfilteredAvailableProducts.filter(
        (product) => product.className.toLowerCase().includes(filter)
      );
      this.selectedProducts = this.unfilteredSelectedProducts.filter(
        (product) => product.className.toLowerCase().includes(filter)
      );
    } else {
      // Bei leerem Filter alle Produkte anzeigen
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
    // Verschiebe alle aktuell sichtbaren Produkte in die selected Liste
    for (const product of [...this.availableProducts]) {
      this.moveToSelected(product);
    }
  }

  moveAllVisibleToAvailable(): void {
    // Verschiebe alle aktuell sichtbaren Produkte in die available Liste
    for (const product of [...this.selectedProducts]) {
      this.moveToAvailable(product);
    }
  }

  private moveProduct(
    product: Product,
    fromArray: Product[],
    toArray: Product[]
  ): void {
    // Erst in den ungefilterten Arrays verschieben
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

    // Filter neu anwenden, um die Anzeige zu aktualisieren
    this.applyFilter(this.filterValue);
  }

  onSave(): void {
    // Nutze die ungefilterte Liste für das Speichern
    this.dialogRef.close(
      this.unfilteredSelectedProducts.map((p) => p.productId)
    );
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

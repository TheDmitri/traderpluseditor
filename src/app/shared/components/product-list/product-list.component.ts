import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  SimpleChanges,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Product } from '../../../core/models';
import { StorageService } from '../../../core/services/storage.service';
import { NotificationService } from '../../services/notification.service';
import { MatTooltip } from '@angular/material/tooltip';

export interface ProductWithCategories extends Product {
  categories?: string[];
  coefficient: number;
  maxStock: number;
  tradeQuantity: number;
  buyPrice: number;
  sellPrice: number;
  stockSettings: number;
  attachments: string[];
  variants: string[];
}

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTooltip,
    MatButtonModule,
  ],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
})
export class ProductListComponent implements OnInit {
  @Input() products: Product[] = [];
  @Input() showActions = true;
  @Output() productRemoved = new EventEmitter<string>();
  @Output() productEdited = new EventEmitter<Product>();

  dataSource: MatTableDataSource<ProductWithCategories>;
  displayedColumns: string[] = [
    'className',
    'categories',
    'coefficient',
    'maxStock',
    'tradeQuantity',
    'buyPrice',
    'sellPrice',
    'stockSettings',
    'attachments',
    'variants',
    'actions',
  ];

  // Add a flag to track if products are available
  hasProducts = false;

  // Add helper method to format stock settings
  formatStockSettings(value: number): string {
    try {
      const destockCoefficient = (value & 0x7f) * 0.01;
      const behaviorAtRestart = (value >> 7) & 0x03;
      const behaviors = ['No Change', 'Reset Max', 'Random', 'Reserved'];

      return `${destockCoefficient.toFixed(2)}% / ${
        behaviors[behaviorAtRestart]
      }`;
    } catch (error) {
      this.notificationService.error('Error formatting stock settings');
      return 'Invalid';
    }
  }

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private storageService: StorageService,
    private notificationService: NotificationService
  ) {
    this.dataSource = new MatTableDataSource<ProductWithCategories>([]);
  }

  ngOnInit(): void {
    if (this.showActions) {
      // Initialize with data
      const productsWithCategories = this.addCategoryInfo(this.products);
      this.hasProducts = productsWithCategories.length > 0;
      
      // Only show notification if we're not on initial load
      if (productsWithCategories.length === 0 && this.products.length > 0) {
        this.notificationService.error('No products available');
      }
      this.dataSource.data = productsWithCategories;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['products']) {
      const productsWithCategories = this.addCategoryInfo(this.products);
      this.dataSource.data = productsWithCategories;
      this.hasProducts = productsWithCategories.length > 0;

      // Only show notification if products were previously available but filter returned none
      if (changes['products'].currentValue?.length === 0 && 
          changes['products'].previousValue?.length > 0) {
        this.notificationService.error('No products match the current filter');
      }
    }
  }

  private addCategoryInfo(products: Product[]): ProductWithCategories[] {
    try {
      const categories = this.storageService.categories();
  
      return products.map((product) => {
        const productCategories = categories
          .filter((category) => category.productIds.includes(product.productId))
          .map((category) => category.categoryName)
          .sort(); // Sort categories alphabetically for better readability in tooltips
  
        return {
          ...product,
          categories: productCategories,
        };
      });
    } catch (error) {
      this.notificationService.error('Error loading product categories');
      return [];
    }
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  applyFilter(event: Event): void {
    // Only apply filter if we have products
    if (!this.hasProducts) return;
    
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }

    // Only notify if we have products in the dataset but none match the filter
    if (this.dataSource.filteredData.length === 0 && this.dataSource.data.length > 0) {
      this.notificationService.error('No products match the search criteria');
    }
  }
}

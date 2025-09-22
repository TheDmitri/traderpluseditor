import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

// Application imports
import { Product } from '../../../core/models';
import { PaginatedResult, StorageService } from '../../../core/services';
import { NotificationService } from '../../services';
import {
  BehaviorSubject,
  Observable,
  Subject,
  Subscription,
  debounceTime,
  distinctUntilChanged,
  takeUntil,
} from 'rxjs';

export interface ProductWithCategories extends Product {
  categories?: string[];
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
    MatTooltipModule,
    MatButtonModule,
  ],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListComponent implements OnInit, OnChanges, OnDestroy {
  @Input() products: Product[] = [];
  @Input() showActions = true;
  // Input parameter to specify whether to use externally provided products
  @Input() useExternalProducts = false;
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

  // Pagination state
  totalProducts = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [10, 25, 50, 100];

  // Local data state
  productsWithCategories: ProductWithCategories[] = [];

  // Flag to track if products are available
  hasProducts = false;
  isLoading = false;

  // Filter handling
  filterValue = '';
  private filterSubject = new Subject<string>();

  // Sorting state
  private currentSort: Sort = { active: '', direction: '' };

  // Cleanup
  private destroy$ = new Subject<void>();
  private subscriptions: Subscription[] = [];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // Local data for external products (when useExternalProducts=true)
  private allExternalProducts: ProductWithCategories[] = [];

  constructor(
    private storageService: StorageService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {
    this.dataSource = new MatTableDataSource<ProductWithCategories>([]);

    // Set up filter debounce
    this.filterSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((filter) => {
        this.filterValue = filter;
        this.pageIndex = 0; // Reset to first page on filter change
        if (this.paginator) {
          this.paginator.pageIndex = 0;
        }
        this.loadProductsPage();
      });
  }

  ngOnInit(): void {
    if (this.showActions && !this.useExternalProducts) {
      // Load first page of products with pagination - only when not using external products
      this.loadProductsPage();
    } else if (this.products?.length) {
      // If products are provided directly (e.g., for preview or in category modal)
      this.processExternalProducts();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['products'] && !changes['products'].firstChange) {
      if (
        (this.useExternalProducts || !this.showActions) &&
        this.products?.length
      ) {
        // Process external products if they're provided and we're using external products mode
        this.processExternalProducts();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  /**
   * Process products provided externally (e.g., for preview)
   */
  private processExternalProducts(): void {
    if (!this.products.length) {
      this.dataSource.data = [];
      this.hasProducts = false;
      this.cdr.markForCheck();
      return;
    }

    // Prepare products with categories
    this.addCategoryInfoBulk(this.products).then((productsWithCategories) => {
      // For external products with useExternalProducts, store all products for local pagination
      this.allExternalProducts = productsWithCategories;
      this.totalProducts = productsWithCategories.length;
      this.hasProducts = true;

      // If in external mode and pagination should be displayed, use local pagination
      if (this.useExternalProducts && this.showActions) {
        this.loadExternalProductsPage(this.pageIndex, this.pageSize);
      } else {
        // If no pagination is desired, display all products
        this.productsWithCategories = productsWithCategories;
        this.dataSource.data = productsWithCategories;

        // Manually apply sorting if active
        if (this.currentSort.active) {
          this.applySortToData();
        }
      }

      this.cdr.markForCheck();
    });
  }

  /**
   * Add category info to products in bulk
   */
  private async addCategoryInfoBulk(
    products: Product[]
  ): Promise<ProductWithCategories[]> {
    if (!products.length) return [];

    try {
      // Process in batches of 50 for better performance with large datasets
      const batchSize = 50;
      const result: ProductWithCategories[] = [];

      for (let i = 0; i < products.length; i += batchSize) {
        const batch = products.slice(i, i + batchSize);

        // Process each product in the batch
        const batchWithCategories = batch.map((product) => {
          const categories = this.storageService.getCategoriesForProduct(
            product.productId
          );
          return { ...product, categories };
        });

        result.push(...batchWithCategories);

        // Allow UI to update if processing large datasets (yield to main thread)
        if (i + batchSize < products.length && i % (batchSize * 4) === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      return result;
    } catch (error) {
      console.error('Error adding category info to products:', error);
      this.notificationService.error('Error loading product categories');
      return products.map((product) => ({ ...product, categories: [] }));
    }
  }

  /**
   * Local pagination for external products
   */
  private loadExternalProductsPage(pageIndex: number, pageSize: number): void {
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;

    // Filter if a filter is set
    let filteredProducts = [...this.allExternalProducts];
    if (this.filterValue) {
      const filterLower = this.filterValue.toLowerCase();
      filteredProducts = this.allExternalProducts.filter(
        (product) =>
          product.className.toLowerCase().includes(filterLower) ||
          product.productId.toLowerCase().includes(filterLower)
      );
    }

    // Apply sorting if active
    if (this.currentSort.active && this.currentSort.direction) {
      filteredProducts = this.sortProducts(filteredProducts);
    }

    // Apply pagination
    const startIndex = pageIndex * pageSize;
    this.productsWithCategories = filteredProducts.slice(
      startIndex,
      startIndex + pageSize
    );
    this.dataSource.data = this.productsWithCategories;

    // Set total count for paginator (important for correct pagination)
    this.totalProducts = filteredProducts.length;

    this.cdr.markForCheck();
  }

  /**
   * Sort products (for external products)
   */
  private sortProducts(
    products: ProductWithCategories[]
  ): ProductWithCategories[] {
    if (!this.currentSort.active || !this.currentSort.direction) {
      return products;
    }

    const direction = this.currentSort.direction === 'asc' ? 1 : -1;
    const active = this.currentSort.active;

    return [...products].sort((a, b) => {
      // Handle special cases
      if (active === 'categories') {
        const aCategories = a.categories || [];
        const bCategories = b.categories || [];
        return (
          aCategories.join(',').localeCompare(bCategories.join(',')) * direction
        );
      } else if (active === 'attachments' || active === 'variants') {
        const aLength = a[active]?.length || 0;
        const bLength = b[active]?.length || 0;
        return (aLength - bLength) * direction;
      }

      // Handle regular properties
      const aValue = a[active as keyof Product];
      const bValue = b[active as keyof Product];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * direction;
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }

      return 0;
    });
  }

  /**
   * Load a page of products
   */
  loadProductsPage(pageIndex = this.pageIndex, pageSize = this.pageSize): void {
    // For external products, use local pagination
    if (this.useExternalProducts && this.showActions) {
      this.loadExternalProductsPage(pageIndex, pageSize);
      return;
    }

    // Skip if not using pagination mode or using external products
    if (!this.showActions) return;

    this.isLoading = true;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;

    // Subscribe to paginated products
    const sub = this.storageService
      .getPaginatedProducts(pageIndex, pageSize, this.filterValue)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: PaginatedResult<Product>) => {
          this.totalProducts = result.total;
          this.hasProducts = result.total > 0;

          // Process products to add category info
          if (result.items.length > 0) {
            this.addCategoryInfoBulk(result.items).then(
              (productsWithCategories) => {
                this.productsWithCategories = productsWithCategories;
                this.dataSource.data = productsWithCategories;

                // Apply sort if active
                if (this.currentSort.active && this.sort) {
                  this.applySortToData();
                }

                this.isLoading = false;
                this.cdr.markForCheck();
              }
            );
          } else {
            // When no items are returned
            this.productsWithCategories = [];
            this.dataSource.data = [];
            this.isLoading = false;
            this.cdr.markForCheck();

            // Show notification if no products match the filter and we have a filter
            if (result.total === 0 && this.filterValue) {
              this.notificationService.error(
                'No products match the search criteria'
              );
            }
          }
        },
        error: (err) => {
          console.error('Error loading products:', err);
          this.notificationService.error('Error loading products');
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });

    this.subscriptions.push(sub);
  }

  /**
   * Apply filter to data
   */
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;

    // For external products, apply direct filtering
    if (this.useExternalProducts) {
      this.filterValue = filterValue.trim().toLowerCase();
      this.pageIndex = 0;
      if (this.paginator) {
        this.paginator.pageIndex = 0;
      }
      this.loadExternalProductsPage(0, this.pageSize);
      return;
    }

    // Normal filter flow with debounce
    this.filterSubject.next(filterValue.trim().toLowerCase());
  }

  /**
   * Apply current sort to data
   */
  private applySortToData(): void {
    if (!this.currentSort.active || !this.currentSort.direction) {
      return;
    }

    const direction = this.currentSort.direction === 'asc' ? 1 : -1;
    const active = this.currentSort.active;

    this.dataSource.data = [...this.productsWithCategories].sort((a, b) => {
      // Handle special cases
      if (active === 'categories') {
        const aCategories = a.categories || [];
        const bCategories = b.categories || [];
        return (
          aCategories.join(',').localeCompare(bCategories.join(',')) * direction
        );
      } else if (active === 'attachments' || active === 'variants') {
        const aLength = a[active]?.length || 0;
        const bLength = b[active]?.length || 0;
        return (aLength - bLength) * direction;
      }

      // Handle regular properties
      const aValue = a[active as keyof Product];
      const bValue = b[active as keyof Product];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * direction;
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }

      return 0;
    });
  }

  /**
   * Handle sort changes
   */
  onSortChange(sort: Sort): void {
    this.currentSort = sort;

    // For external products, use local sorting and pagination
    if (this.useExternalProducts && this.showActions) {
      this.pageIndex = 0;
      if (this.paginator) {
        this.paginator.pageIndex = 0;
      }
      this.loadExternalProductsPage(0, this.pageSize);
      return;
    }

    if (this.showActions && sort.active && sort.direction) {
      // Server pagination mode - reset to first page on sort
      this.pageIndex = 0;
      if (this.paginator) {
        this.paginator.pageIndex = 0;
      }
      this.loadProductsPage();
    } else {
      // Local sorting mode for preview
      this.applySortToData();
      this.cdr.markForCheck();
    }
  }

  /**
   * Handle page changes
   */
  onPageChange(event: PageEvent): void {
    // For external products, use local pagination
    if (this.useExternalProducts && this.showActions) {
      this.loadExternalProductsPage(event.pageIndex, event.pageSize);
      return;
    }

    // Normal pagination for products from storage
    this.loadProductsPage(event.pageIndex, event.pageSize);
  }

  /**
   * Format stock settings for display
   */
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
}

// Angular imports
import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  Subject,
  Subscription,
  takeUntil,
  debounceTime,
  distinctUntilChanged,
} from 'rxjs';

// Angular Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import {
  MatPaginator,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import {
  MatTable,
  MatTableDataSource,
  MatTableModule,
} from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

// App imports
import { Category } from '../../../core/models';
import {
  InitializationService,
  PaginatedResult,
  StorageService,
} from '../../../core/services';
import {
  ConfirmDialogComponent,
  LoaderComponent,
} from '../../../shared/components';
import { NotificationService } from '../../../shared/services';
import { CategoryModalComponent } from './category-modal/category-modal.component';

/**
 * CategoryEditorComponent handles the management of TraderPlus categories.
 *
 * This component allows users to:
 * - View all categories in a paginated, sortable table
 * - Filter categories by name or ID
 * - Add new categories
 * - Edit existing categories
 * - Toggle category visibility
 * - Delete categories
 */
@Component({
  selector: 'app-category-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatCardModule,
    MatInputModule,
    MatSlideToggleModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatDialogModule,
    RouterModule,
    LoaderComponent,
  ],
  templateUrl: './category-editor.component.html',
  styleUrls: ['./category-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryEditorComponent implements OnInit, OnDestroy {
  /** Subject for handling component destruction and preventing memory leaks */
  private destroy$ = new Subject<void>();
  private subscriptions: Subscription[] = [];

  /** Data source for the Material table with category data */
  dataSource: MatTableDataSource<Category>;

  /** Columns to display in the category table */
  displayedColumns: string[] = [
    'icon',
    'categoryName',
    'categoryId',
    'isVisible',
    'productCount',
    'actions',
  ];

  /** Reference to the Material paginator for table pagination */
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  /** Reference to the Material sort directive for table sorting */
  @ViewChild(MatSort) sort!: MatSort;

  /** Reference to the Material table component */
  @ViewChild(MatTable) table!: MatTable<Category>;

  /** Flag to track if categories are available */
  hasCategories = false;

  /** Tracks if we had categories before the last update */
  private hadCategoriesBefore = false;

  /** Flag to track if default categories are being created */
  isCreatingDefaultCategories = false;

  /** Flag to track if data is currently loading */
  isLoading = false;

  /** Pagination state */
  totalCategories = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [10, 25, 50, 100];

  /** Filter state */
  filterValue = '';
  private filterSubject = new Subject<string>();

  /** Sorting state */
  private currentSort: Sort = { active: '', direction: '' };

  /**
   * Constructor initializes services and the data source
   *
   * @param storageService - Service for persisting and retrieving category data
   * @param dialog - Material dialog service for modal dialogs
   * @param notificationService - Service for displaying user notifications
   * @param initializationService - Service for initializing custom ripple effects
   * @param changeDetectorRef - Angular's ChangeDetectorRef for manual change detection
   */
  constructor(
    private storageService: StorageService,
    private dialog: MatDialog,
    private notificationService: NotificationService,
    private initializationService: InitializationService,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.dataSource = new MatTableDataSource<Category>([]);

    // Set up filter debounce
    this.filterSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((filter) => {
        this.filterValue = filter;
        this.pageIndex = 0; // Reset to first page on filter change
        if (this.paginator) {
          this.paginator.pageIndex = 0;
        }
        this.loadCategoriesPage();
      });
  }

  /**
   * OnInit lifecycle hook - Loads initial categories from storage
   */
  ngOnInit(): void {
    this.loadCategoriesPage();
  }

  /**
   * AfterViewInit lifecycle hook - Sets up table pagination and sorting
   * Also initializes custom ripple effects for enhanced UI interaction
   */
  ngAfterViewInit() {
    this.connectTableControls();

    // Initialize ripple effects for custom buttons
    setTimeout(() => {
      this.initializationService.initializeCustomRipples();
    });
  }

  /**
   * Handle sort changes
   */
  onSortChange(sort: Sort): void {
    this.currentSort = sort;

    // Reset to first page on sort change
    this.pageIndex = 0;
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }
    this.loadCategoriesPage();
  }

  /**
   * Handle page changes
   */
  onPageChange(event: PageEvent): void {
    this.loadCategoriesPage(event.pageIndex, event.pageSize);
  }

  /**
   * Load categories page from storage service
   */
  loadCategoriesPage(
    pageIndex = this.pageIndex,
    pageSize = this.pageSize
  ): void {
    this.isLoading = true;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;

    // Subscribe to paginated categories from StorageService
    const sub = this.storageService
      .getPaginatedCategories(pageIndex, pageSize, this.filterValue)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: PaginatedResult<Category>) => {
          // Store the previous state before loading new data
          this.hadCategoriesBefore = this.hasCategories;

          this.totalCategories = result.total;
          this.hasCategories = result.total > 0;

          if (result.items.length > 0) {
            this.dataSource.data = result.items;
          } else {
            this.dataSource.data = [];
          }

          this.isLoading = false;
          this.changeDetectorRef.markForCheck();

          // If we've transitioned from no categories to having categories,
          // we need to re-initialize the table controls
          if (!this.hadCategoriesBefore && this.hasCategories) {
            // Give Angular time to render the table before connecting controls
            setTimeout(() => {
              this.connectTableControls();
              this.changeDetectorRef.detectChanges();
            });
          }

          // Show notification if no categories match the filter and we have a filter
          if (result.total === 0 && this.filterValue) {
            this.notificationService.error(
              'No categories match the search criteria'
            );
          }
        },
        error: (err) => {
          console.error('Error loading categories:', err);
          this.notificationService.error('Error loading categories');
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
        },
      });

    this.subscriptions.push(sub);
  }

  /**
   * Connect the table's paginator and sort components to the data source
   * Should be called any time we need to re-initialize these connections
   */
  private connectTableControls(): void {
    if (this.paginator && this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  /**
   * Apply filtering to the data table
   *
   * Filters categories based on user input, enabling quick search across all displayed fields
   *
   * @param event - Input event containing the filter text
   */
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.filterSubject.next(filterValue.trim().toLowerCase());
  }

  /**
   * Remove all categories after confirmation
   *
   * Displays a confirmation dialog and clears all categories from storage if confirmed.
   * This is a destructive operation that cannot be undone.
   */
  removeAllCategories(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete All Categories',
        message:
          'Are you sure you want to delete all categories? \nThis action cannot be undone.',
        confirmText: 'Delete All',
        cancelText: 'Cancel',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.storageService.saveCategories([]);
        this.loadCategoriesPage();
        this.notificationService.success('All Categories deleted successfully');
      }
    });
  }

  /**
   * Toggle visibility for all categories at once
   *
   * If all categories are currently visible, makes them all invisible.
   * Otherwise, makes all categories visible.
   */
  toggleAllCategoriesVisibility(): void {
    // Get complete list of categories from storage service
    const allCategories = this.storageService.categories();
    const allVisible = allCategories.every((cat) => cat.isVisible);
    const updatedCategories = allCategories.map((cat) => ({
      ...cat,
      isVisible: !allVisible,
    }));
    this.storageService.saveCategories(updatedCategories);
    this.loadCategoriesPage();
  }

  /**
   * Toggle visibility for a specific category
   *
   * @param category - The category for which to toggle visibility
   */
  toggleCategoryVisibility(category: Category): void {
    // Get the category by ID
    const updatedCategory = {
      ...category,
      isVisible: !category.isVisible,
    };

    this.storageService.saveSingleCategory(updatedCategory);
    this.loadCategoriesPage();
  }

  /**
   * Remove a specific category after confirmation
   *
   * @param categoryId - ID of the category to remove
   */
  removeCategory(categoryId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Category',
        message:
          'Are you sure you want to delete this category? \nThis action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Get categories without the deleted one
        const categories = this.storageService
          .categories()
          .filter((cat) => cat.categoryId !== categoryId);
        this.storageService.saveCategories(categories);
        this.loadCategoriesPage();
        this.notificationService.success('Category deleted successfully');
      }
    });
  }

  /**
   * Get the count of products associated with a category
   *
   * @param category - The category for which to count products
   * @returns The number of products in the category
   */
  getProductCount(category: Category): number {
    return category.productIds.length;
  }

  /**
   * Add a new category
   *
   * Opens a dialog for entering category details, generates a unique ID
   * based on the name, and saves the new category to storage.
   */
  addCategory(): void {
    const dialogRef = this.dialog.open(CategoryModalComponent, {
      data: { category: undefined },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Use the category name to generate a unique category ID
        const categoryId = this.generateCategoryId(result.categoryName);

        const newCategory: Category = {
          ...result,
          categoryId: categoryId,
        };
        const categories = [...this.storageService.categories(), newCategory];
        this.storageService.saveCategories(categories);
        this.loadCategoriesPage();
        this.notificationService.success('Category created successfully');
      }
    });
  }

  /**
   * Edit an existing category
   *
   * Opens a dialog pre-filled with the category's current details,
   * and updates the category in storage if changes are made.
   * Maintains the original categoryId even if the name changes.
   *
   * @param category - The category to edit
   */
  editCategory(category: Category): void {
    const dialogRef = this.dialog.open(CategoryModalComponent, {
      data: { category },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const updatedCategory: Category = {
          ...category,
          ...result,
        }; // Keep existing properties including categoryId and update with new values

        // Update just this specific category
        this.storageService.saveSingleCategory(updatedCategory);

        this.loadCategoriesPage();
        this.notificationService.success('Category updated successfully');
      }
    });
  }

  /**
   * Creates a safe ID base from a category name
   *
   * Transforms a category name into a string suitable for use in an ID by:
   * - Converting to lowercase
   * - Removing spaces
   * - Removing special characters
   *
   * @param name - The original category name
   * @returns A sanitized string safe for use in IDs
   */
  private createSafeIdBase(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9_]/g, '');
  }

  /**
   * Generates a unique category ID based on the category name
   *
   * Format: cat_categoryname_001
   *
   * The method ensures uniqueness by:
   * 1. Creating a base ID from the sanitized category name
   * 2. Finding any existing categories with the same base name
   * 3. Determining the highest existing suffix number
   * 4. Generating a new ID with an incremented suffix
   *
   * @param categoryName - The name of the category
   * @returns A unique ID in the format cat_categoryname_XXX
   */
  private generateCategoryId(categoryName: string): string {
    // Create safe base ID from category name
    const baseName = this.createSafeIdBase(categoryName);

    // Find existing categories with the same base name and determine highest suffix
    const categories = this.storageService.categories();
    let highestSuffix = 0;

    categories.forEach((cat) => {
      // Check if this category has the same base name in its ID
      if (cat.categoryId && cat.categoryId.startsWith(`cat_${baseName}_`)) {
        const suffixMatch = cat.categoryId.match(/_(\d{3})$/);
        if (suffixMatch) {
          const suffix = parseInt(suffixMatch[1], 10);
          highestSuffix = Math.max(highestSuffix, suffix);
        }
      }
    });

    // Generate new ID with incremented suffix
    const nextSuffix = (highestSuffix + 1).toString().padStart(3, '0');
    return `cat_${baseName}_${nextSuffix}`;
  }

  /**
   * Create default categories for quick startup
   *
   * This method creates a set of standard categories with one pre-populated
   * ammunition category and several empty categories for common trader types.
   */
  createDefaultCategories(): void {
    this.isCreatingDefaultCategories = true;

    // Use setTimeout to allow the UI to update and show the loader
    setTimeout(() => {
      const defaultCategories =
        this.initializationService.createDefaultCategories();
      this.storageService.saveCategories(defaultCategories);

      // Simulate some processing time to show the loader (remove in production if not needed)
      setTimeout(() => {
        this.isCreatingDefaultCategories = false;
        this.loadCategoriesPage();
        this.notificationService.success(
          'Default categories created successfully'
        );
      }, 800);
    }, 100);
  }

  /**
   * Track categories for better performance with ngFor
   */
  trackByCategoryId(index: number, item: Category): string {
    return item.categoryId;
  }

  /**
   * OnDestroy lifecycle hook - Clean up subscriptions and resources
   *
   * Completes the destroy$ subject to prevent memory leaks from any
   * subscriptions that may be using it as a takeUntil condition
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}

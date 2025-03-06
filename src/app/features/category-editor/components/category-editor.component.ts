import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import {
  MatTableModule,
  MatTable,
  MatTableDataSource,
} from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule } from '@angular/material/dialog';
import { RouterModule } from '@angular/router';
import { StorageService } from '../../../core/services/storage.service';
import { Category } from '../../../core/models';
import { Subject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { CategoryModalComponent } from './category-modal/category-modal.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { NotificationService } from '../../../shared/services/notification.service';
import { MatTooltipModule } from '@angular/material/tooltip';

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
  ],
  templateUrl: './category-editor.component.html',
  styleUrls: ['./category-editor.component.scss'],
})
export class CategoryEditorComponent implements OnInit, OnDestroy {
  /** Subject for handling component destruction and preventing memory leaks */
  private destroy$ = new Subject<void>();

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

  /**
   * Constructor initializes services and the data source
   *
   * @param storageService - Service for persisting and retrieving category data
   * @param dialog - Material dialog service for modal dialogs
   * @param notificationService - Service for displaying user notifications
   */
  constructor(
    private storageService: StorageService,
    private dialog: MatDialog,
    private notificationService: NotificationService
  ) {
    this.dataSource = new MatTableDataSource<Category>([]);
  }

  /**
   * OnInit lifecycle hook - Loads initial categories from storage
   */
  ngOnInit(): void {
    this.loadCategories();
  }

  /**
   * AfterViewInit lifecycle hook - Sets up table pagination and sorting
   * Also initializes custom ripple effects for enhanced UI interaction
   */
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // Initialize ripple effects for custom buttons
    setTimeout(() => {
      this.initializeCustomRipples();
    });
  }

  /**
   * Initialize custom ripple effects for icon buttons
   *
   * Creates an interactive ripple animation when buttons are clicked,
   * enhancing the user experience with visual feedback
   */
  private initializeCustomRipples() {
    const buttons = document.querySelectorAll('.custom-icon-btn');

    buttons.forEach((button: Element) => {
      if (!(button as HTMLElement).hasAttribute('data-ripple-initialized')) {
        button.setAttribute('data-ripple-initialized', 'true');

        button.addEventListener('click', (event: Event) => {
          const mouseEvent = event as MouseEvent;
          const rippleContainer = button.querySelector(
            '.icon-btn-ripple'
          ) as HTMLElement;
          if (!rippleContainer) return;

          // Remove existing ripples
          const existingRipples = rippleContainer.querySelectorAll(
            '.icon-btn-ripple-effect'
          );
          existingRipples.forEach((ripple) => ripple.remove());

          // Create new ripple
          const ripple = document.createElement('span');
          ripple.classList.add('icon-btn-ripple-effect');

          const rect = button.getBoundingClientRect();
          const size = Math.max(rect.width, rect.height);
          const x = mouseEvent.clientX - rect.left - size / 2;
          const y = mouseEvent.clientY - rect.top - size / 2;

          ripple.style.width = ripple.style.height = `${size}px`;
          ripple.style.left = `${x}px`;
          ripple.style.top = `${y}px`;

          rippleContainer.appendChild(ripple);

          // Remove ripple after animation completes
          setTimeout(() => {
            ripple.remove();
          }, 500);
        });
      }
    });
  }

  /**
   * Load categories from storage service and update data source
   *
   * This method retrieves the latest category data and refreshes the table display.
   * Called on component initialization and after any data modification.
   */
  loadCategories(): void {
    const categories = this.storageService.categories();
    this.dataSource.data = categories;
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
    this.dataSource.filter = filterValue.trim().toLowerCase();
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
        this.loadCategories();
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
    const categories = this.dataSource.data;
    const allVisible = categories.every((cat) => cat.isVisible);
    const updatedCategories = categories.map((cat) => ({
      ...cat,
      isVisible: !allVisible,
    }));
    this.storageService.saveCategories(updatedCategories);
    this.loadCategories();
  }

  /**
   * Toggle visibility for a specific category
   *
   * @param category - The category for which to toggle visibility
   */
  toggleCategoryVisibility(category: Category): void {
    const categories = this.dataSource.data;
    const updatedCategories = categories.map((cat) =>
      cat.categoryId === category.categoryId
        ? { ...cat, isVisible: !cat.isVisible }
        : cat
    );
    this.storageService.saveCategories(updatedCategories);
    this.loadCategories();
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
        const categories = this.dataSource.data.filter(
          (cat) => cat.categoryId !== categoryId
        );
        this.storageService.saveCategories(categories);
        this.loadCategories();
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
          productIds: [],
        };
        const categories = [...this.dataSource.data, newCategory];
        this.storageService.saveCategories(categories);
        this.loadCategories();
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
        const categories = this.dataSource.data.map((cat) =>
          cat.categoryId === category.categoryId ? updatedCategory : cat
        );
        this.storageService.saveCategories(categories);
        this.loadCategories();
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
    const categories = this.dataSource.data;
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
   * OnDestroy lifecycle hook - Clean up subscriptions and resources
   *
   * Completes the destroy$ subject to prevent memory leaks from any
   * subscriptions that may be using it as a takeUntil condition
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

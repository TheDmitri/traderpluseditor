import {
  Component,
  ElementRef,
  Input,
  OnInit,
  Output,
  EventEmitter,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

// Application imports
import { Category } from '../../../../../../../core/models';
import { TraderCategoryService } from '../../../../../services/trader-category.service';

@Component({
  selector: 'app-category-selection',
  standalone: true,
  imports: [CommonModule, MatCheckboxModule, MatIconModule, MatTooltipModule],
  templateUrl: './category-selection.component.html',
  styleUrls: ['./category-selection.component.scss'],
})
export class CategorySelectionComponent implements OnInit {
  @Input() categoryIds: string[] = [];
  @Output() categoriesChange = new EventEmitter<string[]>();
  @ViewChild('categoriesListContainer') categoriesListContainer!: ElementRef;

  // Lazy loading properties
  readonly BATCH_SIZE = 100;
  displayedCategoriesCount = 0;
  displayedCategories: Category[] = [];
  isLoading = false;

  constructor(private traderCategoryService: TraderCategoryService) {}

  ngOnInit(): void {
    this.traderCategoryService.loadCategories(this.categoryIds);
    this.initDisplayedCategories();
  }

  /**
   * Reset displayed categories to the initial batch size
   * Called when expansion panel is collapsed
   */
  public resetDisplayedCategories(): void {
    const sortedCategories = this.getSortedCategories();
    const unknownCategories = this.getUnknownCategoriesForDisplay();

    // Reset to initial batch size
    this.displayedCategoriesCount = Math.min(
      this.BATCH_SIZE - unknownCategories.length,
      sortedCategories.length
    );
    this.displayedCategories = [
      ...unknownCategories,
      ...sortedCategories.slice(0, this.displayedCategoriesCount),
    ];

    // Reset scroll position if element exists
    if (this.categoriesListContainer?.nativeElement) {
      this.categoriesListContainer.nativeElement.scrollTop = 0;
    }
  }

  /**
   * Initialize displayed categories with the first batch
   */
  private initDisplayedCategories(): void {
    const sortedCategories = this.getSortedCategories();
    const unknownCategories = this.getUnknownCategoriesForDisplay();

    // Always show all unknown categories first
    this.displayedCategoriesCount = Math.min(
      this.BATCH_SIZE - unknownCategories.length,
      sortedCategories.length
    );
    this.displayedCategories = [
      ...unknownCategories,
      ...sortedCategories.slice(0, this.displayedCategoriesCount),
    ];
  }

  /**
   * Get available categories
   */
  getAvailableCategories(): Category[] {
    return this.traderCategoryService.getAvailableCategories();
  }

  /**
   * Get unknown category IDs
   */
  getUnknownCategoryIds(): string[] {
    return this.traderCategoryService.getUnknownCategoryIds();
  }

  /**
   * Get categories sorted with selected ones at the top
   */
  getSortedCategories(): Category[] {
    return this.traderCategoryService.getSortedCategories();
  }

  /**
   * Get unknown categories formatted for display
   */
  getUnknownCategoriesForDisplay(): Category[] {
    return this.traderCategoryService.getUnknownCategoriesForDisplay();
  }

  /**
   * Check if a category ID is unknown
   */
  isUnknownCategory(categoryId: string): boolean {
    return this.traderCategoryService.isUnknownCategory(categoryId);
  }

  /**
   * Toggle a category selection and update parent component
   */
  toggleCategory(categoryId: string): void {
    this.traderCategoryService.toggleCategory(categoryId);
    this.emitCategoryChange();
  }

  /**
   * Check if a category is selected
   */
  isCategorySelected(categoryId: string): boolean {
    return this.traderCategoryService.isCategorySelected(categoryId);
  }

  /**
   * Get the list of selected category IDs
   */
  getSelectedCategoryIds(): string[] {
    return this.traderCategoryService.getSelectedCategoryIds();
  }

  /**
   * Emit category change event to parent component
   */
  private emitCategoryChange(): void {
    this.categoriesChange.emit(this.getSelectedCategoryIds());
  }

  /**
   * Handle scroll event to implement endless scrolling
   */
  onScroll(): void {
    // Don't load more if already loading
    if (this.isLoading) return;

    const element = this.categoriesListContainer?.nativeElement;
    if (!element) return;

    // Check if we're near the end of the scroll container
    if (element.scrollHeight - element.scrollTop - element.clientHeight < 50) {
      // Check if there are more categories to load
      const totalAvailableCategories = this.getSortedCategories().length;
      const unknownCategoriesCount =
        this.getUnknownCategoriesForDisplay().length;

      if (this.displayedCategoriesCount < totalAvailableCategories) {
        this.isLoading = true;

        // Simulate a short delay to show the loader (can be removed in production)
        setTimeout(() => {
          // Load next batch of categories
          const startIndex = this.displayedCategoriesCount;
          const newBatchSize = Math.min(
            this.BATCH_SIZE,
            totalAvailableCategories - startIndex
          );

          const newCategories = this.getSortedCategories().slice(
            startIndex,
            startIndex + newBatchSize
          );

          // Add new categories to displayed list (preserving unknown categories at the top)
          if (this.displayedCategories.length === 0) {
            this.displayedCategories = [
              ...this.getUnknownCategoriesForDisplay(),
              ...newCategories,
            ];
          } else {
            this.displayedCategories = [
              ...this.displayedCategories,
              ...newCategories,
            ];
          }

          this.displayedCategoriesCount += newBatchSize;
          this.isLoading = false;
        }, 300);
      }
    }
  }

  /**
   * Track categories by ID for better performance
   */
  trackByCategoryId(index: number, category: Category): string {
    return category.categoryId;
  }

  /**
   * Get display text for categories list
   */
  getCategoriesCountText(): string {
    const totalAvailable = this.getAvailableCategories().length;
    const unknownCount = this.getUnknownCategoryIds().length;
    const totalCount = totalAvailable + unknownCount;
    const selectedCount = this.getSelectedCategoryIds().length;

    if (totalCount === 0) {
      return 'No categories available';
    }

    const displayedNormalCount = Math.min(
      this.displayedCategoriesCount,
      totalAvailable
    );
    return `${selectedCount} selected, showing ${
      displayedNormalCount + unknownCount
    } of ${totalCount}`;
  }
}

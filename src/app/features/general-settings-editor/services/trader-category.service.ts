import { Injectable } from '@angular/core';
import { StorageService } from '../../../core/services';
import { Category } from '../../../core/models';

@Injectable({
  providedIn: 'root',
})
export class TraderCategoryService {
  private selectedCategoryIds: string[] = [];
  private allCategories: Category[] = [];
  private unknownCategories: Category[] = [];
  private unknownCategoryIds: string[] = [];

  // Pagination properties
  private readonly BATCH_SIZE = 100;

  constructor(private storageService: StorageService) {}

  /**
   * Load categories and initialize with selected ones
   */
  loadCategories(categoryIds: string[]): void {
    this.selectedCategoryIds = [...categoryIds];
    this.allCategories = this.storageService.categories();

    // Find unknown category IDs (IDs that don't match any available category)
    this.unknownCategoryIds = this.selectedCategoryIds.filter(
      (id) => !this.allCategories.some((cat) => cat.categoryId === id)
    );

    // Create placeholder categories for unknown IDs
    this.unknownCategories = this.unknownCategoryIds.map((id) => ({
      categoryId: id,
      categoryName: 'Unknown Category',
      productIds: [],
      isVisible: true,
      icon: '',
      licensesRequired: [],
    }));
  }

  /**
   * Get available categories
   */
  getAvailableCategories(): Category[] {
    return this.allCategories;
  }

  /**
   * Get paginated categories
   * @param startIndex The starting index
   * @param count Number of items to return
   * @returns Paginated categories
   */
  getPaginatedCategories(startIndex: number, count: number): Category[] {
    return this.getSortedCategories().slice(startIndex, startIndex + count);
  }

  /**
   * Get total count of all categories (including unknown)
   */
  getTotalCategoriesCount(): number {
    return this.allCategories.length + this.unknownCategories.length;
  }

  /**
   * Get unknown category IDs
   */
  getUnknownCategoryIds(): string[] {
    return this.unknownCategoryIds;
  }

  /**
   * Get categories sorted with selected ones at the top
   */
  getSortedCategories(): Category[] {
    // Sort categories with selected ones at the top
    return this.allCategories.slice().sort((a, b) => {
      const aSelected = this.isCategorySelected(a.categoryId);
      const bSelected = this.isCategorySelected(b.categoryId);

      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return a.categoryName.localeCompare(b.categoryName);
    });
  }

  /**
   * Get unknown categories formatted for display
   */
  getUnknownCategoriesForDisplay(): Category[] {
    return this.unknownCategories;
  }

  /**
   * Check if a category ID is unknown
   */
  isUnknownCategory(categoryId: string): boolean {
    return this.unknownCategoryIds.includes(categoryId);
  }

  /**
   * Toggle a category selection
   */
  toggleCategory(categoryId: string): void {
    const index = this.selectedCategoryIds.indexOf(categoryId);
    if (index > -1) {
      this.selectedCategoryIds.splice(index, 1);
    } else {
      this.selectedCategoryIds.push(categoryId);
    }
  }

  /**
   * Check if a category is selected
   */
  isCategorySelected(categoryId: string): boolean {
    return this.selectedCategoryIds.includes(categoryId);
  }

  /**
   * Get the list of selected category IDs
   */
  getSelectedCategoryIds(): string[] {
    return this.selectedCategoryIds;
  }
}

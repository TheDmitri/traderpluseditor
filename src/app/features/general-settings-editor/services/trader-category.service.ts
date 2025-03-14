import { Injectable } from '@angular/core';
import { Category } from '../../../core/models';
import { CategoryService } from '../../category-editor/services/category.service';

/**
 * Service for managing categories for traders
 */
@Injectable({
  providedIn: 'root'
})
export class TraderCategoryService {
  /** Available categories from CategoryService */
  private availableCategories: Category[] = [];
  
  /** Selected category IDs map for quick lookup and state tracking */
  private selectedCategoryIdMap: { [categoryId: string]: boolean } = {};

  /** Unknown category IDs that exist in trader but not in available categories */
  private unknownCategoryIds: string[] = [];

  constructor(private categoryService: CategoryService) {}

  /**
   * Load categories from the CategoryService and identify unknown categories
   * @param traderCategoryIds Optional array of category IDs already assigned to the trader
   */
  loadCategories(traderCategoryIds?: string[]): void {
    // Get categories from the CategoryService
    this.availableCategories = this.categoryService.getExportData();

    // After loading categories, check for unknown category IDs if we have trader categories
    if (traderCategoryIds?.length) {
      this.initializeSelectedCategories(traderCategoryIds);
    } else {
      // Reset maps and arrays
      this.selectedCategoryIdMap = {};
      this.unknownCategoryIds = [];
    }
  }

  /**
   * Initialize selected categories from trader data
   * @param categoryIds Array of category IDs to mark as selected
   */
  initializeSelectedCategories(categoryIds: string[]): void {
    // Reset map
    this.selectedCategoryIdMap = {};
    
    // Set selected state for each category ID
    categoryIds.forEach(id => {
      this.selectedCategoryIdMap[id] = true;
    });

    // Identify unknown categories
    this.identifyUnknownCategories(categoryIds);
  }

  /**
   * Find category IDs assigned to the trader that don't exist in availableCategories
   * @param categoryIds Array of category IDs to check
   */
  private identifyUnknownCategories(categoryIds: string[]): void {
    this.unknownCategoryIds = categoryIds.filter(id => 
      !this.availableCategories.some(category => category.categoryId === id)
    );
  }

  /**
   * Get available categories
   * @returns Array of all available categories
   */
  getAvailableCategories(): Category[] {
    return this.availableCategories;
  }

  /**
   * Get categories sorted with selected ones at the top
   */
  getSortedCategories(): Category[] {
    if (!this.availableCategories || this.availableCategories.length === 0) {
      return [];
    }
    
    // Create a copy of the categories array to avoid modifying the original
    return [...this.availableCategories].sort((a, b) => {
      const isASelected = this.isCategorySelected(a.categoryId);
      const isBSelected = this.isCategorySelected(b.categoryId);
      
      // If A is selected and B is not, A comes first
      if (isASelected && !isBSelected) {
        return -1;
      }
      
      // If B is selected and A is not, B comes first
      if (!isASelected && isBSelected) {
        return 1;
      }
      
      // If both are selected or both are unselected, maintain original order
      return 0;
    });
  }

  /**
   * Get unknown categories formatted for display
   * Creates simplified category objects for unknown category IDs
   */
  getUnknownCategoriesForDisplay(): Category[] {
    return this.unknownCategoryIds.map(id => ({
      categoryId: id,
      categoryName: 'Unknown Category',
      icon: '',
      isVisible: true,
      licensesRequired: [],
      productIds: []
    }));
  }

  /**
   * Get unknown category IDs
   * @returns Array of unknown category IDs
   */
  getUnknownCategoryIds(): string[] {
    return [...this.unknownCategoryIds];
  }

  /**
   * Check if a category ID is unknown
   * @param categoryId The category ID to check
   * @returns True if the category is unknown
   */
  isUnknownCategory(categoryId: string): boolean {
    return this.unknownCategoryIds.includes(categoryId);
  }

  /**
   * Toggle a category selection
   * @param categoryId The category ID to toggle
   */
  toggleCategory(categoryId: string): void {
    this.selectedCategoryIdMap[categoryId] = !this.selectedCategoryIdMap[categoryId];
  }

  /**
   * Check if a category is selected
   * @param categoryId The category ID to check
   * @returns True if the category is selected
   */
  isCategorySelected(categoryId: string): boolean {
    return !!this.selectedCategoryIdMap[categoryId];
  }

  /**
   * Get the list of selected category IDs
   * @returns Array of selected category IDs
   */
  getSelectedCategoryIds(): string[] {
    return Object.keys(this.selectedCategoryIdMap).filter(id => this.selectedCategoryIdMap[id]);
  }
}

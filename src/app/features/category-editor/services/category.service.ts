import { Injectable } from '@angular/core';
import { StorageService } from '../../../core/services';
import { Category } from '../../../core/models';

/**
 * Service for handling TraderPlus category operations
 */
@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  constructor(private storageService: StorageService) {}

  /**
   * Validates if the data is a valid TraderPlus category
   * @param data Any data to validate
   * @returns True if data has valid category format
   */
  isCategoryData(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      'categoryName' in data &&
      'productIds' in data &&
      Array.isArray(data.productIds)
    );
  }

  /**
   * Generate a safe base ID from a name (removes spaces, special chars, makes lowercase)
   * @param name The name to convert to a safe ID
   * @param fallback Fallback value if name is undefined
   * @returns A sanitized string suitable for use in IDs
   */
  createSafeIdBase(name: string | undefined, fallback: string): string {
    if (!name) return fallback;

    return name
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9_]/g, '');
  }

  /**
   * Helper to merge categories and generate new categoryIds if needed
   * @param existing The existing list of categories
   * @param imported The list of categories to be imported
   * @returns Merged list of categories with proper IDs
   */
  mergeCategories(existing: Category[], imported: Category[]): Category[] {
    const allCategories: Category[] = [...existing];

    // Group categories by categoryName to generate correct suffixes
    const categoryGroups: { [key: string]: number } = {};

    // Count existing categories by categoryName
    allCategories.forEach((cat) => {
      const baseName = this.createSafeIdBase(cat.categoryName, 'unknown');

      // Check if this category already has a suffix in the ID
      if (cat.categoryId && cat.categoryId.startsWith(`cat_${baseName}_`)) {
        const suffixMatch = cat.categoryId.match(/_(\d{3})$/);
        if (suffixMatch) {
          const suffix = parseInt(suffixMatch[1], 10);
          categoryGroups[baseName] = Math.max(
            categoryGroups[baseName] || 0,
            suffix
          );
        }
      } else if (!categoryGroups[baseName]) {
        categoryGroups[baseName] = 0;
      }
    });

    // Process imported categories
    imported.forEach((category) => {
      // Generates a safe base ID from the category categoryName
      const baseName = this.createSafeIdBase(category.categoryName, 'unknown');

      // If the category doesn't have an ID, generate one
      if (!category.categoryId) {
        // Increase the suffix for this categoryName
        categoryGroups[baseName] = (categoryGroups[baseName] || 0) + 1;
        const suffix = categoryGroups[baseName].toString().padStart(3, '0');
        category.categoryId = `cat_${baseName}_${suffix}`;
      }

      // Add new Category if it doesn't already exist
      if (
        !allCategories.some((cat) => cat.categoryId === category.categoryId)
      ) {
        // Ensure a default name if missing
        const normalizedCategory: Category = {
          categoryId: category.categoryId,
          categoryName: category.categoryName || 'Unnamed Category',
          productIds: category.productIds || [],
          isVisible: category.isVisible ?? true,
          icon: category.icon || '',
          licensesRequired: category.licensesRequired || [],
        };

        allCategories.push(normalizedCategory);

        // Update the group counter if the ID has a higher suffix
        const suffixMatch = category.categoryId.match(/_(\d{3})$/);
        if (suffixMatch && baseName) {
          const suffix = parseInt(suffixMatch[1], 10);
          categoryGroups[baseName] = Math.max(
            categoryGroups[baseName] || 0,
            suffix
          );
        }
      }
    });

    return allCategories;
  }

  /**
   * Helper to get the next category Id
   * @param categories The existing list of categories
   * @returns The next Id
   */
  getNextCategoryId(categories: Category[]): number {
    let highestNumber = 0;
    categories.forEach((cat) => {
      if (!cat.categoryId) return;

      const parts = cat.categoryId.split('_');
      if (parts.length >= 3) {
        const lastPart = parts[parts.length - 1];
        const idNumber = parseInt(lastPart, 10);
        if (!isNaN(idNumber) && idNumber >= highestNumber) {
          highestNumber = idNumber + 1;
        }
      }
    });

    return Math.max(1, highestNumber); // Ensure at least 1
  }

  /**
   * Process imported category data
   * @param data The parsed JSON data
   * @returns Promise that resolves when processing is complete
   */
  processImportedData(data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        let categories: Category[] = [];

        if (Array.isArray(data)) {
          // Multiple categories in a single file
          const validCategories = data.filter(item => this.isCategoryData(item));
          if (validCategories.length === 0) {
            reject(new Error('No valid TraderPlus category data found in file'));
            return;
          }

          // All valid categories
          categories = validCategories as Category[];
        } else if (this.isCategoryData(data)) {
          // Single category
          categories = [data as Category];
        } else {
          reject(new Error('Invalid TraderPlus category format'));
          return;
        }

        // Merge with existing categories and ensure unique IDs
        const existing = this.storageService.categories();
        const merged = this.mergeCategories(existing, categories);
        this.storageService.saveCategories(merged);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Process multiple imported category files
   * @param dataArray Array of parsed JSON data
   * @returns Promise that resolves when processing is complete
   */
  processMultipleImports(dataArray: any[]): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const processedData = dataArray.flatMap(data => {
          if (Array.isArray(data)) {
            return data.filter(item => this.isCategoryData(item));
          } else if (this.isCategoryData(data)) {
            return [data];
          }
          return [];
        });

        if (processedData.length === 0) {
          reject(new Error('No valid TraderPlus category data found in files'));
          return;
        }

        // Merge with existing categories
        const existing = this.storageService.categories();
        const merged = this.mergeCategories(existing, processedData);
        this.storageService.saveCategories(merged);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get categories data for export
   * @returns Categories array for export
   */
  getExportData(): Category[] {
    return this.storageService.categories();
  }
}

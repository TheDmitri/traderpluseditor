import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';
import {
  Category,
  Product,
  CurrencySettings,
  GeneralSettings,
} from '../models';
import JSZip from 'jszip';

/**
 * Service for handling file import/export operations
 */
@Injectable({
  providedIn: 'root',
})
export class FileService {
  constructor(private storageService: StorageService) {}

  /**
   * Import a JSON file and parse its contents
   * @param file The file to import
   * @returns Promise that resolves with the parsed data
   */
  importFile(file: File): Promise<any> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const jsonData = JSON.parse(event.target?.result as string);
          resolve(jsonData);
        } catch (error) {
          reject(new Error('Invalid JSON file'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };

      reader.readAsText(file);
    });
  }

  /**
   * Validates if the data is a valid TraderPlus category
   * @param data Any data to validate
   * @returns True if data has valid category format
   */
  private isCategoryData(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      'categoryName' in data &&
      'productIds' in data &&
      Array.isArray(data.productIds)
    );
  }

  /**
   * Validates if the data is a valid TraderPlus product
   * @param data Any data to validate
   * @returns True if data has valid product format
   */
  private isProductData(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      'className' in data &&
      typeof data.className === 'string'
    );
  }

  /**
   * Validates if data is valid currency settings
   * @param data Any data to validate
   * @returns True if data has valid currency settings format
   */
  private isCurrencySettings(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      'currencyTypes' in data &&
      Array.isArray(data.currencyTypes)
    );
  }

  /**
   * Validates if data is valid general settings
   * @param data Any data to validate
   * @returns True if data has valid general settings format
   */
  private isGeneralSettings(data: any): boolean {
    return data && typeof data === 'object' && 'version' in data;
  }

  /**
   * Auto-detect the type of TraderPlus data
   * @param data The JSON data
   * @returns The detected type or null if not recognized
   */
  detectDataType(
    data: any
  ): 'category' | 'product' | 'currency' | 'general' | null {
    if (this.isCategoryData(data)) return 'category';
    if (this.isProductData(data)) return 'product';
    if (this.isCurrencySettings(data)) return 'currency';
    if (this.isGeneralSettings(data)) return 'general';
    return null;
  }

  /**
   * Import categories from a JSON file
   * @param file The file containing category data
   * @returns Promise that resolves when import is complete
   */
  importCategories(file: File): Promise<void> {
    return this.importFile(file).then((data) => {
      let categories: Category[] = [];

      if (Array.isArray(data)) {
        // Multiple categories in a single file
        const validCategories = data.filter((item) =>
          this.isCategoryData(item)
        );
        if (validCategories.length === 0) {
          throw new Error('No valid TraderPlus category data found in file');
        }

        // All valid categories
        categories = validCategories as Category[];
      } else if (this.isCategoryData(data)) {
        // Single category
        categories = [data as Category];
      } else {
        throw new Error('Invalid TraderPlus category format');
      }

      // Merge with existing categories and ensure unique IDs
      const existing = this.storageService.categories();
      const merged = this.mergeCategories(existing, categories);
      this.storageService.saveCategories(merged);
    });
  }

  /**
   * Import multiple category files simultaneously and merge the results.
   * @param files A FileList of category files
   * @returns Promise that resolves when import is complete
   */
  importMultipleCategories(files: FileList): Promise<void> {
    const filesArray = Array.from(files);
    return Promise.all(
      filesArray.map((file) =>
        this.importFile(file).then((data) => {
          if (Array.isArray(data)) {
            return data.filter((item) => this.isCategoryData(item));
          } else if (this.isCategoryData(data)) {
            return [data];
          }
          return [];
        })
      )
    ).then((results) => {
      let importedCategories: Category[] = results.flat();

      if (importedCategories.length === 0) {
        throw new Error('No valid TraderPlus category data found in files');
      }

      // Merge with existing categories
      const existing = this.storageService.categories();
      const merged = this.mergeCategories(existing, importedCategories);
      this.storageService.saveCategories(merged);
    });
  }

  /**
   * Generate a safe base ID from a name (removes spaces, special chars, makes lowercase)
   */
  private createSafeIdBase(name: string | undefined, fallback: string): string {
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
   */
  private mergeCategories(
    existing: Category[],
    imported: Category[]
  ): Category[] {
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

      // Wenn die Kategorie noch keine ID hat, generiere eine
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
  private getNextCategoryId(categories: Category[]): number {
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
   * Import a single product file
   * @param file The file containing product data
   * @returns Promise that resolves when import is complete
   */
  importProducts(file: File): Promise<void> {
    return this.importFile(file).then((data) => {
      let products: Product[] = [];

      try {
        // Stellen Sie sicher, dass der Dateiname korrekt extrahiert wird
        const safeFilename =
          file && file.name ? file.name : 'unknown_file.json';

        if (Array.isArray(data)) {
          // Filter for valid products
          const validProducts = data
            .filter((item) => this.isProductData(item))
            .map((item) => this.normalizeProduct(item, safeFilename));

          if (validProducts.length === 0) {
            throw new Error('No valid TraderPlus product data found in file');
          }

          products = validProducts;
        } else if (this.isProductData(data)) {
          // Single product
          products = [this.normalizeProduct(data, safeFilename)];
        } else {
          throw new Error('Invalid TraderPlus product format');
        }

        const existing = this.storageService.products();
        const merged = this.mergeProducts(existing, products);
        this.storageService.saveProducts(merged);
      } catch (error) {
        console.error('Error processing product file:', error);
        throw error;
      }
    });
  }

  /**
   * Import multiple product files simultaneously and merge the results
   * @param files A FileList of product files
   * @returns Promise that resolves when import is complete
   */
  importMultipleProducts(files: FileList): Promise<void> {
    const filesArray = Array.from(files);
    return Promise.all(
      filesArray.map((file) =>
        this.importFile(file).then((data) => {
          if (Array.isArray(data)) {
            // Filter for valid products
            return data
              .filter((item) => this.isProductData(item))
              .map((item) => this.normalizeProduct(item, file.name));
          } else if (this.isProductData(data)) {
            return [this.normalizeProduct(data, file.name)];
          }
          return [];
        })
      )
    ).then((results) => {
      const importedProducts = results.flat();

      if (importedProducts.length === 0) {
        throw new Error('No valid TraderPlus product data found in files');
      }

      const existing = this.storageService.products();
      const merged = this.mergeProducts(existing, importedProducts);
      this.storageService.saveProducts(merged);
    });
  }

  /**
   * Helper to merge products and ensure proper ID generation
   */
  private mergeProducts(existing: Product[], imported: Product[]): Product[] {
    const merged = [...existing];

    // Group products by className to generate correct suffixes
    const productGroups: { [key: string]: number } = {};

    // Count existing products by className
    merged.forEach((prod) => {
      const baseName = this.createSafeIdBase(prod.className, 'unknown');

      // Check if this product already has a suffix in the ID
      if (prod.productId && prod.productId.startsWith(`prod_${baseName}_`)) {
        const suffixMatch = prod.productId.match(/_(\d{3})$/);
        if (suffixMatch) {
          const suffix = parseInt(suffixMatch[1], 10);
          productGroups[baseName] = Math.max(
            productGroups[baseName] || 0,
            suffix
          );
        }
      } else if (!productGroups[baseName]) {
        productGroups[baseName] = 0;
      }
    });

    // Process imported products
    imported.forEach((product) => {
      // Generates a safe base ID from the product className
      const baseName = this.createSafeIdBase(product.className, 'unknown');

      // If the product doesn't have an ID, generate one
      if (!product.productId) {
        // Increase the suffix for this className
        productGroups[baseName] = (productGroups[baseName] || 0) + 1;
        const suffix = productGroups[baseName].toString().padStart(3, '0');
        product.productId = `prod_${baseName}_${suffix}`;
      }

      const existingIndex = merged.findIndex(
        (p) => p.productId === product.productId
      );

      if (existingIndex === -1) {
        // Adds new Product if it doesn't already exist
        merged.push(product);

        // Update the group counter if the ID has a higher suffix
        const suffixMatch = product.productId.match(/_(\d{3})$/);
        if (suffixMatch && baseName) {
          const suffix = parseInt(suffixMatch[1], 10);
          productGroups[baseName] = Math.max(
            productGroups[baseName] || 0,
            suffix
          );
        }
      } else {
        // Update existing Product but keeps the original id
        merged[existingIndex] = {
          ...product,
          productId: merged[existingIndex].productId,
        };
      }
    });

    return merged;
  }

  /**
   * Helper to get the next product Id
   */
  private getNextProductId(products: Product[]): number {
    let highestNumber = 0;
    products.forEach((prod) => {
      if (!prod.productId) return;

      const parts = prod.productId.split('_');
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
   * Normalize product data to ensure all required fields
   */
  private normalizeProduct(data: any, filename: string): Product {
    return {
      productId: data.productId || '', // Leave productId empty, gets generated in mergeProducts
      className: data.className,
      coefficient: data.coefficient ?? 1.0,
      maxStock: data.maxStock ?? -1,
      tradeQuantity: data.tradeQuantity ?? 1,
      buyPrice: data.buyPrice ?? 0,
      sellPrice: data.sellPrice ?? 0,
      stockSettings: data.stockSettings ?? 0,
      attachments: data.attachments ?? [],
      variants: data.variants ?? [],
    };
  }

  /**
   * Import currency settings from a JSON file
   * @param file The file containing currency settings
   * @returns Promise that resolves when import is complete
   */
  importCurrencySettings(file: File): Promise<void> {
    return this.importFile(file).then((data) => {
      if (this.isCurrencySettings(data)) {
        this.storageService.saveCurrencySettings(data as CurrencySettings);
      } else {
        throw new Error('Invalid TraderPlus currency settings format');
      }
    });
  }

  /**
   * Import general settings from a JSON file
   * @param file The file containing general settings
   * @returns Promise that resolves when import is complete
   */
  importGeneralSettings(file: File): Promise<void> {
    return this.importFile(file).then((data) => {
      if (this.isGeneralSettings(data)) {
        this.storageService.saveGeneralSettings(data as GeneralSettings);
      } else {
        throw new Error('Invalid TraderPlus general settings format');
      }
    });
  }

  /**
   * Export data as a JSON file
   * @param data The data to export
   * @param filename The name of the file to download
   */
  exportAsJson(data: any, filename: string): void {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }

  /**
   * Export categories to a JSON file
   */
  exportCategories(): void {
    this.exportAsJson(
      this.storageService.categories(),
      'TraderPlusCategories.json'
    );
  }

  /**
   * Export products to a JSON file
   */
  exportProducts(): void {
    this.exportAsJson(
      this.storageService.products(),
      'TraderPlusProducts.json'
    );
  }

  /**
   * Export currency settings to a JSON file
   */
  exportCurrencySettings(): void {
    this.exportAsJson(
      this.storageService.currencySettings(),
      'TraderPlusCurrencySettings.json'
    );
  }

  /**
   * Export general settings to a JSON file
   */
  exportGeneralSettings(): void {
    this.exportAsJson(
      this.storageService.generalSettings(),
      'TraderPlusGeneralSettings.json'
    );
  }

  /**
   * Export all configurations as a ZIP archive
   */
  exportAllAsZip(): void {
    const zip = new JSZip();

    // Get all configurations
    const categories = this.storageService.categories();
    const products = this.storageService.products();
    const currencySettings = this.storageService.currencySettings();
    const generalSettings = this.storageService.generalSettings();

    // Add each configuration to the ZIP if it exists
    if (categories && categories.length > 0) {
      zip.file(
        'TraderPlusCategories.json',
        JSON.stringify(categories, null, 2)
      );
    }

    if (products && products.length > 0) {
      zip.file('TraderPlusProducts.json', JSON.stringify(products, null, 2));
    }

    if (currencySettings) {
      zip.file(
        'TraderPlusCurrencySettings.json',
        JSON.stringify(currencySettings, null, 2)
      );
    }

    if (generalSettings) {
      zip.file(
        'TraderPlusGeneralSettings.json',
        JSON.stringify(generalSettings, null, 2)
      );
    }

    // Generate the ZIP file and download it
    zip.generateAsync({ type: 'blob' }).then((content) => {
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'TraderPlusConfigs.zip';
      document.body.appendChild(a);
      a.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
    });
  }
}

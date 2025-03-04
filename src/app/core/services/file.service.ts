import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';
import {
  Category,
  Product,
  CurrencySettings,
  GeneralSettings,
} from '../models';

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
   * Import categories from a JSON file
   * @param file The file containing category data
   * @returns Promise that resolves when import is complete
   */
  importCategories(file: File): Promise<void> {
    return this.importFile(file).then((data) => {
      let categories: Category[] = [];
      if (Array.isArray(data)) {
        categories = data as Category[];
      } else if (data && typeof data === 'object') {
        categories = [data];
      } else {
        throw new Error('Invalid category data format');
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
    return Promise.all(filesArray.map((file) => this.importFile(file))).then(
      (results) => {
        let importedCategories: Category[] = [];
        for (const result of results) {
          if (Array.isArray(result)) {
            importedCategories = importedCategories.concat(
              result as Category[]
            );
          } else if (result && typeof result === 'object') {
            importedCategories.push(result);
          } else {
            throw new Error('Invalid category data format in one of the files');
          }
        }
        // Merge with existing categories and ensure unique IDs
        const existing = this.storageService.categories();
        const merged = this.mergeCategories(existing, importedCategories);
        this.storageService.saveCategories(merged);
      }
    );
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
    let nextIdNumber = this.getNextCategoryId(allCategories);

    imported.forEach((category) => {
      if (!category.categoryId) {
        category.categoryId = this.generateCategoryId(nextIdNumber++);
      }

      // Add category, if it not already exists
      if (
        !allCategories.some((cat) => cat.categoryId === category.categoryId)
      ) {
        allCategories.push(category);
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
      const idNumber = parseInt(cat.categoryId.split('_').pop() ?? '0');
      if (idNumber >= highestNumber) {
        highestNumber = idNumber + 1;
      }
    });

    return highestNumber;
  }

  /**
   * Helper to generate a unique ID for a category
   * @param nextIdNumber
   * @returns
   */
  private generateCategoryId(nextIdNumber: number): string {
    return `cat_imported_${nextIdNumber.toString().padStart(3, '0')}`;
  }

  /**
   * Import a single product file
   * @param file The file containing product data
   * @returns Promise that resolves when import is complete
   */
  importProducts(file: File): Promise<void> {
    return this.importFile(file).then((data) => {
      let products: Product[] = [];
      if (Array.isArray(data)) {
        products = data
          .map((item) => this.convertToProduct(item))
          .filter((p): p is Product => p !== null);
      } else if (data && typeof data === 'object') {
        const product = this.convertToProduct(data);
        if (product) {
          products = [product];
        }
      } else {
        throw new Error('Invalid product data format');
      }
      // Merge with existing products and ensure unique IDs
      const existing = this.storageService.products();
      const merged = this.mergeProducts(existing, products);
      this.storageService.saveProducts(merged);
    });
  }

  /**
   * Import multiple product files simultaneously and merge the results
   * @param files A FileList of product files
   * @returns Promise that resolves when import is complete
   */
  importMultipleProducts(files: FileList): Promise<void> {
    const filesArray = Array.from(files);
    return Promise.all(filesArray.map((file) => this.importFile(file))).then(
      (results) => {
        let importedProducts: Product[] = [];
        for (const result of results) {
          if (Array.isArray(result)) {
            importedProducts = importedProducts.concat(result as Product[]);
          } else if (result && typeof result === 'object') {
            // Single product in file
            const product = this.convertToProduct(result);
            if (product) {
              importedProducts.push(product);
            }
          }
        }
        // Merge with existing products and ensure unique IDs
        const existing = this.storageService.products();
        const merged = this.mergeProducts(existing, importedProducts);
        this.storageService.saveProducts(merged);
      }
    );
  }

  /**
   * Helper to merge products and generate new productIds if needed
   */
  private mergeProducts(existing: Product[], imported: Product[]): Product[] {
    const nextId = this.getNextProductId(existing);
    const merged = [...existing];

    imported.forEach((product) => {
      // Prüfe ob das Produkt bereits existiert (über className)
      const existingIndex = merged.findIndex(
        (p) => p.className === product.className
      );

      if (existingIndex === -1) {
        // Neues Produkt - generiere neue ID
        const newProduct = {
          ...product,
          productId: this.generateProductId(nextId + merged.length),
        };
        merged.push(newProduct);

        // Aktualisiere die Kategorien mit der neuen productId
        const categories = this.storageService.categories();
        categories.forEach((category) => {
          if (category.className?.includes(product.className)) {
            if (!category.productIds) {
              category.productIds = [];
            }
            category.productIds.push(newProduct.productId);
          }
        });
        this.storageService.saveCategories(categories);
      } else {
        // Aktualisiere bestehendes Produkt aber behalte die ID
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
      const idNumber = parseInt(prod.productId.split('_').pop() ?? '0');
      if (idNumber >= highestNumber) {
        highestNumber = idNumber + 1;
      }
    });
    return highestNumber;
  }

  /**
   * Helper to generate a unique ID for a product
   */
  private generateProductId(nextIdNumber: number): string {
    return `prod_${nextIdNumber.toString().padStart(3, '0')}`;
  }

  /**
   * Convert raw JSON data to Product type
   */
  private convertToProduct(data: any): Product | null {
    if (!data.className) return null;

    return {
      productId: '', // Will be generated during merge
      className: data.className,
      coefficient: data.coefficient || 1.0,
      maxStock: data.maxStock || -1,
      tradeQuantity: data.tradeQuantity || 1,
      buyPrice: data.buyPrice || 0,
      sellPrice: data.sellPrice || 0,
      stockSettings: data.stockSettings || 0,
      attachments: data.attachments || [],
      variants: data.variants || [],
    };
  }

  /**
   * Import currency settings from a JSON file
   * @param file The file containing currency settings
   * @returns Promise that resolves when import is complete
   */
  importCurrencySettings(file: File): Promise<void> {
    return this.importFile(file).then((data) => {
      if (data && typeof data === 'object' && 'currencyTypes' in data) {
        this.storageService.saveCurrencySettings(data as CurrencySettings);
      } else {
        throw new Error('Invalid currency settings format');
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
      if (data && typeof data === 'object' && 'version' in data) {
        this.storageService.saveGeneralSettings(data as GeneralSettings);
      } else {
        throw new Error('Invalid general settings format');
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
}

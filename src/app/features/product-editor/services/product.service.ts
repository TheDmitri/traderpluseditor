import { Injectable } from '@angular/core';
import { StorageService } from '../../../core/services';
import { Product } from '../../../core/models';

/**
 * Service for handling TraderPlus product operations
 */
@Injectable({
  providedIn: 'root',
})
export class ProductService {
  constructor(private storageService: StorageService) {}

  /**
   * Validates if the data is a valid TraderPlus product
   * @param data Any data to validate
   * @returns True if data has valid product format
   */
  isProductData(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      'className' in data &&
      typeof data.className === 'string'
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
   * Normalize product data to ensure all required fields
   * @param data Raw product data
   * @param filename Source filename for reference
   * @returns Normalized Product object
   */
  normalizeProduct(data: any, filename: string): Product {
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
   * Helper to merge products and ensure proper ID generation
   * @param existing Existing product list
   * @param imported Products being imported
   * @returns Merged product list with proper IDs
   */
  mergeProducts(existing: Product[], imported: Product[]): Product[] {
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
   * @param products Existing product list
   * @returns Next available ID number
   */
  getNextProductId(products: Product[]): number {
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
   * Process imported product data
   * @param data The parsed JSON data
   * @param filename Source filename for reference
   * @returns Promise that resolves when processing is complete
   */
  processImportedData(data: any, filename: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        let products: Product[] = [];
        const safeFilename = filename || 'unknown_file.json';

        if (Array.isArray(data)) {
          // Filter for valid products
          const validProducts = data
            .filter((item) => this.isProductData(item))
            .map((item) => this.normalizeProduct(item, safeFilename));

          if (validProducts.length === 0) {
            reject(new Error('No valid TraderPlus product data found in file'));
            return;
          }

          products = validProducts;
        } else if (this.isProductData(data)) {
          // Single product
          products = [this.normalizeProduct(data, safeFilename)];
        } else {
          reject(new Error('Invalid TraderPlus product format'));
          return;
        }

        const existing = this.storageService.products();
        const merged = this.mergeProducts(existing, products);
        this.storageService.saveProducts(merged);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Process multiple imported product files
   * @param dataArray Array of { data, filename } objects
   * @returns Promise that resolves when processing is complete
   */
  processMultipleImports(dataArray: { data: any, filename: string }[]): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const processedProducts = dataArray.flatMap(({ data, filename }) => {
          const safeFilename = filename || 'unknown_file.json';
          
          if (Array.isArray(data)) {
            return data
              .filter((item) => this.isProductData(item))
              .map((item) => this.normalizeProduct(item, safeFilename));
          } else if (this.isProductData(data)) {
            return [this.normalizeProduct(data, safeFilename)];
          }
          return [];
        });

        if (processedProducts.length === 0) {
          reject(new Error('No valid TraderPlus product data found in files'));
          return;
        }

        const existing = this.storageService.products();
        const merged = this.mergeProducts(existing, processedProducts);
        this.storageService.saveProducts(merged);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get products data for export
   * @returns Products array for export
   */
  getExportData(): Product[] {
    return this.storageService.products();
  }
}

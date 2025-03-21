import { Injectable } from '@angular/core';
import { FileService, StorageService } from '../../../core/services';
import { ActivityLogService } from '../../../shared/services/activity-log.service';
import { NotificationService } from '../../../shared/services';

/**
 * Import statistics to track processed files
 */
export interface ImportStats {
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  categories: number;
  products: number;
  currencies: number;
  settings: number;
}

@Injectable({
  providedIn: 'root',
})
export class FileProcessingService {
  constructor(
    private fileService: FileService,
    private storageService: StorageService,
    private activityLogService: ActivityLogService,
    private notificationService: NotificationService
  ) {}

  /**
   * Resets the import statistics to their initial state
   * Called before starting a new import operation
   */
  createEmptyImportStats(): ImportStats {
    return {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      categories: 0,
      products: 0,
      currencies: 0,
      settings: 0,
    };
  }

  /**
   * Returns a user-friendly label for each data type, with pluralization support
   *
   * @param {string} type - The data type ('categories', 'products', etc.)
   * @param {boolean} plural - Whether to use the plural form
   * @returns {string} The formatted label
   */
  getTypeLabel(type: string, plural: boolean = false): string {
    switch (type) {
      case 'categories':
        return plural ? 'Categories' : 'Category';
      case 'products':
        return plural ? 'Products' : 'Product';
      case 'currencies':
        return 'Currency Settings';
      case 'settings':
        return 'General Settings';
      default:
        return type;
    }
  }

  /**
   * Converts type hints from menu selections to file type identifiers
   * Translates UI concepts (plural, human-readable) to internal type identifiers
   *
   * @param {string} hint - The type hint from the UI
   * @returns {'category' | 'product' | 'currency' | 'general' | null} The corresponding file type
   */
  convertTypeHint(
    hint: string
  ): 'category' | 'product' | 'currency' | 'general' | null {
    switch (hint) {
      case 'categories':
        return 'category';
      case 'products':
        return 'product';
      case 'currencies':
        return 'currency';
      case 'settings':
        return 'general';
      default:
        return null;
    }
  }

  /**
   * Attempts to determine the file type based on filename patterns
   * Uses common naming conventions to identify file types when content analysis is ambiguous
   *
   * @param {string} fileName - The name of the file
   * @returns {'category' | 'product' | 'currency' | 'general' | null} The best guess file type, or null if unknown
   */
  guessTypeFromFilename(
    fileName: string
  ): 'category' | 'product' | 'currency' | 'general' | null {
    const lowerName = fileName.toLowerCase();

    // Check for category file pattern (starts with cat_ or contains category/categories)
    if (
      lowerName.startsWith('cat_') ||
      lowerName.includes('category') ||
      lowerName.includes('categories')
    ) {
      return 'category';
    }

    // Check for product file pattern (starts with prod_ or contains product/products)
    if (
      lowerName.startsWith('prod_') ||
      lowerName.includes('product') ||
      lowerName.includes('products')
    ) {
      return 'product';
    }

    // Check for currency settings (contains currency)
    if (lowerName.includes('currency')) {
      return 'currency';
    }

    // Check for general settings (contains general or settings)
    if (lowerName.includes('general') || lowerName.includes('settings')) {
      return 'general';
    }

    // File type couldn't be determined from filename
    return null;
  }

  /**
   * Processes one or more files for import
   * Core file processing logic that handles file type detection, parsing, and importing
   *
   * @param {FileList} files - The files to process
   * @param {string} [typeHint] - Optional hint about the file type for better detection
   * @returns {Promise<ImportStats>} Promise that resolves with import statistics
   */
  async processFiles(
    files: FileList,
    typeHint?: string
  ): Promise<ImportStats> {
    const importStats = this.createEmptyImportStats();
    const filesArray = Array.from(files);
    const totalFiles = filesArray.length;
    importStats.processed = totalFiles;

    // Log with type information when available
    if (typeHint) {
      this.activityLogService.logActivity(
        'import',
        `Processing ${totalFiles} ${this.getTypeLabel(
          typeHint,
          totalFiles > 1
        )}`
      );
    } else {
      this.activityLogService.logActivity('import', `Processing ${totalFiles} Files`);
    }

    // Process each file individually for better error handling and reporting
    for (const file of filesArray) {
      try {
        // If we have a type hint (from button selection), prioritize it over filename detection
        let dataType = typeHint
          ? this.convertTypeHint(typeHint)
          : this.guessTypeFromFilename(file.name);
        let data;

        try {
          // Parse the file contents
          data = await this.fileService.importFile(file);

          // Only use content detection if we don't have a type hint
          // This prevents mis-categorization when the user has explicitly selected a type
          if (!typeHint) {
            // Try to detect the type based on content structure
            const contentType = this.fileService.detectDataType(data);
            if (contentType) {
              dataType = contentType;
            }
          }
        } catch (parseError) {
          console.error(`Error parsing file ${file.name}:`, parseError);
          importStats.failed++;
          this.activityLogService.logActivity('error', `Failed to parse file: ${file.name}`);
          continue; // Skip to next file
        }

        // Process according to detected type
        switch (dataType) {
          case 'category':
            await this.fileService.importCategories(file);
            importStats.categories++;
            importStats.successful++;
            break;
          case 'product':
            await this.fileService.importProducts(file);
            importStats.products++;
            importStats.successful++;
            break;
          case 'currency':
            await this.fileService.importCurrencySettings(file);
            importStats.currencies++;
            importStats.successful++;
            break;
          case 'general':
            await this.fileService.importGeneralSettings(file);
            importStats.settings++;
            importStats.successful++;
            break;
          default:
            // File type couldn't be determined
            importStats.skipped++;
            const skipMessage = `File ${file.name} doesn't match any TraderPlus format`;
            console.warn(skipMessage);
            this.activityLogService.logActivity('error', skipMessage);
        }
      } catch (error) {
        importStats.failed++;
        const errorMessage = `Error processing ${file.name}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        console.error(errorMessage);
        this.activityLogService.logActivity('error', errorMessage);
      }
    }

    return importStats;
  }

  /**
   * Shows appropriate notifications based on import statistics
   * Creates informative messages for successful, failed, and skipped imports
   */
  showImportResults(importStats: ImportStats): void {
    if (importStats.successful > 0) {
      // Create a detailed success message listing what was imported
      const successTypes = [];
      if (importStats.categories > 0)
        successTypes.push(`${importStats.categories} categories`);
      if (importStats.products > 0)
        successTypes.push(`${importStats.products} products`);
      if (importStats.currencies > 0)
        successTypes.push('currency settings');
      if (importStats.settings > 0) successTypes.push('general settings');

      const successMessage = `Successfully imported ${
        importStats.successful
      } ${
        importStats.successful > 1 ? 'files' : 'file'
      } (${successTypes.join(', ')})`;

      this.notificationService.success(successMessage);
      this.activityLogService.logActivity('import', successMessage);
    }

    if (importStats.failed > 0) {
      const errorMessage = `Failed to import ${importStats.failed} ${
        importStats.failed > 1 ? 'files' : 'file'
      }`;
      this.notificationService.error(errorMessage);
      this.activityLogService.logActivity('error', errorMessage);
    }

    if (importStats.skipped > 0) {
      const skipMessage = `Skipped ${importStats.skipped} ${
        importStats.skipped > 1 ? 'files' : 'file'
      } not matching any TraderPlus format`;
      this.notificationService.warning(skipMessage);
      this.activityLogService.logActivity('error', skipMessage);
    }
  }

  /**
   * Checks storage services for existing data and returns status flags
   * These flags control which UI elements are enabled/disabled and display appropriate messages
   */
  checkExistingData(): {
    hasCategories: boolean;
    hasProducts: boolean;
    hasCurrencies: boolean;
    hasSettings: boolean;
  } {
    return {
      hasCategories: this.storageService.categories()?.length > 0,
      hasProducts: this.storageService.products()?.length > 0,
      hasCurrencies: !!this.storageService.currencySettings(),
      hasSettings: !!this.storageService.generalSettings(),
    };
  }

  /**
   * Deletes data of the specified type
   * 
   * @param {string} dataType - The type of data to delete ('categories', 'products', etc.)
   */
  deleteData(dataType: 'categories' | 'products' | 'currencies' | 'settings'): void {
    try {
      switch (dataType) {
        case 'categories':
          this.storageService.saveCategories([]);
          this.activityLogService.logActivity('categories', 'All categories deleted');
          this.notificationService.success('All categories have been deleted');
          break;
        
        case 'products':
          this.storageService.saveProducts([]);
          this.activityLogService.logActivity('products', 'All products deleted');
          this.notificationService.success('All products have been deleted');
          break;
        
        case 'currencies':
          this.storageService.deleteCurrencySettings();
          this.activityLogService.logActivity('currencies', 'Currency settings deleted');
          this.notificationService.success('Currency settings have been deleted');
          break;
        
        case 'settings':
          this.storageService.removeGeneralSettings();
          this.activityLogService.logActivity('settings', 'General settings deleted');
          this.notificationService.success('General settings have been deleted');
          break;
      }
    } catch (error) {
      console.error(`Error deleting ${dataType}:`, error);
      this.notificationService.error(`Failed to delete ${dataType}`);
      this.activityLogService.logActivity('error', `Failed to delete ${dataType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Returns the total number of categories currently in storage
   *
   * @returns {number} The count of categories, or 0 if none exist
   */
  getCategoriesCount(): number {
    return this.storageService.categories()?.length || 0;
  }

  /**
   * Returns the total number of products currently in storage
   *
   * @returns {number} The count of products, or 0 if none exist
   */
  getProductsCount(): number {
    return this.storageService.products()?.length || 0;
  }

  /**
   * Returns the number of currency types defined in currency settings
   *
   * @returns {number} The count of currency types, or 0 if none exist
   */
  getCurrencyTypesCount(): number {
    const settings = this.storageService.currencySettings();
    return settings?.currencyTypes?.length || 0;
  }
}

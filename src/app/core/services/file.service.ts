import { Injectable } from '@angular/core';
import JSZip from 'jszip';
import { NotificationService } from '../../shared/services';

// Application imports
import { CategoryService } from '../../features/category-editor/services';
import { CurrencyService } from '../../features/currency-editor/services';
import { GeneralSettingsService } from '../../features/general-settings-editor/services';
import { ProductService } from '../../features/product-editor/services';

/**
 * Service for handling file import/export operations.
 * Acts as a facade for specialized data services.
 */
@Injectable({
  providedIn: 'root',
})
export class FileService {
  constructor(
    private categoryService: CategoryService,
    private productService: ProductService,
    private currencyService: CurrencyService,
    private generalSettingsService: GeneralSettingsService,
    private notificationService: NotificationService
  ) {}

  /**
   * Import a JSON file and parse its contents
   * @param file The file to import
   * @returns Promise that resolves with the parsed data
   */
  async importFile(file: File): Promise<any> {
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
   * Auto-detect the type of TraderPlus data
   * @param data The JSON data
   * @returns The detected type or null if not recognized
   */
  detectDataType(
    data: any
  ): 'category' | 'product' | 'currency' | 'general' | null {
    if (this.categoryService.isCategoryData(data)) return 'category';
    if (this.productService.isProductData(data)) return 'product';
    if (this.currencyService.isCurrencySettings(data)) return 'currency';
    if (this.generalSettingsService.isGeneralSettings(data)) return 'general';
    return null;
  }

  /**
   * Import categories from a JSON file
   * @param file The file containing category data
   * @returns Promise that resolves when import is complete
   */
  async importCategories(file: File): Promise<void> {
    const data = await this.importFile(file);
    await this.categoryService.processImportedData(data);
  }

  /**
   * Import multiple category files simultaneously and merge the results.
   * @param files A FileList of category files
   * @returns Promise that resolves when import is complete
   */
  async importMultipleCategories(files: FileList): Promise<void> {
    const filesArray = Array.from(files);
    const results = await Promise.all(
      filesArray.map((file) => this.importFile(file))
    );
    await this.categoryService.processMultipleImports(results);
  }

  /**
   * Import a single product file
   * @param file The file containing product data
   * @returns Promise that resolves when import is complete
   */
  async importProducts(file: File): Promise<void> {
    const data = await this.importFile(file);
    await this.productService.processImportedData(data, file.name);
  }

  /**
   * Import multiple product files simultaneously and merge the results
   * @param files A FileList of product files
   * @returns Promise that resolves when import is complete
   */
  async importMultipleProducts(files: FileList): Promise<void> {
    const filesArray = Array.from(files);
    const results = await Promise.all(
      filesArray.map(async (file) => {
        const data = await this.importFile(file);
        return { data, filename: file.name };
      })
    );
    await this.productService.processMultipleImports(results);
  }

  /**
   * Import currency settings from a JSON file
   * @param file The file containing currency settings
   * @returns Promise that resolves when import is complete
   */
  async importCurrencySettings(file: File): Promise<void> {
    const data = await this.importFile(file);
    await this.currencyService.processImportedData(data);
  }

  /**
   * Import general settings from a JSON file
   * @param file The file containing general settings
   * @returns Promise that resolves when import is complete
   */
  async importGeneralSettings(file: File): Promise<void> {
    const data = await this.importFile(file);
    await this.generalSettingsService.processImportedData(data);
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
   * @returns {boolean} Whether the export was successful
   */
  exportCategories(): boolean {
    const categories = this.categoryService.getExportData();
    if (!categories || categories.length === 0) {
      return false;
    }

    this.exportAsJson(categories, 'TraderPlusCategories.json');
    return true;
  }

  /**
   * Exports products to multiple JSON files in a ZIP archive
   * Each product gets its own file named after its productId
   *
   * @returns {Promise<boolean>} Whether the export was successful
   */
  async exportProducts(): Promise<boolean> {
    // Get products from the product service
    const products = this.productService.getExportData();
    if (!products || products.length === 0) {
      return false;
    }

    try {
      // Create a new ZIP archive
      const zip = new JSZip();
      
      // Add each product as a separate JSON file directly to the zip root
      for (const product of products) {
        const fileName = `${product.productId}.json`;

        // Create a new object with properties in the correct order
        const orderedProduct = {
          className: product.className,
          coefficient: product.coefficient,
          maxStock: product.maxStock,
          tradeQuantity: product.tradeQuantity,
          buyPrice: product.buyPrice,
          sellPrice: product.sellPrice,
          stockSettings: product.stockSettings,
          attachments: product.attachments || [],
          variants: product.variants || [],
        };

        // Convert to JSON with proper formatting (4 spaces indentation)
        const jsonContent = JSON.stringify(orderedProduct, null, 4);

        // Add JSON file directly to the ZIP root
        zip.file(fileName, jsonContent);
      }

      // Generate the ZIP file and offer it for download
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Products.zip';
      document.body.appendChild(a);
      a.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);

      return true;
    } catch (error) {
      console.error('Error exporting products:', error);
      this.notificationService.error('Failed to export products');
      return false;
    }
  }

  /**
   * Export currency settings to a JSON file
   * @returns {boolean} Whether the export was successful
   */
  exportCurrencySettings(): boolean {
    const currencySettings = this.currencyService.getExportData();
    if (!currencySettings) {
      return false;
    }

    this.exportAsJson(currencySettings, 'TraderPlusCurrencySettings.json');
    return true;
  }

  /**
   * Export general settings to a JSON file
   * @returns {boolean} Whether the export was successful
   */
  exportGeneralSettings(): boolean {
    const generalSettings = this.generalSettingsService.getExportData();
    if (!generalSettings) {
      return false;
    }

    this.exportAsJson(generalSettings, 'TraderPlusGeneralSettings.json');
    return true;
  }

  /**
   * Export all configurations as a ZIP archive
   * @returns {Promise<boolean>} Whether the export was successful
   */
  async exportAllAsZip(): Promise<boolean> {
    const zip = new JSZip();
    let hasData = false;

    // Get all configurations from their respective services
    const categories = this.categoryService.getExportData();
    const products = this.productService.getExportData();
    const currencySettings = this.currencyService.getExportData();
    const generalSettings = this.generalSettingsService.getExportData();

    // Create a "TraderPlusData" folder for categories and products
    const dataFolder = zip.folder("TraderPlusData");
    if (!dataFolder) {
      console.error('Failed to create TraderPlusData folder in ZIP');
      return false;
    }

    // Add categories to the TraderPlusData folder if they exist
    if (categories && categories.length > 0) {
      dataFolder.file(
        'TraderPlusCategories.json',
        JSON.stringify(categories, null, 2)
      );
      hasData = true;
    }

    // Add products to the TraderPlusData folder if they exist
    if (products && products.length > 0) {
      // Create Products folder in the TraderPlusData folder
      const productsFolder = dataFolder.folder('Products');
      
      if (!productsFolder) {
        console.error('Failed to create Products folder in ZIP');
        return false;
      }
      
      // Add each product as a separate JSON file
      for (const product of products) {
        const fileName = `${product.productId}.json`;
        
        // Create a new object with properties in the correct order
        const orderedProduct = {
          className: product.className,
          coefficient: product.coefficient,
          maxStock: product.maxStock,
          tradeQuantity: product.tradeQuantity,
          buyPrice: product.buyPrice,
          sellPrice: product.sellPrice,
          stockSettings: product.stockSettings,
          attachments: product.attachments || [],
          variants: product.variants || [],
        };
        
        // Convert to JSON with proper formatting (4 spaces indentation)
        const jsonContent = JSON.stringify(orderedProduct, null, 4);
        
        // Add JSON file to the Products folder
        productsFolder.file(fileName, jsonContent);
      }
      
      hasData = true;
    }

    // Keep currency and general settings files at the root of the zip
    if (currencySettings) {
      zip.file(
        'TraderPlusCurrencySettings.json',
        JSON.stringify(currencySettings, null, 2)
      );
      hasData = true;
    }

    if (generalSettings) {
      zip.file(
        'TraderPlusGeneralSettings.json',
        JSON.stringify(generalSettings, null, 2)
      );
      hasData = true;
    }

    // If no data was added to the ZIP, return false
    if (!hasData) {
      return false;
    }

    try {
      // Generate the ZIP file and download it
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'TraderPlusConfig.zip';
      document.body.appendChild(a);
      a.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);

      return true;
    } catch (error) {
      console.error('Error generating ZIP file:', error);
      return false;
    }
  }
}

import { Injectable } from '@angular/core';
import { CategoryService } from './category.service';
import { ProductService } from './product.service';
import { CurrencyService } from './currency.service';
import { GeneralSettingsService } from './general-settings.service';
import JSZip from 'jszip';

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
    private generalSettingsService: GeneralSettingsService
  ) {}

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
  importCategories(file: File): Promise<void> {
    return this.importFile(file)
      .then(data => this.categoryService.processImportedData(data));
  }

  /**
   * Import multiple category files simultaneously and merge the results.
   * @param files A FileList of category files
   * @returns Promise that resolves when import is complete
   */
  importMultipleCategories(files: FileList): Promise<void> {
    const filesArray = Array.from(files);
    return Promise.all(
      filesArray.map(file => this.importFile(file))
    ).then(results => {
      return this.categoryService.processMultipleImports(results);
    });
  }

  /**
   * Import a single product file
   * @param file The file containing product data
   * @returns Promise that resolves when import is complete
   */
  importProducts(file: File): Promise<void> {
    return this.importFile(file)
      .then(data => this.productService.processImportedData(data, file.name));
  }

  /**
   * Import multiple product files simultaneously and merge the results
   * @param files A FileList of product files
   * @returns Promise that resolves when import is complete
   */
  importMultipleProducts(files: FileList): Promise<void> {
    const filesArray = Array.from(files);
    return Promise.all(
      filesArray.map(file => 
        this.importFile(file).then(data => ({ data, filename: file.name }))
      )
    ).then(results => {
      return this.productService.processMultipleImports(results);
    });
  }

  /**
   * Import currency settings from a JSON file
   * @param file The file containing currency settings
   * @returns Promise that resolves when import is complete
   */
  importCurrencySettings(file: File): Promise<void> {
    return this.importFile(file)
      .then(data => this.currencyService.processImportedData(data));
  }

  /**
   * Import general settings from a JSON file
   * @param file The file containing general settings
   * @returns Promise that resolves when import is complete
   */
  importGeneralSettings(file: File): Promise<void> {
    return this.importFile(file)
      .then(data => this.generalSettingsService.processImportedData(data));
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
      this.categoryService.getExportData(),
      'TraderPlusCategories.json'
    );
  }

  /**
   * Export products to a JSON file
   */
  exportProducts(): void {
    this.exportAsJson(
      this.productService.getExportData(),
      'TraderPlusProducts.json'
    );
  }

  /**
   * Export currency settings to a JSON file
   */
  exportCurrencySettings(): void {
    this.exportAsJson(
      this.currencyService.getExportData(),
      'TraderPlusCurrencySettings.json'
    );
  }

  /**
   * Export general settings to a JSON file
   */
  exportGeneralSettings(): void {
    this.exportAsJson(
      this.generalSettingsService.getExportData(),
      'TraderPlusGeneralSettings.json'
    );
  }

  /**
   * Export all configurations as a ZIP archive
   */
  exportAllAsZip(): void {
    const zip = new JSZip();

    // Get all configurations from their respective services
    const categories = this.categoryService.getExportData();
    const products = this.productService.getExportData();
    const currencySettings = this.currencyService.getExportData();
    const generalSettings = this.generalSettingsService.getExportData();

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

import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';
import { Category, Product, CurrencySettings, GeneralSettings } from '../models';

/**
 * Service for handling file import/export operations
 */
@Injectable({
  providedIn: 'root'
})
export class FileService {
  
  constructor(private storageService: StorageService) { }
  
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
    return this.importFile(file)
      .then((data) => {
        let categories: Category[] = [];
        if (Array.isArray(data)) {
          categories = data as Category[];
        } else if (data && typeof data === 'object') {
          categories = [data];
        } else {
          throw new Error('Invalid category data format');
        }
        // Merge with existing categories
        const existing = this.storageService.categories();
        this.storageService.saveCategories([...existing, ...categories]);
      });
  }
  
  /**
   * Import multiple category files simultaneously and merge the results.
   * @param files A FileList of category files
   * @returns Promise that resolves when import is complete
   */
  importMultipleCategories(files: FileList): Promise<void> {
    const filesArray = Array.from(files);
    return Promise.all(filesArray.map(file => this.importFile(file)))
      .then(results => {
        let importedCategories: Category[] = [];
        for (const result of results) {
          if (Array.isArray(result)) {
            importedCategories = importedCategories.concat(result as Category[]);
          } else if (result && typeof result === 'object') {
            importedCategories.push(result);
          } else {
            throw new Error('Invalid category data format in one of the files');
          }
        }
        // Merge with existing categories
        const existing = this.storageService.categories();
        this.storageService.saveCategories([...existing, ...importedCategories]);
      });
  }
  
  /**
   * Import products from a JSON file
   * @param file The file containing product data
   * @returns Promise that resolves when import is complete
   */
  importProducts(file: File): Promise<void> {
    return this.importFile(file)
      .then((data) => {
        if (Array.isArray(data)) {
          this.storageService.saveProducts(data as Product[]);
        } else {
          throw new Error('Invalid product data format');
        }
      });
  }
  
  /**
   * Import currency settings from a JSON file
   * @param file The file containing currency settings
   * @returns Promise that resolves when import is complete
   */
  importCurrencySettings(file: File): Promise<void> {
    return this.importFile(file)
      .then((data) => {
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
    return this.importFile(file)
      .then((data) => {
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
    this.exportAsJson(this.storageService.categories(), 'TraderPlusCategories.json');
  }
  
  /**
   * Export products to a JSON file
   */
  exportProducts(): void {
    this.exportAsJson(this.storageService.products(), 'TraderPlusProducts.json');
  }
  
  /**
   * Export currency settings to a JSON file
   */
  exportCurrencySettings(): void {
    this.exportAsJson(this.storageService.currencySettings(), 'TraderPlusCurrencySettings.json');
  }
  
  /**
   * Export general settings to a JSON file
   */
  exportGeneralSettings(): void {
    this.exportAsJson(this.storageService.generalSettings(), 'TraderPlusGeneralSettings.json');
  }
}

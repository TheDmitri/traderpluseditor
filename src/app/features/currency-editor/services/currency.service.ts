import { Injectable } from '@angular/core';
import { StorageService } from '../../../core/services/storage.service';
import { CurrencySettings } from '../../../core/models';

/**
 * Service for handling TraderPlus currency settings operations
 */
@Injectable({
  providedIn: 'root',
})
export class CurrencyService {
  constructor(private storageService: StorageService) {}

  /**
   * Validates if data is valid currency settings
   * @param data Any data to validate
   * @returns True if data has valid currency settings format
   */
  isCurrencySettings(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      'currencyTypes' in data &&
      Array.isArray(data.currencyTypes)
    );
  }

  /**
   * Process imported currency settings data
   * @param data The parsed JSON data
   * @returns Promise that resolves when processing is complete
   */
  processImportedData(data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.isCurrencySettings(data)) {
          this.storageService.saveCurrencySettings(data as CurrencySettings);
          resolve();
        } else {
          reject(new Error('Invalid TraderPlus currency settings format'));
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get currency settings data for export
   * @returns Currency settings object for export
   */
  getExportData(): CurrencySettings | null {
    return this.storageService.currencySettings();
  }
}

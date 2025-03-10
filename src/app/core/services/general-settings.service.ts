import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';
import { GeneralSettings } from '../models';

/**
 * Service for handling TraderPlus general settings operations
 */
@Injectable({
  providedIn: 'root',
})
export class GeneralSettingsService {
  constructor(private storageService: StorageService) {}

  /**
   * Validates if data is valid general settings
   * @param data Any data to validate
   * @returns True if data has valid general settings format
   */
  isGeneralSettings(data: any): boolean {
    return data && typeof data === 'object' && 'version' in data;
  }

  /**
   * Process imported general settings data
   * @param data The parsed JSON data
   * @returns Promise that resolves when processing is complete
   */
  processImportedData(data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.isGeneralSettings(data)) {
          this.storageService.saveGeneralSettings(data as GeneralSettings);
          resolve();
        } else {
          reject(new Error('Invalid TraderPlus general settings format'));
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get general settings data for export
   * @returns General settings object for export
   */
  getExportData(): GeneralSettings | null {
    return this.storageService.generalSettings();
  }
}

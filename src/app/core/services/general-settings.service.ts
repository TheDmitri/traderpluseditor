import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';
import { GeneralSettings, License } from '../models';

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
          // Transform license data to match our model structure
          if (data.licenses && Array.isArray(data.licenses)) {
            data.licenses = data.licenses.map((license: any) => this.transformLicense(license));
          }

          // Transform accepted states to match our model structure
          if (data.acceptedStates) {
            data.acceptedStates = this.transformAcceptedStates(data.acceptedStates);
          }
          
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
   * Transform license from imported format to internal model format
   * @param license The license object from imported JSON
   * @returns Transformed license object
   */
  private transformLicense(license: any): License {
    return {
      licenseId: license.licenseId || '',
      licenseName: license.licenseName || '',
      description: license.description || ''
    };
  }

  /**
   * Transform accepted states from imported format to internal model format
   * @param states The accepted states object from imported JSON
   * @returns Transformed accepted states object
   */
  private transformAcceptedStates(states: any): any {
    // Convert numeric values to booleans
    return {
      worn: states.acceptWorn === 1,
      damaged: states.acceptDamaged === 1,
      badly_damaged: states.acceptBadlyDamaged === 1,
      coefficientWorn: states.coefficientWorn || 0.0,
      coefficientDamaged: states.coefficientDamaged || 0.0,
      coefficientBadlyDamaged: states.coefficientBadlyDamaged || 0.0
    };
  }

  /**
   * Get general settings data for export
   * @returns General settings object for export
   */
  getExportData(): GeneralSettings | null {
    return this.storageService.generalSettings();
  }
}

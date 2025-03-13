import { Injectable } from '@angular/core';

// Application imports
import { GeneralSettings, License } from '../../../core/models';
import { StorageService } from '../../../core/services';

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
          
          this.saveGeneralSettings(data as GeneralSettings);
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
    // Convert numeric values to booleans and ensure coefficients are 0 when state is inactive
    const worn = states.acceptWorn === 1;
    const damaged = states.acceptDamaged === 1;
    const badly_damaged = states.acceptBadlyDamaged === 1;
    
    return {
      worn: worn,
      damaged: damaged,
      badly_damaged: badly_damaged,
      coefficientWorn: worn ? (states.coefficientWorn || 0.0) : 0.0,
      coefficientDamaged: damaged ? (states.coefficientDamaged || 0.0) : 0.0,
      coefficientBadlyDamaged: badly_damaged ? (states.coefficientBadlyDamaged || 0.0) : 0.0
    };
  }

  /**
   * Get general settings data for export
   * @returns General settings object for export
   */
  getExportData(): GeneralSettings | null {
    return this.getGeneralSettings();
  }
  
  /**
   * Get general settings from storage
   * @returns General settings object or null if none exist
   */
  getGeneralSettings(): GeneralSettings | null {
    return this.storageService.generalSettings();
  }
  
  /**
   * Check if general settings exist
   * @returns True if general settings exist
   */
  hasSettings(): boolean {
    return !!this.getGeneralSettings();
  }
  
  /**
   * Save general settings to storage
   * @param settings The settings to save
   */
  saveGeneralSettings(settings: GeneralSettings): void {
    this.storageService.saveGeneralSettings(settings);
  }
  
  /**
   * Delete all general settings
   */
  deleteGeneralSettings(): void {
    this.storageService.removeGeneralSettings();
  }
  
  /**
   * Create new general settings with default values
   * @returns New general settings object
   */
  createDefaultGeneralSettings(): GeneralSettings {
    return {
      version: '2.0.0',
      serverID: this.generateGUID(),
      licenses: [
        {
            "licenseId": "license_car_licence_001",
            "licenseName": "Car Licence",
            "description": ""
        },
        {
            "licenseId": "license_admin_license_001",
            "licenseName": "Admin Licence",
            "description": ""
        }
      ],
      acceptedStates: {
        worn: true,
        damaged: false,
        badly_damaged: false,
        coefficientWorn: 0.8,
        coefficientDamaged: 0.0,
        coefficientBadlyDamaged: 0.0
      },
      traders: [],
      traderObjects: []
    };
  }
  
  /**
   * Generate a GUID string
   * @returns A GUID string
   */
  generateGUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0,
        v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }).toUpperCase();
  }
}

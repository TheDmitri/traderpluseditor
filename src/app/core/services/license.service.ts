import { Injectable } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { License } from '../models';
import { GeneralSettingsService } from './general-settings.service';

/**
 * Service for managing licenses in TraderPlus general settings
 */
@Injectable({
  providedIn: 'root',
})
export class LicenseService {
  constructor(private generalSettingsService: GeneralSettingsService) {}
  
  /**
   * Get a data source of all licenses
   * @returns MatTableDataSource of licenses or empty array if none exist
   */
  getLicensesDataSource(): MatTableDataSource<License> {
    const settings = this.generalSettingsService.getGeneralSettings();
    const licenses = settings?.licenses || [];
    return new MatTableDataSource<License>(licenses);
  }
  
  /**
   * Creates a new license object without saving it to settings
   * @returns A new license object with empty values and a generated ID
   */
  createLicense(): License {
    return {
      licenseId: this.generalSettingsService.generateGUID(),
      licenseName: '',
      description: ''
    };
  }
  
  /**
   * Add a license object to the settings and save it
   * @param license The license object to add
   * @returns True if the license was added successfully, false otherwise
   */
  addLicenseToSettings(license: License): boolean {
    const settings = this.generalSettingsService.getGeneralSettings();
    if (!settings) return false;
    
    // Initialize the licenses array if it doesn't exist
    if (!settings.licenses) {
      settings.licenses = [];
    }
    
    // Add the license to the beginning of the array
    settings.licenses.unshift(license);
    
    // Save the updated settings
    this.generalSettingsService.saveGeneralSettings(settings);
    
    return true;
  }
  
  /**
   * Save a license
   * @param licenseIndex The index of the license to update
   * @param licenseName The new license name
   * @param description The new license description
   * @returns True if saved successfully, false otherwise
   */
  saveLicense(licenseIndex: number, licenseName: string, description: string): boolean {
    const settings = this.generalSettingsService.getGeneralSettings();
    if (!settings || !settings.licenses || licenseIndex < 0 || licenseIndex >= settings.licenses.length) {
      return false;
    }
    
    const currentLicense = settings.licenses[licenseIndex];
    
    // Update the license
    settings.licenses[licenseIndex] = {
      licenseId: currentLicense.licenseId || this.generalSettingsService.generateGUID(),
      licenseName: licenseName.trim(),
      description: description.trim()
    };
    
    // Save the updated settings
    this.generalSettingsService.saveGeneralSettings(settings);
    
    return true;
  }
  
  /**
   * Validate and save a license with error handling
   * @param licenseIndex The index of the license to update
   * @param licenseName The new license name
   * @param description The new license description
   * @returns Object containing success status and error message if applicable
   */
  validateAndSaveLicense(licenseIndex: number, licenseName: string, description: string): { success: boolean; error?: string } {
    // Validate the license (name is required)
    const trimmedName = licenseName.trim();
    if (!trimmedName) {
      return { success: false, error: 'License name is required' };
    }
    
    // Try to save the license
    const saved = this.saveLicense(licenseIndex, trimmedName, description);
    
    if (saved) {
      return { success: true };
    } else {
      return { success: false, error: 'Failed to save license' };
    }
  }
  
  /**
   * Check if a license at a given index is empty (has no name)
   * @param index The index of the license to check
   * @returns True if the license exists and has no name
   */
  isLicenseEmpty(index: number): boolean {
    const settings = this.generalSettingsService.getGeneralSettings();
    if (!settings?.licenses || index < 0 || index >= settings.licenses.length) {
      return false;
    }
    
    return !settings.licenses[index].licenseName?.trim();
  }
  
  /**
   * Delete an empty license if it exists at the specified index
   * @param index The index of the license to delete if empty
   * @returns True if an empty license was deleted, false otherwise
   */
  deleteEmptyLicense(index: number): boolean {
    if (this.isLicenseEmpty(index)) {
      return this.deleteLicense(index);
    }
    return false;
  }
  
  /**
   * Delete a license
   * @param index The index of the license to delete
   * @returns True if deleted successfully, false otherwise
   */
  deleteLicense(index: number): boolean {
    const settings = this.generalSettingsService.getGeneralSettings();
    if (!settings || !settings.licenses || index < 0 || index >= settings.licenses.length) {
      return false;
    }
    
    // Remove the license
    settings.licenses.splice(index, 1);
    
    // Save the updated settings
    this.generalSettingsService.saveGeneralSettings(settings);
    
    return true;
  }
  
  /**
   * Delete all licenses
   * @returns True if deleted successfully, false otherwise
   */
  deleteAllLicenses(): boolean {
    const settings = this.generalSettingsService.getGeneralSettings();
    if (!settings) return false;
    
    // Clear all licenses
    settings.licenses = [];
    
    // Save the updated settings
    this.generalSettingsService.saveGeneralSettings(settings);
    
    return true;
  }
  
  /**
   * Check if a license can be saved based on the name
   * @param name The license name to check
   * @returns True if the license can be saved
   */
  canSaveLicense(name: string): boolean {
    return !!name?.trim();
  }
}

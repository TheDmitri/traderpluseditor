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
   * Add a new license to general settings
   * @returns The newly created license or null if settings don't exist
   */
  addLicense(): License | null {
    const settings = this.generalSettingsService.getGeneralSettings();
    if (!settings) return null;
    
    // Create a new empty license
    const newLicense: License = {
      licenseId: this.generalSettingsService.generateGUID(),
      licenseName: '',
      description: ''
    };
    
    // Initialize the licenses array if it doesn't exist
    if (!settings.licenses) {
      settings.licenses = [];
    }
    
    // Add the license to the beginning of the array
    settings.licenses.unshift(newLicense);
    
    // Save the updated settings
    this.generalSettingsService.saveGeneralSettings(settings);
    
    return newLicense;
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

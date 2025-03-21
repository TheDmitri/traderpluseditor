import { Injectable } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';

// Application imports
import { License } from '../../../core/models';
import { GeneralSettingsService } from '.';
import { ConfirmDialogComponent } from '../../../shared/components';
import { NotificationService } from '../../../shared/services';

/**
 * Service for managing licenses in TraderPlus general settings
 */
@Injectable({
  providedIn: 'root',
})
export class LicenseService {
  // Temporary license for adding new licenses
  private newLicense: License | null = null;
  
  // Flag to track if we're adding a new license vs editing an existing one
  private isAddingNewLicense = false;
  
  // Current license being edited (UI state)
  private editingLicenseIndex: number | null = null;
  private editLicenseName: string = '';
  private editLicenseDescription: string = '';

  constructor(
    private generalSettingsService: GeneralSettingsService,
    private dialog: MatDialog,
    private notificationService: NotificationService
  ) {}
  
  /**
   * Generates a license ID based on the license name
   * Format: license_[lowercase_name_with_underscores]_[numeric_suffix]
   * 
   * @param licenseName The name of the license
   * @returns A formatted license ID
   */
  generateLicenseId(licenseName: string): string {
    if (!licenseName || !licenseName.trim()) {
      // If no name provided, return a temporary ID that will be updated later
      return 'license_temp_' + Math.floor(Math.random() * 1000000);
    }
    
    // Format: lowercase and replace spaces with underscores
    const formattedName = licenseName.trim().toLowerCase().replace(/\s+/g, '_');
    
    // Get all existing licenses to check for duplicates
    const settings = this.generalSettingsService.getGeneralSettings();
    if (!settings || !settings.licenses) {
      // No existing licenses, so use 001 suffix
      return `license_${formattedName}_001`;
    }
    
    // Check for existing licenses with the same base name
    const baseId = `license_${formattedName}_`;
    const duplicates = settings.licenses.filter(license => 
      license.licenseId && license.licenseId.startsWith(baseId)
    );
    
    if (duplicates.length === 0) {
      // No duplicates, use 001 suffix
      return `${baseId}001`;
    }
    
    // Find the highest suffix and increment it
    let highestSuffix = 0;
    duplicates.forEach(license => {
      if (license.licenseId) {
        const suffixMatch = license.licenseId.match(/_(\d+)$/);
        if (suffixMatch && suffixMatch[1]) {
          const suffix = parseInt(suffixMatch[1], 10);
          if (suffix > highestSuffix) {
            highestSuffix = suffix;
          }
        }
      }
    });
    
    // Format the new suffix with leading zeros (e.g., 001, 002, etc.)
    const newSuffix = (highestSuffix + 1).toString().padStart(3, '0');
    return `${baseId}${newSuffix}`;
  }
  
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
   * @returns A new license object with empty values
   */
  createLicense(): License {
    return {
      licenseId: 'license_temp_' + Math.floor(Math.random() * 1000000),
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
    
    // Ensure the license has a proper ID based on its name
    if (license.licenseName) {
      license.licenseId = this.generateLicenseId(license.licenseName);
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
    
    const trimmedName = licenseName.trim();
    const currentLicense = settings.licenses[licenseIndex];
    
    // Generate a new ID if the name changed or if the current ID doesn't follow our pattern
    let licenseId = currentLicense.licenseId || '';
    
    // If the name changed or the ID doesn't follow our pattern, generate a new ID
    if (trimmedName !== currentLicense.licenseName || 
        !licenseId.startsWith('license_') || 
        !licenseId.match(/_\d{3}$/)) {
      licenseId = this.generateLicenseId(trimmedName);
    }
    
    // Update the license
    settings.licenses[licenseIndex] = {
      licenseId: licenseId,
      licenseName: trimmedName,
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

  /**
   * Add a new license for editing (but don't save it yet)
   * @returns Object with the updated datasource and license editing state
   */
  addLicense(): {
    dataSource: MatTableDataSource<License>;
    editingIndex: number;
    editName: string;
    editDescription: string;
  } {
    // Create a new license but don't save it to settings yet
    this.newLicense = this.createLicense();
    this.isAddingNewLicense = true;
    
    // Update the temporary data for editing
    this.editingLicenseIndex = 0;
    this.editLicenseName = '';
    this.editLicenseDescription = '';
    
    // Create a temporary datasource with the new license at the top
    const currentLicenses = [...this.getLicensesDataSource().data];
    currentLicenses.unshift(this.newLicense);
    
    return {
      dataSource: new MatTableDataSource<License>(currentLicenses),
      editingIndex: this.editingLicenseIndex,
      editName: this.editLicenseName,
      editDescription: this.editLicenseDescription
    };
  }

  /**
   * Cancel editing a license
   * @returns The updated datasource after cancellation
   */
  cancelEditLicense(): MatTableDataSource<License> {
    if (this.isAddingNewLicense) {
      // If we're adding a new license, just remove it from the UI
      this.isAddingNewLicense = false;
      this.newLicense = null;
    }
    
    this.editingLicenseIndex = null;
    
    // Return the updated datasource
    return this.getLicensesDataSource();
  }

  /**
   * Start editing a license
   * @param license - The license to edit
   * @param index - The index of the license in the array
   * @returns Object with the editing state information
   */
  startEditLicense(license: License, index: number): {
    dataSource: MatTableDataSource<License>;
    editingIndex: number;
    editName: string;
    editDescription: string;
    isAdding: boolean;
  } {
    // If we were adding a new license and now want to edit something else,
    // discard the new license
    if (this.isAddingNewLicense) {
      this.isAddingNewLicense = false;
      this.newLicense = null;
    }
    
    this.editingLicenseIndex = index;
    this.editLicenseName = license.licenseName || '';
    this.editLicenseDescription = license.description || '';
    
    return {
      dataSource: this.getLicensesDataSource(),
      editingIndex: this.editingLicenseIndex,
      editName: this.editLicenseName,
      editDescription: this.editLicenseDescription,
      isAdding: this.isAddingNewLicense
    };
  }

  /**
   * Save the currently edited license
   * @param editingIndex - The index of the license being edited
   * @param editName - The name of the license being edited
   * @param editDescription - The description of the license being edited
   * @returns Object with the result of the operation and updated datasource
   */
  saveLicenseWithUIState(
    editingIndex: number | null,
    editName: string,
    editDescription: string
  ): {
    success: boolean;
    error?: string;
    dataSource: MatTableDataSource<License>;
  } {
    if (editingIndex === null) {
      return {
        success: false,
        error: 'No license is being edited',
        dataSource: this.getLicensesDataSource()
      };
    }
    
    // Check if we're adding a new license
    if (this.isAddingNewLicense && this.newLicense) {
      // Update the temporary license object
      this.newLicense.licenseName = editName.trim();
      this.newLicense.description = editDescription.trim();
      
      // Validate the license name
      if (!this.newLicense.licenseName) {
        return {
          success: false,
          error: 'License name is required',
          dataSource: this.getLicensesDataSource()
        };
      }
      
      // Add the license to the settings
      if (this.addLicenseToSettings(this.newLicense)) {
        // Reset state
        this.isAddingNewLicense = false;
        this.newLicense = null;
        this.editingLicenseIndex = null;
        
        return {
          success: true,
          dataSource: this.getLicensesDataSource()
        };
      } else {
        return {
          success: false,
          error: 'Failed to save license',
          dataSource: this.getLicensesDataSource()
        };
      }
    } else {
      // We're editing an existing license
      const result = this.validateAndSaveLicense(
        editingIndex, 
        editName, 
        editDescription
      );
      
      if (result.success) {
        // Reset editing state
        this.editingLicenseIndex = null;
        
        return {
          success: true,
          dataSource: this.getLicensesDataSource()
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to save license',
          dataSource: this.getLicensesDataSource()
        };
      }
    }
  }

  /**
   * Get the current license editing state
   * @returns Object with the current license editing state
   */
  getLicenseEditingState(): {
    editingIndex: number | null;
    editName: string;
    editDescription: string;
    isAdding: boolean;
  } {
    return {
      editingIndex: this.editingLicenseIndex,
      editName: this.editLicenseName,
      editDescription: this.editLicenseDescription,
      isAdding: this.isAddingNewLicense
    };
  }

  /**
   * Set license edit state manually
   * @param editName - The name to set
   * @param editDescription - The description to set
   */
  setLicenseEditState(editName: string, editDescription: string): void {
    this.editLicenseName = editName;
    this.editLicenseDescription = editDescription;
  }

  /**
   * Clear license edit state
   */
  clearLicenseEditState(): void {
    this.editingLicenseIndex = null;
    this.editLicenseName = '';
    this.editLicenseDescription = '';
    this.isAddingNewLicense = false;
    this.newLicense = null;
  }

  /**
   * Delete a license after confirmation
   * @param index - The index of the license to delete
   * @returns Promise resolving to the updated license datasource
   */
  deleteLicenseWithConfirmation(index: number): Promise<MatTableDataSource<License>> {
    return new Promise((resolve) => {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Delete License',
          message: 'Are you sure you want to delete this license? \n\nThis action cannot be undone.',
          confirmText: 'Delete',
          cancelText: 'Cancel',
          type: 'danger'
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          if (this.deleteLicense(index)) {
            this.notificationService.success('License deleted successfully');
          } else {
            this.notificationService.error('Failed to delete license');
          }
        }
        resolve(this.getLicensesDataSource());
      });
    });
  }

  /**
   * Delete all licenses after confirmation
   * @returns Promise resolving to the updated license datasource
   */
  deleteAllLicensesWithConfirmation(): Promise<MatTableDataSource<License>> {
    return new Promise((resolve) => {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Delete All Licenses',
          message: 'Are you sure you want to delete all licenses? \n\nThis action cannot be undone.',
          confirmText: 'Delete All',
          cancelText: 'Cancel',
          type: 'danger'
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          if (this.deleteAllLicenses()) {
            this.notificationService.success('All licenses deleted successfully');
            resolve(new MatTableDataSource<License>([]));
          } else {
            this.notificationService.error('Failed to delete licenses');
            resolve(this.getLicensesDataSource());
          }
        } else {
          resolve(this.getLicensesDataSource());
        }
      });
    });
  }
}
import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

// Application imports
import { GeneralSettings, License } from '../../../core/models';
import { StorageService, InitializationService } from '../../../core/services';
import { ConfirmDialogComponent } from '../../../shared/components';
import { NotificationService } from '../../../shared/services';

/**
 * Service for handling TraderPlus general settings operations
 */
@Injectable({
  providedIn: 'root',
})
export class GeneralSettingsService {
  constructor(
    private storageService: StorageService,
    private initializationService: InitializationService,
    private dialog: MatDialog,
    private notificationService: NotificationService
  ) {}

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
   * Create and save new general settings with default values
   * @returns The newly created general settings
   */
  createAndSaveDefaultGeneralSettings(): GeneralSettings {
    // Create default settings using the initialization service
    const generalSettings = this.initializationService.createDefaultGeneralSettings();
    
    // Save the new settings
    this.saveGeneralSettings(generalSettings);
    
    // Notification
    this.notificationService.success('General settings created successfully');
    
    return generalSettings;
  }
  
  /**
   * Delete all general settings after confirmation
   * @returns Promise that resolves to true if settings were deleted, false otherwise
   */
  deleteGeneralSettingsWithConfirmation(): Promise<boolean> {
    return new Promise((resolve) => {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Delete All Settings',
          message: 'Are you sure you want to delete all general settings? \n\nThis action cannot be undone.',
          confirmText: 'Delete All',
          cancelText: 'Cancel',
          type: 'danger'
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          // Clear all settings
          this.deleteGeneralSettings();
          
          // Notification
          this.notificationService.success('All general settings deleted successfully');
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }
}

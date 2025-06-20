import { Injectable } from '@angular/core';

// Application imports
import { CurrencySettings, CurrencyType } from '../../../core/models';
import { StorageService } from '../../../core/services';

/**
 * Service for handling TraderPlus currency settings operations
 */
@Injectable({
  providedIn: 'root',
})
export class CurrencyService {
  constructor(private storageService: StorageService) {}

  /**
   * Loads currency settings from storage
   * @returns Current currency settings or default empty settings
   */
  loadCurrencySettings(): CurrencySettings {
    const settings = this.storageService.currencySettings();
    
    if (settings && settings.currencyTypes) {
      return settings;
    } else {
      // Initialize empty currency settings if none exist
      return {
        version: '2.0.0',
        currencyTypes: []
      };
    }
  }

  /**
   * Checks if the currency settings have any currency types
   * @returns True if there are currency types
   */
  hasCurrencyTypes(): boolean {
    const settings = this.storageService.currencySettings();
    return !!(settings && settings.currencyTypes && settings.currencyTypes.length > 0);
  }

  /**
   * Calculates the number of currencies in a given currency type
   * @param currencyType The currency type to analyze
   * @returns The total count of currencies
   */
  getCurrencyCount(currencyType: CurrencyType): number {
    return currencyType.currencies ? currencyType.currencies.length : 0;
  }

  /**
   * Creates a new empty currency type
   * @returns A new currency type object
   */
  createNewCurrencyType(): CurrencyType {
    return {
      currencyName: '',
      currencies: []
    };
  }

  /**
   * Adds a currency type to the settings
   * @param currencyType The currency type to add
   * @param currencyTypeList The list to add to
   * @returns Updated list of currency types
   */
  addCurrencyType(currencyType: CurrencyType, currencyTypeList: CurrencyType[]): CurrencyType[] {
    return [currencyType, ...currencyTypeList];
  }

  /**
   * Checks if a currency type name already exists
   * @param name The name to check
   * @param settings Current currency settings
   * @param excludeCurrencyType Optional currency type to exclude
   * @returns True if the name is a duplicate
   */
  isCurrencyTypeNameDuplicate(
    name: string, 
    settings: CurrencySettings,
    excludeCurrencyType?: CurrencyType
  ): boolean {
    if (!name || !settings) return false;
    
    const normalizedName = name.trim().toLowerCase();
    return settings.currencyTypes.some(ct => 
      ct !== excludeCurrencyType && 
      ct.currencyName.toLowerCase() === normalizedName
    );
  }

  /**
   * Validates a currency type name
   * @param name The name to validate
   * @param settings Current currency settings
   * @param currencyType Optional existing currency type (for edit mode)
   * @returns Object containing validity and error message
   */
  validateCurrencyTypeName(
    name: string, 
    settings: CurrencySettings,
    currencyType?: CurrencyType
  ): { isValid: boolean; errorMessage: string } {
    if (!name || name.trim() === '') {
      return { 
        isValid: false, 
        errorMessage: 'Currency name cannot be empty' 
      };
    }
    
    if (name.includes(' ')) {
      return { 
        isValid: false, 
        errorMessage: 'Currency name cannot contain spaces' 
      };
    }
    
    if (this.isCurrencyTypeNameDuplicate(name, settings, currencyType)) {
      return { 
        isValid: false, 
        errorMessage: `Currency type "${name}" already exists` 
      };
    }
    
    return { isValid: true, errorMessage: '' };
  }

  /**
   * Saves an edited currency type
   * @param updatedCurrencyType The updated currency type
   * @param newName The new name for the currency type
   * @param isNewMode Whether this is a new currency type
   * @returns Updated currency settings
   */
  saveCurrencyType(
    updatedCurrencyType: CurrencyType,
    newName: string,
    isNewMode: boolean
  ): CurrencySettings | null {
    const settings = this.storageService.currencySettings();
    if (!settings) return null;
    
    updatedCurrencyType.currencyName = newName;
    
    if (isNewMode) {
      // For new currency types, update with the data source (which already has the new item)
      this.storageService.saveCurrencySettings(settings);
    } else {
      // For existing currency types, find and update the specific one
      settings.currencyTypes = settings.currencyTypes.map(ct => {
        if (ct === updatedCurrencyType) {
          return updatedCurrencyType;
        }
        return ct;
      });
      this.storageService.saveCurrencySettings(settings);
    }
    
    return settings;
  }

  /**
   * Removes a currency type after confirmation
   * @param currencyType The currency type to remove
   * @returns Updated settings or null if canceled
   */
  removeCurrencyType(currencyType: CurrencyType): CurrencySettings | null {
    const settings = this.storageService.currencySettings();
    if (!settings) return null;
    
    // Filter out the currency type to be deleted
    settings.currencyTypes = settings.currencyTypes.filter(
      (ct) => ct.currencyName !== currencyType.currencyName
    );
    
    // Save the updated currency settings
    this.storageService.saveCurrencySettings(settings);
    return settings;
  }

  /**
   * Removes all currency types
   * @returns Empty currency settings
   */
  removeAllCurrencyTypes(): CurrencySettings {
    // Delete the currency settings entirely from localStorage
    this.storageService.deleteCurrencySettings();
    
    // Return empty settings object for UI state
    return {
      version: '2.0.0',
      currencyTypes: [],
    };
  }

  /**
   * Updates a currency type with new data
   * @param currentSettings The current settings
   * @param updatedCurrencyType The updated currency type
   * @returns Updated currency settings
   */
  updateCurrencyType(
    currentSettings: CurrencySettings,
    updatedCurrencyType: CurrencyType
  ): CurrencySettings {
    if (!currentSettings) return { version: '2.0.0', currencyTypes: [] };
    
    // Update the currency type with the updated currencies
    currentSettings.currencyTypes = currentSettings.currencyTypes.map((ct) => {
      if (ct.currencyName === updatedCurrencyType.currencyName) {
        return updatedCurrencyType;
      }
      return ct;
    });
    
    // Save the updated currency settings
    this.storageService.saveCurrencySettings(currentSettings);
    return currentSettings;
  }

  /**
   * Cancels editing of a currency type
   * @param currencyType The currency type being edited
   * @param isNewMode Whether this is a new currency type
   * @param dataSource Current data source
   * @returns Updated data source and settings
   */
  cancelCurrencyTypeEdit(
    currencyType: CurrencyType,
    isNewMode: boolean,
    dataSource: CurrencyType[]
  ): { updatedData: CurrencyType[], updatedSettings: CurrencySettings | null } {
    if (!isNewMode) {
      // For existing currency types, no changes needed to data source
      return { 
        updatedData: dataSource,
        updatedSettings: this.storageService.currencySettings()
      };
    }
    
    // For new currency types, remove from data source
    const filteredData = dataSource.filter(item => item !== currencyType);
    
    // Check if this was the last currency type
    if (filteredData.length === 0) {
      // If no currency types remain, remove currency settings from localStorage
      this.storageService.deleteCurrencySettings();
      return { 
        updatedData: [],
        updatedSettings: null
      };
    } else {
      // Otherwise, update the currency types
      const settings = this.storageService.currencySettings();
      if (settings) {
        settings.currencyTypes = filteredData;
        this.storageService.saveCurrencySettings(settings);
      }
      return { 
        updatedData: filteredData,
        updatedSettings: settings
      };
    }
  }
  
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

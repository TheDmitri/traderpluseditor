import { Injectable } from '@angular/core';
import { CurrencyType } from '../../../core/models';
import { CurrencyService } from '../../currency-editor/services/currency.service';

/**
 * Service for managing currencies for traders
 */
@Injectable({
  providedIn: 'root'
})
export class TraderCurrencyService {
  /** Available currency types from CurrencyService */
  private availableCurrencyTypes: CurrencyType[] = [];
  
  /** Selected currency names map for quick lookup and state tracking */
  private selectedCurrencyNameMap: { [currencyName: string]: boolean } = {};

  /** Unknown currency names that exist in trader but not in available currency types */
  private unknownCurrencyNames: string[] = [];

  constructor(private currencyService: CurrencyService) {}

  /**
   * Load currencies from the CurrencyService and identify unknown currencies
   * @param traderCurrencyNames Optional array of currency names already assigned to the trader
   */
  loadCurrencies(traderCurrencyNames?: string[]): void {
    // Get currency settings from the CurrencyService
    const currencySettings = this.currencyService.loadCurrencySettings();
    this.availableCurrencyTypes = currencySettings?.currencyTypes || [];

    // After loading currencies, check for unknown currencies if we have trader currencies
    if (traderCurrencyNames?.length) {
      this.initializeSelectedCurrencies(traderCurrencyNames);
    } else {
      // Reset maps and arrays
      this.selectedCurrencyNameMap = {};
      this.unknownCurrencyNames = [];
    }
  }

  /**
   * Initialize selected currencies from trader data
   * @param currencyNames Array of currency names to mark as selected
   */
  initializeSelectedCurrencies(currencyNames: string[]): void {
    // Reset map
    this.selectedCurrencyNameMap = {};
    
    // Set selected state for each currency name
    currencyNames.forEach(name => {
      this.selectedCurrencyNameMap[name] = true;
    });

    // Identify unknown currencies
    this.identifyUnknownCurrencies(currencyNames);
  }

  /**
   * Find currency names assigned to the trader that don't exist in availableCurrencyTypes
   * @param currencyNames Array of currency names to check
   */
  private identifyUnknownCurrencies(currencyNames: string[]): void {
    this.unknownCurrencyNames = currencyNames.filter(name => 
      !this.availableCurrencyTypes.some(currencyType => currencyType.currencyName === name)
    );
  }

  /**
   * Get available currency types
   * @returns Array of all available currency types
   */
  getAvailableCurrencyTypes(): CurrencyType[] {
    return this.availableCurrencyTypes;
  }

  /**
   * Get currencies sorted with selected ones at the top
   */
  getSortedCurrencyTypes(): CurrencyType[] {
    if (!this.availableCurrencyTypes || this.availableCurrencyTypes.length === 0) {
      return [];
    }
    
    // Create a copy of the currencies array to avoid modifying the original
    return [...this.availableCurrencyTypes].sort((a, b) => {
      const isASelected = this.isCurrencySelected(a.currencyName);
      const isBSelected = this.isCurrencySelected(b.currencyName);
      
      // If A is selected and B is not, A comes first
      if (isASelected && !isBSelected) {
        return -1;
      }
      
      // If B is selected and A is not, B comes first
      if (!isASelected && isBSelected) {
        return 1;
      }
      
      // If both are selected or both are unselected, maintain original order
      return 0;
    });
  }

  /**
   * Get unknown currencies formatted for display
   */
  getUnknownCurrenciesForDisplay(): CurrencyType[] {
    return this.unknownCurrencyNames.map(name => ({
      currencyName: name,
      currencies: []
    }));
  }

  /**
   * Get unknown currency names
   * @returns Array of unknown currency names
   */
  getUnknownCurrencyNames(): string[] {
    return [...this.unknownCurrencyNames];
  }

  /**
   * Check if a currency is unknown
   * @param currencyName The currency name to check
   * @returns True if the currency is unknown
   */
  isUnknownCurrency(currencyName: string): boolean {
    return this.unknownCurrencyNames.includes(currencyName);
  }

  /**
   * Toggle a currency selection
   * @param currencyName The currency name to toggle
   */
  toggleCurrency(currencyName: string): void {
    this.selectedCurrencyNameMap[currencyName] = !this.selectedCurrencyNameMap[currencyName];
  }

  /**
   * Check if a currency is selected
   * @param currencyName The currency name to check
   * @returns True if the currency is selected
   */
  isCurrencySelected(currencyName: string): boolean {
    return !!this.selectedCurrencyNameMap[currencyName];
  }

  /**
   * Get the list of selected currency names
   * @returns Array of selected currency names
   */
  getSelectedCurrencyNames(): string[] {
    return Object.keys(this.selectedCurrencyNameMap).filter(name => this.selectedCurrencyNameMap[name]);
  }
}

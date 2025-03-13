import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';
import { CurrencySettings } from '../models';

/**
 * Service for initializing standard application data
 */
@Injectable({
  providedIn: 'root'
})
export class InitializationService {
  constructor(private storageService: StorageService) {}

  /**
   * Creates standard currency types and currencies based on TraderPlusCurrencySettings.json
   * This provides a set of commonly used currencies (EUR and USD) with different denominations
   */
  createStandardCurrencies(): void {
    // Create standard currency settings with EUR and USD
    const standardCurrencySettings: CurrencySettings = {
      version: '2.0.0',
      currencyTypes: [
        {
          currencyName: 'EUR',
          currencies: [
            { className: 'TraderPlus_Money_Euro100', value: 100 },
            { className: 'TraderPlus_Money_Euro50', value: 50 },
            { className: 'TraderPlus_Money_Euro10', value: 10 },
            { className: 'TraderPlus_Money_Euro5', value: 5 },
            { className: 'TraderPlus_Money_Euro1', value: 1 }
          ]
        },
        {
          currencyName: 'USD',
          currencies: [
            { className: 'TraderPlus_Money_Dollar100', value: 100 },
            { className: 'TraderPlus_Money_Dollar50', value: 50 },
            { className: 'TraderPlus_Money_Dollar10', value: 10 },
            { className: 'TraderPlus_Money_Dollar5', value: 5 },
            { className: 'TraderPlus_Money_Dollar1', value: 1 }
          ]
        }
      ]
    };
    
    // Save the standard currency settings
    this.storageService.saveCurrencySettings(standardCurrencySettings);
  }
}

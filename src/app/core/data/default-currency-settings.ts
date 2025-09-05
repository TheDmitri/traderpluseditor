import { CurrencySettings, Currency } from '../models';

/**
 * Default EUR currency denominations
 */
export const DEFAULT_EUR_CURRENCIES: Currency[] = [
  { className: 'TraderX_Money_Euro100', value: 100 },
  { className: 'TraderX_Money_Euro50', value: 50 },
  { className: 'TraderX_Money_Euro10', value: 10 },
  { className: 'TraderX_Money_Euro5', value: 5 },
  { className: 'TraderX_Money_Euro1', value: 1 }
];

/**
 * Default USD currency denominations
 */
export const DEFAULT_USD_CURRENCIES: Currency[] = [
  { className: 'TraderX_Money_Dollar100', value: 100 },
  { className: 'TraderX_Money_Dollar50', value: 50 },
  { className: 'TraderX_Money_Dollar10', value: 10 },
  { className: 'TraderX_Money_Dollar5', value: 5 },
  { className: 'TraderX_Money_Dollar1', value: 1 }
];

/**
 * Default currency settings template with EUR and USD
 */
export const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
  version: '2.0.0',
  currencyTypes: [
    {
      currencyName: 'EUR',
      currencies: DEFAULT_EUR_CURRENCIES
    },
    {
      currencyName: 'USD',
      currencies: DEFAULT_USD_CURRENCIES
    }
  ]
};

/**
 * Returns a deep copy of the default currency settings
 * to prevent accidental mutation of the original object
 * 
 * @returns A fresh copy of the default currency settings
 */
export function getDefaultCurrencySettings(): CurrencySettings {
  return JSON.parse(JSON.stringify(DEFAULT_CURRENCY_SETTINGS));
}

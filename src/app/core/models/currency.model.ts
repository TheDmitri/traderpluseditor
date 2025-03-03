/**
 * Currency models based on TraderPlusCurrency.c and TraderPlusCurrencyType.c
 */
export interface Currency {
  className: string;
  value: number;
}

export interface CurrencyType {
  currencyName: string;
  currencies: Currency[];
}

export interface CurrencySettings {
  version: string;
  currencyTypes: CurrencyType[];
}

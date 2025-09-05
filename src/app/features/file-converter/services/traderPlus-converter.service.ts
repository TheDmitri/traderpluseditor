import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import {
  GeneralSettings,
  License,
  TraderNpc,
  TraderObject,
  LoadoutItem,
} from '../../../core/models/general-settings.model';
import { CurrencySettings } from '../../../core/models/currency.model';
import {
  TraderPlusV1GeneralConfig,
  TraderPlusV1IDsConfig,
  TraderPlusV1PriceConfig,
} from '../models/traderplus-v1.model';

@Injectable({
  providedIn: 'root',
})
export class TraderPlusConverterService {
  // Store the config files
  private generalConfig: TraderPlusV1GeneralConfig | null = null;
  private idsConfig: TraderPlusV1IDsConfig | null = null;
  private priceConfig: TraderPlusV1PriceConfig | null = null;

  constructor() {}

  /**
   * Converts TraderPlus v1 configs to TraderX format
   * @param content The content of the TraderPlus v1 config file
   */
  convertToTraderX(
    content: string
  ): Observable<{ [key: string]: string }> {
    try {
      // Parse the file content and determine which config it is
      const configObject = JSON.parse(content);

      // Determine which type of config file we're dealing with
      if (this.isGeneralConfig(configObject)) {
        this.generalConfig = configObject;
      } else if (this.isIDsConfig(configObject)) {
        this.idsConfig = configObject;
      } else if (this.isPriceConfig(configObject)) {
        this.priceConfig = configObject;
      } else {
        return throwError(() => new Error('Unknown config file format'));
      }

      // Check if we have all the required configs to generate the v2 format
      if (this.generalConfig && this.idsConfig && this.priceConfig) {
        return this.generateTraderPlusV2Files();
      } else {
        // Return empty result until we have all required configs
        return of({});
      }
    } catch (error) {
      console.error('Error converting TraderPlus config:', error);
      return throwError(
        () => new Error(`Error parsing TraderPlus file: ${error}`)
      );
    }
  }

  /**
   * Determine if the config is a General Config
   */
  private isGeneralConfig(config: any): boolean {
    return config.Traders !== undefined && config.Currencies !== undefined;
  }

  /**
   * Determine if the config is an IDs Config
   */
  private isIDsConfig(config: any): boolean {
    return config.IDs !== undefined;
  }

  /**
   * Determine if the config is a Price Config
   */
  private isPriceConfig(config: any): boolean {
    return config.TraderCategories !== undefined;
  }

  /**
   * Generate TraderX files from the loaded configs
   */
  private generateTraderPlusV2Files(): Observable<{ [key: string]: string }> {
    try {
      if (!this.generalConfig || !this.idsConfig || !this.priceConfig) {
        return throwError(
          () => new Error('Not all required config files are loaded')
        );
      }

      // Extract currency type from the currency classnames
      const currencyType = this.extractCurrencyType();

      // Create the currency settings
      const currencySettings = this.createCurrencySettings(currencyType);

      // Create categories and products
      const { categoryFiles, productFiles, categoryMap } =
        this.createCategoriesAndProducts();

      // Create general settings (including traders)
      const generalSettings = this.createGeneralSettings(categoryMap);

      // Combine all files into a single object using correct TraderX structure
      const resultFiles = {
        'TraderXConfig/TraderXCurrencySettings.json': JSON.stringify(
          currencySettings,
          null,
          4
        ),
        'TraderXConfig/TraderXGeneralSettings.json': JSON.stringify(
          generalSettings,
          null,
          4
        ),
        ...categoryFiles,
        ...productFiles,
      };

      return of(resultFiles);
    } catch (error) {
      console.error('Error generating TraderX files:', error);
      return throwError(
        () => new Error(`Error generating TraderX files: ${error}`)
      );
    }
  }

  /**
   * Extract the currency type from currency classnames
   */
  private extractCurrencyType(): string {
    if (
      !this.generalConfig ||
      !this.generalConfig.Currencies ||
      this.generalConfig.Currencies.length === 0
    ) {
      return 'USD'; // Default if no currencies defined
    }

    // Check for common currency types in classnames
    const currencyClasses = this.generalConfig.Currencies.map((c) =>
      c.ClassName.toLowerCase()
    );

    // Look for known currency patterns
    if (currencyClasses.some((c) => c.includes('euro'))) {
      return 'EUR';
    } else if (currencyClasses.some((c) => c.includes('dollar'))) {
      return 'USD';
    } else if (currencyClasses.some((c) => c.includes('ruble'))) {
      return 'RUB';
    } else {
      // Extract from the first currency name if it follows TraderPlus_Money_X format
      const firstCurrency = this.generalConfig.Currencies[0].ClassName;
      const match = firstCurrency.match(/TraderPlus_Money_([A-Za-z]+)/);
      if (match && match[1]) {
        return match[1].toUpperCase();
      }
    }

    return 'EUR'; // Default to EUR if no pattern detected
  }

  /**
   * Extract the currency type from a currency className
   */
  private extractCurrencyTypeFromClassName(className: string): string {
    className = className.toLowerCase();

    if (className.includes('euro')) {
      return 'EUR';
    } else if (className.includes('dollar')) {
      return 'USD';
    } else if (className.includes('ruble')) {
      return 'RUB';
    } else {
      // Extract from the first currency name if it follows TraderPlus_Money_X format
      const match = className.match(/traderplus_money_([a-z]+)/i);
      if (match && match[1]) {
        return match[1].toUpperCase();
      }
    }

    return 'Unknown'; // Default to Unknown if no pattern detected
  }

  /**
   * Create currency settings for TraderX
   */
  private createCurrencySettings(
    defaultCurrencyType: string
  ): CurrencySettings {
    if (!this.generalConfig || !this.generalConfig.Currencies) {
      throw new Error('General config or currencies not found');
    }

    // Group currencies by their type
    const currencyGroups = new Map<
      string,
      { className: string; value: number }[]
    >();

    // Process each currency, potentially handling multiple classes in one entry
    this.generalConfig.Currencies.forEach((currency) => {
      // Check if className contains multiple currencies (comma-separated)
      const classNames = currency.ClassName.split(',');

      classNames.forEach((className) => {
        className = className.trim();
        if (!className) return;

        const type = this.extractCurrencyTypeFromClassName(className);

        if (!currencyGroups.has(type)) {
          currencyGroups.set(type, []);
        }

        currencyGroups.get(type)!.push({
          className: className,
          value: currency.Value,
        });
      });
    });

    // Create currency types array for result
    const currencyTypes: {
      currencyName: string;
      currencies: { className: string; value: number }[];
    }[] = [];

    // Add the default currency type first (if it exists in our groups)
    if (currencyGroups.has(defaultCurrencyType)) {
      currencyTypes.push({
        currencyName: defaultCurrencyType,
        currencies: currencyGroups.get(defaultCurrencyType)!,
      });

      // Remove it from the map to avoid duplication
      currencyGroups.delete(defaultCurrencyType);
    }

    // Add all other currency types
    currencyGroups.forEach((currencies, type) => {
      currencyTypes.push({
        currencyName: type,
        currencies: currencies,
      });
    });

    // If no currency types were created, add an empty one with the default type
    if (currencyTypes.length === 0) {
      currencyTypes.push({
        currencyName: defaultCurrencyType,
        currencies: [],
      });
    }

    return {
      version: '2.0.0',
      currencyTypes: currencyTypes,
    };
  }

  /**
   * Create categories and products for TraderX
   */
  private createCategoriesAndProducts(): {
    categoryFiles: { [key: string]: string };
    productFiles: { [key: string]: string };
    categoryMap: Map<number, string[]>;
  } {
    if (!this.priceConfig || !this.priceConfig.TraderCategories) {
      throw new Error('Price config or categories not found');
    }

    const categoryFiles: { [key: string]: string } = {};
    const productFiles: { [key: string]: string } = {};
    const categoryMap = new Map<number, string[]>();

    // Track counters for category names and product classNames to get proper IDs
    const categoryCounters = new Map<string, number>();
    const productCounters = new Map<string, number>();

    // Track existing categories to avoid duplicates
    const existingCategories = new Map<string, string>();

    // Map traders to their categories
    if (this.idsConfig && this.idsConfig.IDs) {
      this.idsConfig.IDs.forEach((idConfig) => {
        const traderId = idConfig.Id;
        const traderCategoryIds: string[] = [];

        // Process each category for this trader
        idConfig.Categories.forEach((categoryName) => {
          // Find the category in the price config
          const category = this.priceConfig!.TraderCategories.find(
            (c) => c.CategoryName === categoryName
          );

          if (!category) {
            console.warn(
              `Category "${categoryName}" not found in price config`
            );
            return;
          }

          // Check if this category name already exists
          let categoryId: string;
          if (existingCategories.has(categoryName)) {
            categoryId = existingCategories.get(categoryName)!;
          } else {
            // Create a sanitized version of the category name for the ID
            // Remove all special characters for the ID slug
            const categoryNameForId = categoryName
              .replace(/[^a-zA-Z0-9]/g, '')
              .toLowerCase();

            // Get current counter for this category name or initialize to 1
            const counter = categoryCounters.get(categoryNameForId) || 1;
            categoryId = `cat_${categoryNameForId}_${counter
              .toString()
              .padStart(3, '0')}`;

            // Increment counter
            categoryCounters.set(categoryNameForId, counter + 1);
            existingCategories.set(categoryName, categoryId);
          }

          // Add this category ID to the trader's list
          if (!traderCategoryIds.includes(categoryId)) {
            traderCategoryIds.push(categoryId);
          }

          // Process products for this category
          const productIds: string[] = [];

          category.Products.forEach((productEntry) => {
            // Parse product entry (format: className,coefficient,maxStock,tradeQuantity,buyPrice,sellPrice,deStockCoefficient)
            const parts = productEntry.split(',');
            if (parts.length < 1) return;

            const className = parts[0];
            let coefficient = parts.length > 1 ? parseFloat(parts[1]) : 1.0;
            let maxStock = parts.length > 2 ? parseInt(parts[2]) : -1;
            let oldTradeQuantity = parts.length > 3 ? parseFloat(parts[3]) : -1;
            let buyPrice = parts.length > 4 ? parseInt(parts[4]) : -1;
            let sellPrice = parts.length > 5 ? parseInt(parts[5]) : -1;
            let deStockCoefficient = parts.length > 6 ? parseFloat(parts[6]) : 0.0;

            // Format className for file naming - replace all non-alphanumeric chars with underscores
            const productNameSlug = className
              .toLowerCase()
              .replace(/[^a-z0-9_]/g, '_');

            // Get counter for this product className
            const counter = productCounters.get(productNameSlug) || 1;
            const productId = `prod_${productNameSlug}_${counter
              .toString()
              .padStart(3, '0')}`;

            // Increment counter
            productCounters.set(productNameSlug, counter + 1);

            // Add to product IDs for this category
            productIds.push(productId);

            // Convert tradeQuantity using DayZ logic
            const tradeQuantity = this.convertTradeQuantity(oldTradeQuantity);

            // Create TraderX product
            const traderPlusProduct = {
              className: className,
              coefficient: coefficient,
              maxStock: maxStock,
              tradeQuantity: tradeQuantity,
              buyPrice: buyPrice,
              sellPrice: sellPrice,
              stockSettings: 0,
              attachments: [],
              variants: [],
            };

            // Create the product file
            const productFileName = `TraderXConfig/Products/${productId}.json`;
            productFiles[productFileName] = JSON.stringify(
              traderPlusProduct,
              null,
              4
            );
          });

          // Create or update category file with product IDs
          if (
            !categoryFiles[
              `TraderXConfig/Categories/${categoryId}.json`
            ]
          ) {
            // Create new category
            const traderPlusCategory = {
              isVisible: 1,
              icon: '',
              categoryName: categoryName, // Keep original name with special characters
              licensesRequired: [],
              productIds: productIds,
            };

            categoryFiles[
              `TraderXConfig/Categories/${categoryId}.json`
            ] = JSON.stringify(traderPlusCategory, null, 4);
          } else {
            // Update existing category by adding new product IDs
            const existingCategory = JSON.parse(
              categoryFiles[
                `TraderXConfig/Categories/${categoryId}.json`
              ]
            );
            existingCategory.productIds = [
              ...new Set([...existingCategory.productIds, ...productIds]),
            ];

            categoryFiles[
              `TraderXConfig/Categories/${categoryId}.json`
            ] = JSON.stringify(existingCategory, null, 4);
          }
        });

        // Save the category IDs for this trader
        categoryMap.set(traderId, traderCategoryIds);
      });
    }

    return { categoryFiles, productFiles, categoryMap };
  }

  /**
   * Convert tradeQuantity using TraderX constants and logic
   */
  private convertTradeQuantity(oldTradeQuantity: number): number {
    // TraderX constants
    const SELL_NO_MATTER = 0x0;
    const SELL_EMPTY = 0x1;
    const SELL_FULL = 0x2;
    const SELL_COEFFICIENT = 0x3;
    const SELL_STATIC = 0x4;
    const BUY_EMPTY = 0x0;
    const BUY_FULL = 0x2;
    const BUY_COEFFICIENT = 0x3;
    const BUY_STATIC = 0x4;

    let buyMode: number;
    let sellMode: number;
    let buyQuantity: number;
    let sellQuantity: number;

    if (oldTradeQuantity === 0) {
      // 0 = buy empty and sell empty
      buyMode = BUY_EMPTY;
      sellMode = SELL_EMPTY;
      buyQuantity = 0;
      sellQuantity = 0;
    } else if (oldTradeQuantity === -1 || oldTradeQuantity === 1) {
      // -1 or 1 = max quantity for both
      buyMode = BUY_FULL;
      sellMode = SELL_FULL;
      buyQuantity = 0;
      sellQuantity = 0;
    } else if (oldTradeQuantity < 1.0 && oldTradeQuantity > 0.0) {
      // coefficient = coefficient for both
      buyMode = BUY_COEFFICIENT;
      sellMode = SELL_COEFFICIENT;
      buyQuantity = Math.floor(oldTradeQuantity * 100);
      sellQuantity = Math.floor(oldTradeQuantity * 100);
    } else {
      // static values > 1 = static quantity for both
      buyMode = BUY_STATIC;
      sellMode = SELL_STATIC;
      buyQuantity = Math.floor(oldTradeQuantity);
      sellQuantity = Math.floor(oldTradeQuantity);
    }

    return this.createTradeQuantity(buyMode, sellMode, buyQuantity, sellQuantity);
  }

  /**
   * Create trade quantity using DayZ bit manipulation logic
   */
  private createTradeQuantity(buyMode: number, sellMode: number, buyQuantity: number, sellQuantity: number): number {
    return sellMode | (buyMode << 3) | ((sellQuantity << 6) & 0x1FFF) | (buyQuantity << 19);
  }

  /**
   * Create the TraderX general settings
   */
  private createGeneralSettings(
    categoryMap: Map<number, string[]>
  ): GeneralSettings {
    if (!this.generalConfig) {
      throw new Error('General config not found');
    }

    const currencyType = this.extractCurrencyType();

    // Convert licenses
    const licenses: License[] = (this.generalConfig.Licences || []).map(
      (licence, index) => ({
        licenseId: `licence_${index.toString().padStart(3, '0')}`,
        licenseName: licence,
        description: `License for ${licence}`,
      })
    );

    // Convert traders
    const traders: TraderNpc[] = this.generalConfig.Traders.map((trader) => {
      // Find categories for this trader from IDs config
      const categoriesId = categoryMap.get(trader.Id) || [];

      // Find trader's ID config to get accepted currencies
      const traderIdConfig = this.idsConfig?.IDs.find(
        (id) => id.Id === trader.Id
      );
      const currenciesAccepted: string[] = [];

      // If we have ID config with currencies, determine which currency types to accept
      if (traderIdConfig && traderIdConfig.CurrenciesAccepted.length > 0) {
        // Track which currency types this trader accepts
        const acceptedTypes = new Set<string>();

        traderIdConfig.CurrenciesAccepted.forEach((currencyClassName) => {
          const type = this.extractCurrencyTypeFromClassName(currencyClassName);
          acceptedTypes.add(type);
        });

        // Add all found types to the accepted currencies array
        acceptedTypes.forEach((type) => currenciesAccepted.push(type));
      } else {
        // Default to the main currency type if no specific currencies defined
        currenciesAccepted.push(currencyType);
      }

      // Create trader object
      const traderNpc: TraderNpc = {
        npcId: trader.Id,
        className: trader.Name,
        givenName: trader.GivenName,
        role: trader.Role,
        position: trader.Position,
        orientation: trader.Orientation,
        categoriesId: categoriesId,
        currenciesAccepted: currenciesAccepted,
        loadouts: [],
      };

      // Convert clothes to loadout if they exist
      if (trader.Clothes && trader.Clothes.length > 0) {
        const loadoutItems: LoadoutItem[] = trader.Clothes.map((className) => ({
          className: className,
          quantity: -1,
          slotName: '', // Slot name will be determined by the game
          attachments: [],
        }));

        traderNpc.loadouts = loadoutItems;
      }

      return traderNpc;
    });

    // Convert trader objects
    const traderObjects: TraderObject[] = (
      this.generalConfig.TraderObjects || []
    ).map((obj) => ({
      className: obj.ClassName || '',
      position: obj.Position || [0, 0, 0],
      orientation: obj.Orientation || [0, 0, 0],
    }));

    // Create general settings
    const generalSettings: GeneralSettings = {
      version: '2.5',
      serverID: 'CONVERTED_FROM_V1',
      licenses: licenses,
      acceptedStates: {
        acceptWorn: this.generalConfig.AcceptedStates.AcceptWorn,
        acceptDamaged: this.generalConfig.AcceptedStates.AcceptDamaged,
        acceptBadlyDamaged:
          this.generalConfig.AcceptedStates.AcceptBadlyDamaged,
        coefficientWorn:
          this.generalConfig.AcceptedStates.CoefficientWorn || 0.7,
        coefficientDamaged:
          this.generalConfig.AcceptedStates.CoefficientDamaged || 0.5,
        coefficientBadlyDamaged:
          this.generalConfig.AcceptedStates.CoefficientBadlyDamaged || 0.3,
      },
      traders: traders,
      traderObjects: traderObjects,
    };

    return generalSettings;
  }
}

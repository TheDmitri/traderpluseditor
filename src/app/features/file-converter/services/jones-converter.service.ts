import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { JonesConfig, JonesTrader, JonesCategory, JonesProduct } from '../models/jones.model';
import { CurrencySettings } from '../../../core/models/currency.model';
import { GeneralSettings, TraderNpc } from '../../../core/models/general-settings.model';

@Injectable({
  providedIn: 'root'
})
export class JonesConverterService {

  constructor() { }

  /**
   * Converts Jones trader config to TraderPlus v2 format
   * @param content The content of the Jones trader config file
   */
  convertToTraderPlusV2(content: string): Observable<{ [key: string]: string }> {
    try {
      // Parse the Jones config
      const jonesConfig = this.parseJonesConfig(content);
      
      // Convert currencies
      const currencySettings = this.createCurrencySettings(jonesConfig);
      
      // Convert categories and products
      const { categoryFiles, productFiles, categoryMap } = this.createCategoriesAndProducts(jonesConfig);
      
      // Convert general settings (including traders)
      const generalSettings = this.createGeneralSettings(jonesConfig, categoryMap);

      // Combine all files into a single object
      const resultFiles = {
        'TraderPlusConfig/TraderPlusCurrencySettings.json': JSON.stringify(currencySettings, null, 4),
        'TraderPlusConfig/TraderPlusGeneralSettings.json': JSON.stringify(generalSettings, null, 4),
        ...categoryFiles,
        ...productFiles
      };

      return of(resultFiles);
    } catch (error) {
      console.error('Error converting Jones config:', error);
      throw error;
    }
  }

  /**
   * Parses a Jones trader config file content
   */
  private parseJonesConfig(content: string): JonesConfig {
    // Remove comments and empty lines
    const lines = content.split('\n')
      .map(line => {
        // Remove comments that start with //
        const commentStart = line.indexOf('//');
        return commentStart >= 0 ? line.substring(0, commentStart).trim() : line.trim();
      })
      .filter(line => line.length > 0);
    
    const config: JonesConfig = {
      currencyName: '',
      currencies: [],
      traders: []
    };

    let currentTrader: JonesTrader | null = null;
    let currentCategory: JonesCategory | null = null;
    let parsingCurrency = false;

    for (const line of lines) {
      // Parse currency name
      if (line.startsWith('<CurrencyName>')) {
        config.currencyName = line.replace('<CurrencyName>', '').trim();
        parsingCurrency = true;
        continue;
      }

      // Parse currency
      if (parsingCurrency && line.startsWith('<Currency>')) {
        const currencyInfo = line.replace('<Currency>', '').trim().split(',');
        if (currencyInfo.length >= 2) {
          config.currencies.push({
            className: currencyInfo[0].trim(),
            value: parseInt(currencyInfo[1].trim(), 10)
          });
        }
        continue;
      }

      // Parse trader
      if (line.startsWith('<Trader>')) {
        parsingCurrency = false;
        currentTrader = {
          name: line.replace('<Trader>', '').trim(),
          categories: []
        };
        config.traders.push(currentTrader);
        continue;
      }

      // Parse category
      if (currentTrader && line.startsWith('<Category>')) {
        currentCategory = {
          name: line.replace('<Category>', '').trim(),
          products: []
        };
        currentTrader.categories.push(currentCategory);
        continue;
      }

      // Parse product
      if (currentCategory && !line.startsWith('<') && line.includes(',')) {
        const productParts = line.split(',').map(p => p.trim());
        if (productParts.length >= 4) {
          const product: JonesProduct = {
            className: productParts[0],
            quantity: productParts[1],
            buyPrice: parseInt(productParts[2], 10) || 0,
            sellPrice: parseInt(productParts[3], 10) || 0
          };
          currentCategory.products.push(product);
        }
      }

      // Check for file end or other tags that close sections
      if (line.startsWith('<FileEnd>') || line.startsWith('<OpenFile>')) {
        break;
      }
    }

    return config;
  }

  /**
   * Creates the TraderPlus currency settings
   */
  private createCurrencySettings(jonesConfig: JonesConfig): CurrencySettings {
    return {
      version: '2.0.0',
      currencyTypes: [{
        currencyName: jonesConfig.currencyName,
        currencies: jonesConfig.currencies.map(currency => ({
          className: currency.className,
          value: currency.value
        }))
      }]
    };
  }

  /**
   * Creates categories and products for TraderPlus v2
   * Follows the exact structure of TraderPlus v2 files
   */
  private createCategoriesAndProducts(jonesConfig: JonesConfig): { 
    categoryFiles: { [key: string]: string }, 
    productFiles: { [key: string]: string },
    categoryMap: Map<string, string[]>
  } {
    const categoryFiles: { [key: string]: string } = {};
    const productFiles: { [key: string]: string } = {};
    const categoryMap = new Map<string, string[]>(); // Maps trader name to category IDs
    
    // Track counters for category names and product classNames to get proper IDs
    const categoryCounters = new Map<string, number>(); // Maps category name to counter
    const productCounters = new Map<string, number>(); // Maps product className to counter
    
    // Track existing categories to avoid duplicates
    const existingCategories = new Map<string, string>(); // Maps category name to ID
    
    jonesConfig.traders.forEach(trader => {
      const traderCategoryIds: string[] = [];
      
      trader.categories.forEach(category => {
        // Check if this category name already exists
        let categoryId: string;
        if (existingCategories.has(category.name)) {
          categoryId = existingCategories.get(category.name)!;
        } else {
          // Create new category ID with proper counter
          const categoryNameSlug = category.name.toLowerCase().replace(/\s+/g, '_');
          
          // Get current counter for this category name or initialize to 1
          const counter = categoryCounters.get(categoryNameSlug) || 1;
          categoryId = `cat_${categoryNameSlug}_${counter.toString().padStart(3, '0')}`;
          
          // Increment counter for this category name
          categoryCounters.set(categoryNameSlug, counter + 1);
          existingCategories.set(category.name, categoryId);
        }
        
        // Add this category ID to the trader's list
        if (!traderCategoryIds.includes(categoryId)) {
          traderCategoryIds.push(categoryId);
        }
        
        // Process products for this category
        const productIds: string[] = [];
        
        category.products.forEach(product => {
          // Format className for file naming (lowercase, replace non-alphanumeric with underscore)
          const productNameSlug = product.className.toLowerCase().replace(/[^a-z0-9_]/g, '_');
          
          // Get current counter for this product className or initialize to 1
          const counter = productCounters.get(productNameSlug) || 1;
          const productId = `prod_${productNameSlug}_${counter.toString().padStart(3, '0')}`;
          
          // Increment counter for this product className
          productCounters.set(productNameSlug, counter + 1);
          
          // Add to product IDs for this category
          productIds.push(productId);
          
          // Convert quantity string to appropriate values based on Jones format
          let maxStock = 100;  // Default values
          const tradeQuantity = 1;
          
          // Handle special quantity values
          if (product.quantity === '*') {
            maxStock = -1;  // -1 means unlimited stock in TraderPlus
          }

          // Handle buyPrice and sellPrice
          let buyPrice = product.buyPrice;
          let sellPrice = product.sellPrice;
          
          // In Jones, -1 means "cannot be bought/sold"
          // In TraderPlus, we use different values to represent these states
          if (buyPrice === -1) {
            buyPrice = -1; // Cannot be bought
          }
          
          if (sellPrice === -1) {
            sellPrice = -1; // Cannot be sold
          }

          // Create TraderPlus product
          const traderPlusProduct = {
            className: product.className,
            coefficient: 1.0,
            maxStock: maxStock,
            tradeQuantity: tradeQuantity,
            buyPrice: buyPrice,
            sellPrice: sellPrice,
            stockSettings: 0,
            attachments: [],
            variants: []
          };
          
          // Create the product file
          const productFileName = `TraderPlusConfig/TraderPlusData/Products/${productId}.json`;
          productFiles[productFileName] = JSON.stringify(traderPlusProduct, null, 4);
        });
        
        // Create or update category file with product IDs
        if (!categoryFiles[`TraderPlusConfig/TraderPlusData/Categories/${categoryId}.json`]) {
          // Create new category
          const traderPlusCategory = {
            isVisible: 1,
            icon: "",
            categoryName: category.name,
            licensesRequired: [],
            productIds: productIds
          };
          
          categoryFiles[`TraderPlusConfig/TraderPlusData/Categories/${categoryId}.json`] = 
            JSON.stringify(traderPlusCategory, null, 4);
        } else {
          // Update existing category by adding new product IDs
          const existingCategory = JSON.parse(
            categoryFiles[`TraderPlusConfig/TraderPlusData/Categories/${categoryId}.json`]
          );
          existingCategory.productIds = [...existingCategory.productIds, ...productIds];
          
          categoryFiles[`TraderPlusConfig/TraderPlusData/Categories/${categoryId}.json`] = 
            JSON.stringify(existingCategory, null, 4);
        }
      });
      
      // Save the category IDs for this trader
      categoryMap.set(trader.name, traderCategoryIds);
    });
    
    return { categoryFiles, productFiles, categoryMap };
  }

  /**
   * Creates the TraderPlus general settings including traders
   */
  private createGeneralSettings(jonesConfig: JonesConfig, categoryMap: Map<string, string[]>): GeneralSettings {
    // Create default general settings
    const generalSettings: GeneralSettings = {
      version: '2.5',
      serverID: 'CONVERTED_BY_TRADERPLUS_EDITOR',
      licenses: [],
      acceptedStates: {
        acceptWorn: 1,
        acceptDamaged: 1,
        acceptBadlyDamaged: 1,
        coefficientWorn: 0.7,
        coefficientDamaged: 0.5,
        coefficientBadlyDamaged: 0.3
      },
      traders: [],
      traderObjects: []
    };
    
    // Create traders from Jones config
    jonesConfig.traders.forEach((trader, index) => {
      const traderNpc: TraderNpc = {
        npcId: index,
        className: 'SurvivorM_Boris',  // Default trader model
        givenName: trader.name,
        role: `Trader ${index}`,
        position: [0, 0, 0],  // Default position
        orientation: [0, 0, 0],  // Default orientation
        categoriesId: categoryMap.get(trader.name) || [],
        currenciesAccepted: [
          `${jonesConfig.currencyName}`
        ],
        loadouts: []  // Default empty loadouts
      };
      
      generalSettings.traders.push(traderNpc);
    });
    
    return generalSettings;
  }
}

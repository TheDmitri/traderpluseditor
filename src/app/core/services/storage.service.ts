import { Injectable, signal } from '@angular/core';
import { Category, Product, CurrencySettings, GeneralSettings } from '../models';

/**
 * Storage keys for LocalStorage
 */
export enum StorageKey {
  CATEGORIES = 'traderplus_categories',
  PRODUCTS = 'traderplus_products',
  CURRENCY_SETTINGS = 'traderplus_currency_settings',
  GENERAL_SETTINGS = 'traderplus_general_settings',
  APP_VERSION = 'traderplus_app_version'
}

/**
 * Service for managing data in LocalStorage
 */
@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly APP_VERSION = '1.0.0';
  
  // Signals for reactive state management
  categories = signal<Category[]>([]);
  products = signal<Product[]>([]);
  currencySettings = signal<CurrencySettings | null>(null);
  generalSettings = signal<GeneralSettings | null>(null);
  
  constructor() {
    this.initializeStorage();
  }
  
  /**
   * Initialize storage and load data if exists
   */
  private initializeStorage(): void {
    // Check if app version exists
    const storedVersion = localStorage.getItem(StorageKey.APP_VERSION);
    
    if (!storedVersion) {
      // First time initialization
      localStorage.setItem(StorageKey.APP_VERSION, this.APP_VERSION);
      this.saveCategories([]);
      this.saveProducts([]);
      this.saveCurrencySettings(null);
      this.saveGeneralSettings(null);
    } else {
      // Load existing data
      this.loadAllData();
    }
  }
  
  /**
   * Load all data from LocalStorage
   */
  private loadAllData(): void {
    this.loadCategories();
    this.loadProducts();
    this.loadCurrencySettings();
    this.loadGeneralSettings();
  }
  
  /**
   * Load categories from LocalStorage
   */
  private loadCategories(): void {
    const data = localStorage.getItem(StorageKey.CATEGORIES);
    if (data) {
      try {
        this.categories.set(JSON.parse(data));
      } catch (error) {
        console.error('Error parsing categories from LocalStorage:', error);
        this.categories.set([]);
      }
    }
  }
  
  /**
   * Load products from LocalStorage
   */
  private loadProducts(): void {
    const data = localStorage.getItem(StorageKey.PRODUCTS);
    if (data) {
      try {
        this.products.set(JSON.parse(data));
      } catch (error) {
        console.error('Error parsing products from LocalStorage:', error);
        this.products.set([]);
      }
    }
  }
  
  /**
   * Load currency settings from LocalStorage
   */
  private loadCurrencySettings(): void {
    const data = localStorage.getItem(StorageKey.CURRENCY_SETTINGS);
    if (data) {
      try {
        this.currencySettings.set(JSON.parse(data));
      } catch (error) {
        console.error('Error parsing currency settings from LocalStorage:', error);
        this.currencySettings.set(null);
      }
    }
  }
  
  /**
   * Load general settings from LocalStorage
   */
  private loadGeneralSettings(): void {
    const data = localStorage.getItem(StorageKey.GENERAL_SETTINGS);
    if (data) {
      try {
        this.generalSettings.set(JSON.parse(data));
      } catch (error) {
        console.error('Error parsing general settings from LocalStorage:', error);
        this.generalSettings.set(null);
      }
    }
  }
  
  /**
   * Save categories to LocalStorage
   */
  saveCategories(categories: Category[]): void {
    localStorage.setItem(StorageKey.CATEGORIES, JSON.stringify(categories));
    this.categories.set(categories);
  }
  
  /**
   * Save products to LocalStorage
   */
  saveProducts(products: Product[]): void {
    localStorage.setItem(StorageKey.PRODUCTS, JSON.stringify(products));
    this.products.set(products);
  }
  
  /**
   * Save currency settings to LocalStorage
   */
  saveCurrencySettings(settings: CurrencySettings | null): void {
    if (settings) {
      localStorage.setItem(StorageKey.CURRENCY_SETTINGS, JSON.stringify(settings));
    } else {
      localStorage.removeItem(StorageKey.CURRENCY_SETTINGS);
    }
    this.currencySettings.set(settings);
  }
  
  /**
   * Save general settings to LocalStorage
   */
  saveGeneralSettings(settings: GeneralSettings | null): void {
    if (settings) {
      localStorage.setItem(StorageKey.GENERAL_SETTINGS, JSON.stringify(settings));
    } else {
      localStorage.removeItem(StorageKey.GENERAL_SETTINGS);
    }
    this.generalSettings.set(settings);
  }
  
  /**
   * Clear all data from LocalStorage
   */
  clearAllData(): void {
    localStorage.removeItem(StorageKey.CATEGORIES);
    localStorage.removeItem(StorageKey.PRODUCTS);
    localStorage.removeItem(StorageKey.CURRENCY_SETTINGS);
    localStorage.removeItem(StorageKey.GENERAL_SETTINGS);
    
    this.categories.set([]);
    this.products.set([]);
    this.currencySettings.set(null);
    this.generalSettings.set(null);
  }

  /**
   * Delete currency settings from storage
   */
  deleteCurrencySettings(): void {
    localStorage.removeItem('traderplus_currency_settings');
  }

  /**
   * Delete general settings from storage
   */
  deleteGeneralSettings(): void {
    localStorage.removeItem('traderplus_general_settings');
  }
}

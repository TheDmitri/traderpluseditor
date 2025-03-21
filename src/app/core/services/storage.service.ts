import { Injectable, signal } from '@angular/core';
import {
  Category,
  CurrencySettings,
  GeneralSettings,
  Product,
} from '../models';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Storage keys for LocalStorage
 */
export enum StorageKey {
  CATEGORIES = 'traderplus_categories',
  PRODUCTS = 'traderplus_products',
  CURRENCY_SETTINGS = 'traderplus_currency_settings',
  GENERAL_SETTINGS = 'traderplus_general_settings',
  APP_VERSION = 'traderplus_app_version',
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export interface DataCache<T> {
  data: T[];
  lastUpdated: number;
  isComplete: boolean;
}

/**
 * Service for managing data in LocalStorage
 */
@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly APP_VERSION = environment.version;
  private readonly CACHE_LIFETIME = 300000; // 5 minutes in milliseconds

  // Signals for reactive state management (important for backward compatibility)
  categories = signal<Category[]>([]);
  products = signal<Product[]>([]);
  currencySettings = signal<CurrencySettings | null>(null);
  generalSettings = signal<GeneralSettings | null>(null);

  // BehaviorSubjects for paginated data
  private _categoriesSubject = new BehaviorSubject<PaginatedResult<Category>>({
    items: [],
    total: 0,
    pageIndex: 0,
    pageSize: 0,
  });
  private _productsSubject = new BehaviorSubject<PaginatedResult<Product>>({
    items: [],
    total: 0,
    pageIndex: 0,
    pageSize: 0,
  });

  // Cache objects
  private _categoriesCache: DataCache<Category> = {
    data: [],
    lastUpdated: 0,
    isComplete: false,
  };
  private _productsCache: DataCache<Product> = {
    data: [],
    lastUpdated: 0,
    isComplete: false,
  };
  private _currencySettingsCache: {
    data: CurrencySettings | null;
    lastUpdated: number;
  } = { data: null, lastUpdated: 0 };
  private _generalSettingsCache: {
    data: GeneralSettings | null;
    lastUpdated: number;
  } = { data: null, lastUpdated: 0 };

  // Public observables
  public paginatedCategories$ = this._categoriesSubject.asObservable();
  public paginatedProducts$ = this._productsSubject.asObservable();

  // Flag for first initialization
  private _initialized = false;

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
      this._initialized = true;
    } else {
      // For initial initialization, load all data immediately
      // This ensures that signals and caches are consistent with local data
      this.loadAllData();
      this._initialized = true;

      // Prepare subjects with current data
      this.updateProductsCount();
      this.updateCategoriesCount();
    }
  }

  /**
   * Get paginated products
   */
  getPaginatedProducts(
    pageIndex: number,
    pageSize: number,
    filter?: string
  ): Observable<PaginatedResult<Product>> {
    this.loadPaginatedProducts(pageIndex, pageSize, filter);
    return this._productsSubject.asObservable();
  }

  /**
   * Get paginated categories
   */
  getPaginatedCategories(
    pageIndex: number,
    pageSize: number,
    filter?: string
  ): Observable<PaginatedResult<Category>> {
    this.loadPaginatedCategories(pageIndex, pageSize, filter);
    return this._categoriesSubject.asObservable();
  }

  /**
   * Get product by ID
   */
  getProductById(productId: string): Product | null {
    // Check cache first
    const cachedProduct = this._productsCache.data.find(
      (p) => p.productId === productId
    );
    if (cachedProduct) {
      return cachedProduct;
    }

    // If not in cache, check localStorage
    const allProducts = this.getAllProductsFromStorage();
    const product = allProducts.find((p) => p.productId === productId);

    // Update cache if found
    if (
      product &&
      !this._productsCache.data.some((p) => p.productId === productId)
    ) {
      this._productsCache.data.push(product);
    }

    return product || null;
  }

  /**
   * Get category for product
   */
  getCategoriesForProduct(productId: string): string[] {
    // Initialize data if necessary
    this.ensureDataLoaded();

    // Get from cache or load from storage
    const allCategories = this.isCategoryCacheValid()
      ? this._categoriesCache.data
      : this.getAllCategoriesFromStorage();

    return allCategories
      .filter((category) => category.productIds.includes(productId))
      .map((category) => category.categoryName);
  }

  /**
   * Ensures that data is loaded before accessing it
   */
  private ensureDataLoaded(): void {
    if (!this._initialized) {
      this.loadAllData();
      this._initialized = true;
    }

    if (!this._productsCache.isComplete) {
      this.loadProducts();
    }

    if (!this._categoriesCache.isComplete) {
      this.loadCategories();
    }
  }

  /**
   * Load paginated products from storage
   */
  private loadPaginatedProducts(
    pageIndex: number,
    pageSize: number,
    filter?: string
  ): void {
    const startTime = performance.now();

    // Ensure data is loaded
    this.ensureDataLoaded();

    // Get total count if not already cached
    let allProducts: Product[];
    let total: number;

    if (this.isProductCacheValid() && !filter) {
      // Use cache for efficiency if no filter
      allProducts = this._productsCache.data;
      total = this._productsCache.isComplete
        ? allProducts.length
        : this.getProductsCountFromStorage();
    } else {
      // Load all for filtering or if cache invalid
      allProducts = this.getAllProductsFromStorage();
      total = allProducts.length;

      // Apply filter if provided
      if (filter) {
        const filterLower = filter.toLowerCase();
        allProducts = allProducts.filter(
          (product) =>
            product.className.toLowerCase().includes(filterLower) ||
            product.productId.toLowerCase().includes(filterLower)
        );
        total = allProducts.length;
      } else {
        // Update cache if we loaded all and no filter
        this._productsCache = {
          data: allProducts,
          lastUpdated: Date.now(),
          isComplete: true,
        };

        // Update signal for backward compatibility
        this.products.set(allProducts);
      }
    }

    // Calculate pagination
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    const pageItems = allProducts.slice(start, end);

    // Update subject
    this._productsSubject.next({
      items: pageItems,
      total: total,
      pageIndex: pageIndex,
      pageSize: pageSize,
    });

    console.log(
      `Products pagination loaded in ${performance.now() - startTime}ms`
    );
  }

  /**
   * Load paginated categories from storage
   */
  private loadPaginatedCategories(
    pageIndex: number,
    pageSize: number,
    filter?: string
  ): void {
    const startTime = performance.now();

    // Ensure data is loaded
    this.ensureDataLoaded();

    // Get total count if not already cached
    let allCategories: Category[];
    let total: number;

    if (this.isCategoryCacheValid() && !filter) {
      // Use cache for efficiency if no filter
      allCategories = this._categoriesCache.data;
      total = this._categoriesCache.isComplete
        ? allCategories.length
        : this.getCategoriesCountFromStorage();
    } else {
      // Load all for filtering or if cache invalid
      allCategories = this.getAllCategoriesFromStorage();
      total = allCategories.length;

      // Apply filter if provided
      if (filter) {
        const filterLower = filter.toLowerCase();
        allCategories = allCategories.filter((category) =>
          category.categoryName.toLowerCase().includes(filterLower)
        );
        total = allCategories.length;
      } else {
        // Update cache if we loaded all and no filter
        this._categoriesCache = {
          data: allCategories,
          lastUpdated: Date.now(),
          isComplete: true,
        };

        // Update signal for backward compatibility
        this.categories.set(allCategories);
      }
    }

    // Calculate pagination
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    const pageItems = allCategories.slice(start, end);

    // Update subject
    this._categoriesSubject.next({
      items: pageItems,
      total: total,
      pageIndex: pageIndex,
      pageSize: pageSize,
    });

    console.log(
      `Categories pagination loaded in ${performance.now() - startTime}ms`
    );
  }

  /**
   * Check if product cache is valid
   */
  private isProductCacheValid(): boolean {
    return (
      this._productsCache.data.length > 0 &&
      Date.now() - this._productsCache.lastUpdated < this.CACHE_LIFETIME
    );
  }

  /**
   * Check if category cache is valid
   */
  private isCategoryCacheValid(): boolean {
    return (
      this._categoriesCache.data.length > 0 &&
      Date.now() - this._categoriesCache.lastUpdated < this.CACHE_LIFETIME
    );
  }

  /**
   * Get products count from storage
   */
  private getProductsCountFromStorage(): number {
    try {
      const data = localStorage.getItem(StorageKey.PRODUCTS);
      if (!data) return 0;

      // Use a faster method to get just the array length without full parsing
      // This is a hack but works for JSON arrays
      const match = data.match(/^\[(.*)\]$/);
      if (!match) return 0;

      // Empty array
      if (!match[1].trim()) return 0;

      // Count objects by counting opening braces
      return (match[1].match(/{/g) || []).length;
    } catch (error) {
      console.error('Error counting products:', error);
      return 0;
    }
  }

  /**
   * Get categories count from storage
   */
  private getCategoriesCountFromStorage(): number {
    try {
      const data = localStorage.getItem(StorageKey.CATEGORIES);
      if (!data) return 0;

      // Same approach as products count
      const match = data.match(/^\[(.*)\]$/);
      if (!match) return 0;

      if (!match[1].trim()) return 0;

      return (match[1].match(/{/g) || []).length;
    } catch (error) {
      console.error('Error counting categories:', error);
      return 0;
    }
  }

  /**
   * Update products count
   */
  private updateProductsCount(): void {
    const count = this.getProductsCountFromStorage();
    this._productsSubject.next({
      items: [],
      total: count,
      pageIndex: 0,
      pageSize: 0,
    });
  }

  /**
   * Update categories count
   */
  private updateCategoriesCount(): void {
    const count = this.getCategoriesCountFromStorage();
    this._categoriesSubject.next({
      items: [],
      total: count,
      pageIndex: 0,
      pageSize: 0,
    });
  }

  /**
   * Get all products from storage
   */
  private getAllProductsFromStorage(): Product[] {
    const data = localStorage.getItem(StorageKey.PRODUCTS);
    if (!data) return [];

    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Error parsing products from localStorage:', error);
      return [];
    }
  }

  /**
   * Get all categories from storage
   */
  private getAllCategoriesFromStorage(): Category[] {
    const data = localStorage.getItem(StorageKey.CATEGORIES);
    if (!data) return [];

    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Error parsing categories from localStorage:', error);
      return [];
    }
  }

  /**
   * Loads all categories and updates the signal and cache
   */
  private loadCategories(): void {
    const allCategories = this.getAllCategoriesFromStorage();
    this.categories.set(allCategories);
    this._categoriesCache = {
      data: allCategories,
      lastUpdated: Date.now(),
      isComplete: true,
    };
  }

  /**
   * Loads all products and updates the signal and cache
   */
  private loadProducts(): void {
    const allProducts = this.getAllProductsFromStorage();
    this.products.set(allProducts);
    this._productsCache = {
      data: allProducts,
      lastUpdated: Date.now(),
      isComplete: true,
    };
  }

  /**
   * Loads currency settings and updates the signal and cache
   */
  private loadCurrencySettings(): void {
    const data = localStorage.getItem(StorageKey.CURRENCY_SETTINGS);
    if (data) {
      try {
        const settings = JSON.parse(data);
        this.currencySettings.set(settings);
        this._currencySettingsCache = {
          data: settings,
          lastUpdated: Date.now(),
        };
      } catch (error) {
        console.error(
          'Error parsing currency settings from localStorage:',
          error
        );
        this.currencySettings.set(null);
      }
    } else {
      this.currencySettings.set(null);
      this._currencySettingsCache = { data: null, lastUpdated: Date.now() };
    }
  }

  /**
   * Loads general settings and updates the signal and cache
   */
  private loadGeneralSettings(): void {
    const data = localStorage.getItem(StorageKey.GENERAL_SETTINGS);
    if (data) {
      try {
        const settings = JSON.parse(data);
        this.generalSettings.set(settings);
        this._generalSettingsCache = {
          data: settings,
          lastUpdated: Date.now(),
        };
      } catch (error) {
        console.error(
          'Error parsing general settings from localStorage:',
          error
        );
        this.generalSettings.set(null);
      }
    } else {
      this.generalSettings.set(null);
      this._generalSettingsCache = { data: null, lastUpdated: Date.now() };
    }
  }

  /**
   * Loads all data from LocalStorage
   * Important for initial backward compatibility
   */
  private loadAllData(): void {
    this.loadCategories();
    this.loadProducts();
    this.loadCurrencySettings();
    this.loadGeneralSettings();
  }

  /**
   * Save categories to localStorage
   */
  saveCategories(categories: Category[]): void {
    localStorage.setItem(StorageKey.CATEGORIES, JSON.stringify(categories));
    this.categories.set(categories);
    this._categoriesCache = {
      data: categories,
      lastUpdated: Date.now(),
      isComplete: true,
    };
    this._categoriesSubject.next({
      items: categories.slice(0, this._categoriesSubject.value.pageSize || 10),
      total: categories.length,
      pageIndex: 0,
      pageSize: this._categoriesSubject.value.pageSize || 10,
    });
  }

  /**
   * Save a single category, efficiently updating storage
   */
  saveSingleCategory(category: Category): void {
    // Ensure data is loaded
    this.ensureDataLoaded();

    const allCategories = this.getAllCategoriesFromStorage();
    const index = allCategories.findIndex(
      (c) => c.categoryId === category.categoryId
    );

    if (index >= 0) {
      allCategories[index] = category;
    } else {
      allCategories.push(category);
    }

    localStorage.setItem(StorageKey.CATEGORIES, JSON.stringify(allCategories));

    // Update cache if valid
    if (this.isCategoryCacheValid()) {
      const cacheIndex = this._categoriesCache.data.findIndex(
        (c) => c.categoryId === category.categoryId
      );
      if (cacheIndex >= 0) {
        this._categoriesCache.data[cacheIndex] = category;
      } else {
        this._categoriesCache.data.push(category);
      }
    }

    // For backward compatibility
    this.categories.set(allCategories);

    // Refresh pagination if needed
    if (this._categoriesSubject.value.pageSize > 0) {
      this.loadPaginatedCategories(
        this._categoriesSubject.value.pageIndex,
        this._categoriesSubject.value.pageSize
      );
    }
  }

  /**
   * Save products to localStorage
   */
  saveProducts(products: Product[]): void {
    localStorage.setItem(StorageKey.PRODUCTS, JSON.stringify(products));
    this.products.set(products);
    this._productsCache = {
      data: products,
      lastUpdated: Date.now(),
      isComplete: true,
    };
    this._productsSubject.next({
      items: products.slice(0, this._productsSubject.value.pageSize || 10),
      total: products.length,
      pageIndex: 0,
      pageSize: this._productsSubject.value.pageSize || 10,
    });
  }

  /**
   * Save a single product, efficiently updating storage
   */
  saveSingleProduct(product: Product): void {
    // Ensure data is loaded
    this.ensureDataLoaded();

    const allProducts = this.getAllProductsFromStorage();
    const index = allProducts.findIndex(
      (p) => p.productId === product.productId
    );

    if (index >= 0) {
      allProducts[index] = product;
    } else {
      allProducts.push(product);
    }

    localStorage.setItem(StorageKey.PRODUCTS, JSON.stringify(allProducts));

    // Update cache if valid
    if (this.isProductCacheValid()) {
      const cacheIndex = this._productsCache.data.findIndex(
        (p) => p.productId === product.productId
      );
      if (cacheIndex >= 0) {
        this._productsCache.data[cacheIndex] = product;
      } else {
        this._productsCache.data.push(product);
      }
    }

    // For backward compatibility
    this.products.set(allProducts);

    // Refresh pagination if needed
    if (this._productsSubject.value.pageSize > 0) {
      this.loadPaginatedProducts(
        this._productsSubject.value.pageIndex,
        this._productsSubject.value.pageSize
      );
    }
  }

  /**
   * Delete a product by ID, efficiently updating storage
   */
  deleteProduct(productId: string): void {
    // Ensure data is loaded
    this.ensureDataLoaded();

    const allProducts = this.getAllProductsFromStorage();
    const index = allProducts.findIndex((p) => p.productId === productId);

    if (index >= 0) {
      allProducts.splice(index, 1);
      localStorage.setItem(StorageKey.PRODUCTS, JSON.stringify(allProducts));

      // Update cache if valid
      if (this.isProductCacheValid()) {
        const cacheIndex = this._productsCache.data.findIndex(
          (p) => p.productId === productId
        );
        if (cacheIndex >= 0) {
          this._productsCache.data.splice(cacheIndex, 1);
        }
      }

      // For backward compatibility
      this.products.set(allProducts);

      // Update categories that reference this product
      this.removeProductFromCategories(productId);

      // Refresh pagination if needed
      if (this._productsSubject.value.pageSize > 0) {
        this.loadPaginatedProducts(
          this._productsSubject.value.pageIndex,
          this._productsSubject.value.pageSize
        );
      }
    }
  }

  /**
   * Remove product from all categories
   */
  private removeProductFromCategories(productId: string): void {
    // Ensure data is loaded
    this.ensureDataLoaded();

    const allCategories = this.getAllCategoriesFromStorage();
    let updated = false;

    for (const category of allCategories) {
      const index = category.productIds.indexOf(productId);
      if (index >= 0) {
        category.productIds.splice(index, 1);
        updated = true;
      }
    }

    if (updated) {
      localStorage.setItem(
        StorageKey.CATEGORIES,
        JSON.stringify(allCategories)
      );

      // Update cache if valid
      if (this.isCategoryCacheValid()) {
        this._categoriesCache.data = allCategories;
      }

      // For backward compatibility
      this.categories.set(allCategories);

      // Refresh pagination if needed
      if (this._categoriesSubject.value.pageSize > 0) {
        this.loadPaginatedCategories(
          this._categoriesSubject.value.pageIndex,
          this._categoriesSubject.value.pageSize
        );
      }
    }
  }

  /**
   * Save currency settings to LocalStorage
   */
  saveCurrencySettings(settings: CurrencySettings | null): void {
    if (settings) {
      localStorage.setItem(
        StorageKey.CURRENCY_SETTINGS,
        JSON.stringify(settings)
      );
    } else {
      localStorage.removeItem(StorageKey.CURRENCY_SETTINGS);
    }
    this.currencySettings.set(settings);
    this._currencySettingsCache = { data: settings, lastUpdated: Date.now() };
  }

  /**
   * Save general settings to LocalStorage
   */
  saveGeneralSettings(settings: GeneralSettings | null): void {
    if (settings) {
      localStorage.setItem(
        StorageKey.GENERAL_SETTINGS,
        JSON.stringify(settings)
      );
    } else {
      localStorage.removeItem(StorageKey.GENERAL_SETTINGS);
    }
    this.generalSettings.set(settings);
    this._generalSettingsCache = { data: settings, lastUpdated: Date.now() };
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

    // Clear caches
    this._categoriesCache = { data: [], lastUpdated: 0, isComplete: false };
    this._productsCache = { data: [], lastUpdated: 0, isComplete: false };
    this._currencySettingsCache = { data: null, lastUpdated: 0 };
    this._generalSettingsCache = { data: null, lastUpdated: 0 };

    // Reset subjects
    this._categoriesSubject.next({
      items: [],
      total: 0,
      pageIndex: 0,
      pageSize: 0,
    });
    this._productsSubject.next({
      items: [],
      total: 0,
      pageIndex: 0,
      pageSize: 0,
    });
  }

  /**
   * Delete currency settings from storage
   */
  deleteCurrencySettings(): void {
    localStorage.removeItem(StorageKey.CURRENCY_SETTINGS);
    this.currencySettings.set(null);
    this._currencySettingsCache = { data: null, lastUpdated: 0 };
  }

  /**
   * Removes general settings from storage
   */
  removeGeneralSettings(): void {
    localStorage.removeItem(StorageKey.GENERAL_SETTINGS);
    this.generalSettings.set(null);
    this._generalSettingsCache = { data: null, lastUpdated: 0 };
  }
}

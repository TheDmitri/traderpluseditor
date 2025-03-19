import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject, map, combineLatest, defer, catchError } from 'rxjs';
import { SavedFileSet } from '../models/saved-file-set.model';
import { createStructuredZip, downloadBlob, FileEntry } from '../utils/zip.utils';
import { StorageService, StorageKey } from '../../core/services/storage.service';

// LocalStorage key for saved file sets
const STORAGE_KEY = 'traderplus_saved_file_sets';

// Storage limit constant (typical browser limit is ~5MB)
export const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024; // 5MB in bytes
export const STORAGE_WARNING_THRESHOLD = 0.6; // 60% of limit
export const STORAGE_CRITICAL_THRESHOLD = 0.8; // 80% of limit

// Storage breakdown interface
export interface StorageBreakdown {
  fileSets: number;
  appData: {
    products: number;
    categories: number;
    currencySettings: number;
    generalSettings: number;
    total: number;
  };
  other: number;
  total: number;
  limit: number;
  percentUsed: number;
}

@Injectable({
  providedIn: 'root'
})
export class StorageManagerService {
  // BehaviorSubject to notify subscribers when saved sets change
  private savedFileSetsSubject = new BehaviorSubject<SavedFileSet[]>([]);
  
  // Observable that components can subscribe to
  public savedFileSets$ = this.savedFileSetsSubject.asObservable();
  
  // Storage breakdown cache to avoid excessive recalculation
  private storageBreakdownCache: StorageBreakdown | null = null;
  private lastBreakdownCheck: number = 0;
  private CACHE_LIFETIME = 30000; // 30 seconds in milliseconds
  
  constructor(private storageService: StorageService) {
    // Load saved file sets on initialization
    this.loadFromLocalStorage();
  }
  
  /**
   * Loads saved file sets from localStorage
   */
  private loadFromLocalStorage(): void {
    try {
      const storedSets = localStorage.getItem(STORAGE_KEY);
      if (storedSets) {
        const parsedSets = JSON.parse(storedSets) as SavedFileSet[];
        this.savedFileSetsSubject.next(parsedSets);
      } else {
        this.savedFileSetsSubject.next([]);
      }
    } catch (error) {
      console.error('Error loading saved file sets from localStorage:', error);
      this.savedFileSetsSubject.next([]);
    }
  }
  
  /**
   * Saves current sets to localStorage
   */
  private saveToLocalStorage(sets: SavedFileSet[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
      this.savedFileSetsSubject.next([...sets]);
      
      // Invalidate cache after changes
      this.invalidateBreakdownCache();
    } catch (error) {
      console.error('Error saving file sets to localStorage:', error);
      // If localStorage is full, show an error
      if (error instanceof DOMException && error.code === 22) {
        throw new Error('LocalStorage is full. Please delete some saved file sets before saving new ones.');
      }
    }
  }
  
  /**
   * Gets all saved file sets
   */
  getAllSets(): Observable<SavedFileSet[]> {
    return this.savedFileSets$;
  }
  
  /**
   * Gets a specific saved file set by ID
   */
  getSetById(id: string): Observable<SavedFileSet | undefined> {
    const currentSets = this.savedFileSetsSubject.getValue();
    const foundSet = currentSets.find(set => set.id === id);
    return of(foundSet);
  }
  
  /**
   * Checks if storage is approaching its limit (>90%)
   */
  isStorageNearLimit(): Observable<boolean> {
    return this.getStorageBreakdown().pipe(
      map(breakdown => breakdown.percentUsed >= 90)
    );
  }
  
  /**
   * Saves a new file set
   */
  saveFileSet(
    name: string, 
    source: string, 
    files: { [path: string]: string }
  ): Observable<SavedFileSet> {
    return this.isStorageNearLimit().pipe(
      map(isNearLimit => {
        if (isNearLimit) {
          throw new Error('Storage is nearly full (>90%). Please delete some saved file sets before saving new ones.');
        }
        
        const currentSets = this.savedFileSetsSubject.getValue();
        
        // Calculate total size more accurately
        let totalSize = this.calculateFilesSize(files);
        
        // Create a new file set
        const newSet: SavedFileSet = {
          id: this.generateUniqueId(),
          name,
          source,
          createdAt: Date.now(),
          fileCount: Object.keys(files).length,
          totalSize,
          files
        };
        
        // Add to current sets and save
        const updatedSets = [...currentSets, newSet];
        this.saveToLocalStorage(updatedSets);
        
        return newSet;
      })
    );
  }
  
  /**
   * Calculate size of files more accurately
   */
  private calculateFilesSize(files: { [path: string]: string }): number {
    // Use JSON.stringify to get closer to actual storage size
    return new Blob([JSON.stringify(files)]).size;
  }
  
  /**
   * Deletes a file set
   */
  deleteFileSet(id: string): Observable<boolean> {
    const currentSets = this.savedFileSetsSubject.getValue();
    const updatedSets = currentSets.filter(set => set.id !== id);
    
    // Only save if something was actually removed
    if (updatedSets.length < currentSets.length) {
      this.saveToLocalStorage(updatedSets);
      return of(true);
    }
    
    return of(false);
  }
  
  /**
   * Downloads a file set as a ZIP file
   */
  async downloadFileSet(id: string): Promise<boolean> {
    try {
      const currentSets = this.savedFileSetsSubject.getValue();
      const fileSet = currentSets.find(set => set.id === id);
      
      if (!fileSet) {
        return false;
      }
      
      // Convert the files to FileEntry array
      const fileEntries: FileEntry[] = Object.entries(fileSet.files).map(([path, content]) => ({
        path,
        content
      }));
      
      // Create a ZIP file
      const zipBlob = await createStructuredZip(fileEntries);
      
      // Download the ZIP file
      downloadBlob(zipBlob, `${fileSet.name}.zip`);
      
      return true;
    } catch (error) {
      console.error('Error downloading file set:', error);
      return false;
    }
  }
  
  /**
   * Generates a unique ID for a new file set
   */
  private generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }
  
  /**
   * Clear all saved file sets
   */
  clearAllSets(): Observable<boolean> {
    this.saveToLocalStorage([]);
    return of(true);
  }
  
  /**
   * Get file sets grouped by source
   */
  getGroupedSets(): Observable<{[key: string]: SavedFileSet[]}> {
    return this.savedFileSets$.pipe(
      map(sets => {
        const grouped: {[key: string]: SavedFileSet[]} = {};
        sets.forEach(set => {
          if (!grouped[set.source]) {
            grouped[set.source] = [];
          }
          grouped[set.source].push(set);
        });
        return grouped;
      })
    );
  }
  
  /**
   * Gets the total storage usage in bytes
   */
  getTotalStorageUsage(): Observable<number> {
    return this.savedFileSets$.pipe(
      map(sets => {
        // Use the JSON stringified size for better accuracy
        if (sets.length === 0) return 0;
        return new Blob([JSON.stringify(sets)]).size;
      })
    );
  }
  
  /**
   * Creates a file set from current app data (products, categories, currencies, general settings)
   * @param name Name for the saved file set
   * @returns Observable containing the created file set
   */
  createFileSetFromAppData(name: string): Observable<SavedFileSet> {
    return this.isStorageNearLimit().pipe(
      map(isNearLimit => {
        if (isNearLimit) {
          throw new Error('Storage is nearly full (>90%). Please delete some saved file sets before saving new ones.');
        }
        
        const files: { [path: string]: string } = {};
        let fileCount = 0;
        
        // Get products data
        const products = this.storageService.products();
        if (products && products.length > 0) {
          // Save as TraderPlusData\Products\products.json
          files['TraderPlusData/Products/products.json'] = JSON.stringify(products, null, 2);
          fileCount++;
          
          // Also save each product individually
          products.forEach(product => {
            // Create a new object with properties in the correct order for TraderPlus format
            const orderedProduct = {
              className: product.className,
              coefficient: product.coefficient,
              maxStock: product.maxStock,
              tradeQuantity: product.tradeQuantity,
              buyPrice: product.buyPrice,
              sellPrice: product.sellPrice,
              stockSettings: product.stockSettings,
              attachments: product.attachments || [],
              variants: product.variants || [],
            };
            
            files[`TraderPlusData/Products/${product.productId}.json`] = JSON.stringify(orderedProduct, null, 4);
            fileCount++;
          });
        }
        
        // Get categories data
        const categories = this.storageService.categories();
        if (categories && categories.length > 0) {
          // Save as TraderPlusData\Categories\categories.json
          files['TraderPlusData/Categories/categories.json'] = JSON.stringify(categories, null, 2);
          fileCount++;
          
          // Also save each category individually
          categories.forEach(category => {
            files[`TraderPlusData/Categories/${category.categoryId}.json`] = JSON.stringify(category, null, 4);
            fileCount++;
          });
        }
        
        // Get currency settings
        const currencySettings = this.storageService.currencySettings();
        if (currencySettings) {
          files['TraderPlusCurrencySettings.json'] = JSON.stringify(currencySettings, null, 4);
          fileCount++;
        }
        
        // Get general settings
        const generalSettings = this.storageService.generalSettings();
        if (generalSettings) {
          files['TraderPlusGeneralSettings.json'] = JSON.stringify(generalSettings, null, 4);
          fileCount++;
        }
        
        // If no data, return error
        if (fileCount === 0) {
          throw new Error('No app data available to create a file set');
        }
        
        // Calculate total size more accurately
        const totalSize = this.calculateFilesSize(files);
        
        // Create the new file set
        const newSet: SavedFileSet = {
          id: this.generateUniqueId(),
          name,
          source: 'app-data', // Special source identifier for app-created data
          createdAt: Date.now(),
          fileCount,
          totalSize,
          files
        };
        
        // Save to localStorage
        const currentSets = this.savedFileSetsSubject.getValue();
        const updatedSets = [...currentSets, newSet];
        this.saveToLocalStorage(updatedSets);
        
        return newSet;
      }),
      catchError(error => {
        console.error('Error creating file set from app data:', error);
        throw error;
      })
    );
  }

  /**
   * Invalidate breakdown cache
   */
  private invalidateBreakdownCache(): void {
    this.storageBreakdownCache = null;
    this.lastBreakdownCheck = 0;
  }

  /**
   * Gets the app data storage usage in bytes
   */
  getAppDataStorageUsage(): Observable<{
    products: number;
    categories: number;
    currencySettings: number;
    generalSettings: number;
    total: number;
  }> {
    return defer(() => {
      // Calculate size of products
      const products = localStorage.getItem(StorageKey.PRODUCTS) || '';
      const productsSize = products ? products.length * 2 : 0; // UTF-16 = 2 bytes per char
      
      // Calculate size of categories
      const categories = localStorage.getItem(StorageKey.CATEGORIES) || '';
      const categoriesSize = categories ? categories.length * 2 : 0;
      
      // Calculate size of currency settings
      const currencySettings = localStorage.getItem(StorageKey.CURRENCY_SETTINGS) || '';
      const currencySize = currencySettings ? currencySettings.length * 2 : 0;
      
      // Calculate size of general settings
      const generalSettings = localStorage.getItem(StorageKey.GENERAL_SETTINGS) || '';
      const generalSize = generalSettings ? generalSettings.length * 2 : 0;
      
      // Calculate total
      const total = productsSize + categoriesSize + currencySize + generalSize;
      
      return of({
        products: productsSize,
        categories: categoriesSize,
        currencySettings: currencySize,
        generalSettings: generalSize,
        total
      });
    });
  }

  /**
   * Gets a comprehensive breakdown of storage usage
   * Uses caching to avoid excessive calculations
   */
  getStorageBreakdown(): Observable<StorageBreakdown> {
    // Use cached value if available and recent
    const now = Date.now();
    if (this.storageBreakdownCache && now - this.lastBreakdownCheck < this.CACHE_LIFETIME) {
      return of(this.storageBreakdownCache);
    }
    
    // Get file sets size
    const fileSetsSize = this.getTotalStorageUsage();
    
    // Get app data size
    const appDataSize = this.getAppDataStorageUsage();
    
    // Calculate other storage usage
    const otherSize = this.calculateOtherStorageUsage();
    
    // Combine all observables
    return combineLatest([fileSetsSize, appDataSize, otherSize]).pipe(
      map(([fileSets, appData, other]) => {
        const total = fileSets + appData.total + other;
        const percentUsed = (total / STORAGE_LIMIT_BYTES) * 100;
        
        // Create breakdown object
        const breakdown: StorageBreakdown = {
          fileSets,
          appData,
          other,
          total,
          limit: STORAGE_LIMIT_BYTES,
          percentUsed
        };
        
        // Update cache
        this.storageBreakdownCache = breakdown;
        this.lastBreakdownCheck = now;
        
        return breakdown;
      })
    );
  }

  /**
   * Calculate storage used by other items in localStorage
   * Uses a more accurate method to estimate actual storage usage
   */
  private calculateOtherStorageUsage(): Observable<number> {
    return defer(() => {
      let total = 0;
      
      // Get total localStorage usage (more accurate calculation)
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            // Skip our own file sets (we calculate that separately)
            if (key === STORAGE_KEY) continue;
            
            // Skip our app data keys (we calculate those separately)
            if (Object.values(StorageKey).includes(key as any)) continue;
            
            // Estimate storage usage: key length + value length (2 bytes per char in UTF-16)
            const value = localStorage.getItem(key) || '';
            total += (key.length + value.length) * 2;
          }
        }
      } catch (error) {
        console.error('Error calculating other storage usage:', error);
      }
      
      return of(total);
    });
  }

  /**
   * Get storage warning level
   * @returns Observable with warning level
   */
  getStorageWarningLevel(): Observable<'safe' | 'warning' | 'critical'> {
    return this.getStorageBreakdown().pipe(
      map(breakdown => {
        const percentUsed = breakdown.percentUsed;
        
        if (percentUsed >= STORAGE_CRITICAL_THRESHOLD * 100) {
          return 'critical';
        } else if (percentUsed >= STORAGE_WARNING_THRESHOLD * 100) {
          return 'warning';
        } else {
          return 'safe';
        }
      })
    );
  }
}

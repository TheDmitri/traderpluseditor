import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject, map, combineLatest, defer, catchError, from } from 'rxjs';
import { SavedFileSet } from '../models/saved-file-set.model';
import { 
  createStructuredZip, 
  downloadBlob, 
  FileEntry, 
  compressObject, 
  decompressObject, 
  compressString
} from '../utils/zip.utils';
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
  
  // Compression flag to track if we need to migrate old data
  private isCompressionEnabled = true;
  
  constructor(private storageService: StorageService) {
    // Load saved file sets on initialization
    this.loadFromLocalStorage();
  }
  
  /**
   * Loads saved file sets from localStorage
   * Now includes decompression if needed
   */
  private async loadFromLocalStorage(): Promise<void> {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (!storedData) {
        this.savedFileSetsSubject.next([]);
        return;
      }
      
      // Check if data is compressed (starts with 'UEsDBC' which is the ZIP file signature in base64)
      if (storedData.startsWith('UEs')) {
        // This appears to be compressed data
        try {
          const decompressedData = await decompressObject<SavedFileSet[]>(storedData);
          this.savedFileSetsSubject.next(decompressedData);
        } catch (error) {
          console.error('Error decompressing file sets:', error);
          // Fallback to treating as uncompressed
          const parsedSets = JSON.parse(storedData) as SavedFileSet[];
          
          // If we successfully parsed uncompressed data, let's migrate it to compressed
          if (Array.isArray(parsedSets)) {
            this.savedFileSetsSubject.next(parsedSets);
            // Schedule migration to compressed format
            setTimeout(() => this.migrateToCompressedFormat(), 100);
          } else {
            this.savedFileSetsSubject.next([]);
          }
        }
      } else {
        // Treat as uncompressed legacy data
        const parsedSets = JSON.parse(storedData) as SavedFileSet[];
        this.savedFileSetsSubject.next(parsedSets);
        
        // Schedule migration to compressed format
        setTimeout(() => this.migrateToCompressedFormat(), 100);
      }
    } catch (error) {
      console.error('Error loading saved file sets from localStorage:', error);
      this.savedFileSetsSubject.next([]);
    }
  }
  
  /**
   * Migrate existing uncompressed data to compressed format
   */
  private async migrateToCompressedFormat(): Promise<void> {
    if (!this.isCompressionEnabled) return;
    
    const currentSets = this.savedFileSetsSubject.getValue();
    if (currentSets.length === 0) return;
    
    // Check if sets need migration (any without compressed flag)
    const needsMigration = currentSets.some(set => !set.compressed);
    if (!needsMigration) return;
    
    console.log('Migrating file sets to compressed format...');
    
    try {
      await this.saveToLocalStorage(currentSets);
      console.log('Migration to compressed format completed successfully.');
    } catch (error) {
      console.error('Error during migration to compressed format:', error);
    }
  }
  
  /**
   * Saves current sets to localStorage with compression
   */
  private async saveToLocalStorage(sets: SavedFileSet[]): Promise<void> {
    try {
      // Mark all sets as compressed and calculate compressed size
      const setsToSave = await Promise.all(sets.map(async (set) => {
        // If already compressed, keep as is
        if (set.compressed) return set;
        
        // Calculate compressed size for each file set
        const filesJson = JSON.stringify(set.files);
        const compressedFilesJson = await compressString(filesJson);
        const compressedSize = new Blob([compressedFilesJson]).size;
        
        // Return updated set with compression info
        return {
          ...set,
          compressedSize,
          compressed: true
        };
      }));
      
      if (this.isCompressionEnabled) {
        // Compress the entire array
        const compressedData = await compressObject(setsToSave);
        localStorage.setItem(STORAGE_KEY, compressedData);
      } else {
        // Fallback to uncompressed if needed (should not happen)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(setsToSave));
      }
      
      // Update the subject
      this.savedFileSetsSubject.next([...setsToSave]);
      
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
    return from(this.saveFileSetAsync(name, source, files));
  }
  
  /**
   * Async implementation of saveFileSet with compression
   */
  private async saveFileSetAsync(
    name: string,
    source: string,
    files: { [path: string]: string }
  ): Promise<SavedFileSet> {
    // Check storage limit
    const isNearLimit = await this.isStorageNearLimit().toPromise().catch(() => false);
    if (isNearLimit) {
      throw new Error('Storage is nearly full (>90%). Please delete some saved file sets before saving new ones.');
    }
    
    const currentSets = this.savedFileSetsSubject.getValue();
    
    // Calculate original size
    const totalSize = this.calculateFilesSize(files);
    
    // Compress the files content to estimate compressed size
    const filesJson = JSON.stringify(files);
    const compressedFilesJson = await compressString(filesJson);
    const compressedSize = new Blob([compressedFilesJson]).size;
    
    // Create the new file set with compression info
    const newSet: SavedFileSet = {
      id: this.generateUniqueId(),
      name,
      source,
      createdAt: Date.now(),
      fileCount: Object.keys(files).length,
      totalSize,
      files,
      compressed: true,
      compressedSize
    };
    
    // Add to current sets and save
    const updatedSets = [...currentSets, newSet];
    await this.saveToLocalStorage(updatedSets);
    
    return newSet;
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
    return from(this.deleteFileSetAsync(id));
  }
  
  /**
   * Async implementation of deleteFileSet
   */
  private async deleteFileSetAsync(id: string): Promise<boolean> {
    const currentSets = this.savedFileSetsSubject.getValue();
    const updatedSets = currentSets.filter(set => set.id !== id);
    
    // Only save if something was actually removed
    if (updatedSets.length < currentSets.length) {
      await this.saveToLocalStorage(updatedSets);
      return true;
    }
    
    return false;
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
    return from(this.clearAllSetsAsync());
  }
  
  /**
   * Async implementation of clearAllSets
   */
  private async clearAllSetsAsync(): Promise<boolean> {
    await this.saveToLocalStorage([]);
    return true;
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
   * Now accounts for compressed data
   */
  getTotalStorageUsage(): Observable<number> {
    return defer(async () => {
      const sets = this.savedFileSetsSubject.getValue();
      if (sets.length === 0) return 0;
      
      if (this.isCompressionEnabled) {
        // For compressed storage, we need to get the actual size from localStorage
        const compressedData = localStorage.getItem(STORAGE_KEY);
        if (!compressedData) return 0;
        return new Blob([compressedData]).size;
      } else {
        // Fallback to calculating based on the JSON size
        return new Blob([JSON.stringify(sets)]).size;
      }
    });
  }
  
  /**
   * Creates a file set from current app data (products, categories, currencies, general settings)
   * @param name Name for the saved file set
   * @returns Observable containing the created file set
   */
  createFileSetFromAppData(name: string): Observable<SavedFileSet> {
    return from(this.createFileSetFromAppDataAsync(name));
  }
  
  /**
   * Async implementation of createFileSetFromAppData with compression
   */
  private async createFileSetFromAppDataAsync(name: string): Promise<SavedFileSet> {
    // Check storage limit
    const isNearLimit = await this.isStorageNearLimit().toPromise().catch(() => false);
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
    
    // Compress the files content to estimate compressed size
    const filesJson = JSON.stringify(files);
    const compressedFilesJson = await compressString(filesJson);
    const compressedSize = new Blob([compressedFilesJson]).size;
    
    // Create the new file set with compression info
    const newSet: SavedFileSet = {
      id: this.generateUniqueId(),
      name,
      source: 'app-data', // Special source identifier for app-created data
      createdAt: Date.now(),
      fileCount,
      totalSize,
      files,
      compressed: true,
      compressedSize
    };
    
    // Save to localStorage
    const currentSets = this.savedFileSetsSubject.getValue();
    const updatedSets = [...currentSets, newSet];
    await this.saveToLocalStorage(updatedSets);
    
    return newSet;
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

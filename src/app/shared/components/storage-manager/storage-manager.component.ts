import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { take, catchError } from 'rxjs/operators';
import { EMPTY, forkJoin } from 'rxjs';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTreeModule } from '@angular/material/tree';
// Remove MatSnackBar import as we'll use NotificationService instead

// Services and models
import { StorageManagerService, StorageBreakdown, STORAGE_LIMIT_BYTES } from '../../services/storage-manager.service';
import { SavedFileSet } from '../../models/saved-file-set.model';
import { FileSizePipe } from '../../pipes/filesize.pipe';
import { StorageService } from '../../../core/services/storage.service';
import { NotificationService } from '../../services/notification.service';
import { StatisticsService } from '../../services/statistics.service';
// Add import for FileConverterStorageService
import { FileConverterStorageService } from '../../../features/file-converter/services/file-converter-storage.service';

// Dialog components
import { TextInputDialogComponent } from '../../components/text-input-dialog/text-input-dialog.component';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-storage-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatMenuModule,
    MatChipsModule,
    MatListModule,
    MatTreeModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    FileSizePipe
],
  templateUrl: './storage-manager.component.html',
  styleUrl: './storage-manager.component.scss',
})
export class StorageManagerComponent implements OnInit, OnDestroy, AfterViewInit {
  // Properties
  savedFileSets: SavedFileSet[] = [];
  groupedFileSets: {[key: string]: SavedFileSet[]} = {};
  totalStorageUsage: number = 0;
  private subscriptions: Subscription = new Subscription();
  
  // App data availability
  hasAppProducts = false;
  hasAppCategories = false;
  hasAppCurrency = false;
  hasAppGeneralSettings = false;
  hasAnyAppData = false;
  
  // Source display names mapping
  sourceNames: {[key: string]: string} = {
    'traderplus': 'FileSets converted from TraderPlus v1',
    'expansion': 'FileSets converted from Expansion Trader',
    'jones': 'FileSets converted from Dr. Jones Trader',
    'app-data': 'FileSets created from App Data',
    'unknown': 'Unknown Source'
  };

  // New properties for storage breakdown
  storageBreakdown: StorageBreakdown | null = null;
  storageWarningLevel: 'safe' | 'warning' | 'critical' = 'safe';
  private criticalWarningShown = false;

  // Track which card is hovered for highlighting in the chart
  hoveredCardIndex: number = -1;

  // Add loading state
  isLoading = true;

  constructor(
    private storageManagerService: StorageManagerService,
    private storageService: StorageService,
    private router: Router,
    private dialog: MatDialog,
    private notificationService: NotificationService,
    private statisticsService: StatisticsService,
    // Add FileConverterStorageService to constructor
    private fileConverterStorageService: FileConverterStorageService
  ) {}

  ngOnInit(): void {
    // Initialize with default values to avoid showing "0 bytes"
    this.storageBreakdown = {
      fileSets: 0,
      appData: { products: 0, categories: 0, currencySettings: 0, generalSettings: 0, total: 0 },
      other: 0,
      total: 9, // Small default value for better UX
      limit: STORAGE_LIMIT_BYTES,
      percentUsed: 0
    };
    
    // Subscribe to all file sets
    this.subscriptions.add(
      this.storageManagerService.getAllSets().subscribe(sets => {
        this.savedFileSets = sets;
        // Force recalculation when file sets are loaded
        if (sets.length > 0 && this.isLoading) {
          this.refreshStorageBreakdown();
          this.isLoading = false;
        }
      })
    );
    
    // Subscribe to grouped file sets
    this.subscriptions.add(
      this.storageManagerService.getGroupedSets().subscribe(grouped => {
        this.groupedFileSets = grouped;
      })
    );
    
    // Subscribe to total storage usage
    this.subscriptions.add(
      this.storageManagerService.getTotalStorageUsage().subscribe(usage => {
        this.totalStorageUsage = usage;
      })
    );
    
    // Subscribe to storage breakdown changes
    this.subscriptions.add(
      this.storageManagerService.getStorageBreakdown().subscribe(breakdown => {
        this.storageBreakdown = breakdown;
      })
    );
    
    // Add subscription for storage warning level
    this.subscriptions.add(
      this.storageManagerService.getStorageWarningLevel().subscribe(level => {
        this.storageWarningLevel = level;
        
        // Show warning if storage is at critical level
        if (level === 'critical' && !this.criticalWarningShown) {
          this.showStorageWarning();
          this.criticalWarningShown = true;
        }
      })
    );
    
    // Check for app data availability
    this.checkAppDataAvailability();
  }
  
  ngAfterViewInit(): void {
    // Force recalculation after view initialization to ensure data is loaded
    setTimeout(() => {
      this.refreshStorageBreakdown();
    }, 300);
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.unsubscribe();
  }
  
  /**
   * Checks if app data is available to create file sets
   */
  checkAppDataAvailability(): void {
    // Check products
    const products = this.storageService.products();
    this.hasAppProducts = products && products.length > 0;
    
    // Check categories
    const categories = this.storageService.categories();
    this.hasAppCategories = categories && categories.length > 0;
    
    // Check currency settings
    const currencySettings = this.storageService.currencySettings();
    this.hasAppCurrency = currencySettings !== null;
    
    // Check general settings
    const generalSettings = this.storageService.generalSettings();
    this.hasAppGeneralSettings = generalSettings !== null;
    
    // Check if any data is available
    this.hasAnyAppData = this.hasAppProducts || this.hasAppCategories || 
                         this.hasAppCurrency || this.hasAppGeneralSettings;
  }
  
  /**
   * Creates a file set from app data
   */
  createAppDataFileSet(): void {
    // First check if we're near the storage limit
    this.storageManagerService.isStorageNearLimit().pipe(take(1)).subscribe(isNearLimit => {
      if (isNearLimit) {
        this.notificationService.warning('Storage is nearly full (>90%). Please delete some saved file sets before saving new ones.');
        return;
      }

      // If not near limit, proceed with showing the dialog
      const dialogRef = this.dialog.open(TextInputDialogComponent, {
        width: '350px',
        data: {
          title: 'Create App Data File Set',
          label: 'File Set Name',
          placeholder: 'Enter a name for this file set',
          initialValue: `TraderX Config ${new Date().toLocaleDateString()}`,
          confirmText: 'Create'
        }
      });

      dialogRef.afterClosed().pipe(take(1)).subscribe(result => {
        if (result) {
          this.storageManagerService.createFileSetFromAppData(result).pipe(
            take(1),
            catchError(error => {
              console.error('Error creating file set:', error);
              this.notificationService.error(`Error creating file set: ${error.message}`);
              return EMPTY;
            })
          ).subscribe(fileSet => {
            this.notificationService.success(`File set '${fileSet.name}' created successfully`);
          });
        }
      });
    });
  }
  
  /**
   * Get source display name
   */
  getSourceDisplayName(source: string): string {
    return this.sourceNames[source] || this.sourceNames['unknown'];
  }
  
  /**
   * Get icon for a source type
   */
  getSourceIcon(source: string): string {
    switch (source) {
      case 'traderplus': return 'storefront';
      case 'expansion': return 'extension';
      case 'jones': return 'local_mall';
      case 'app-data': return 'app_registration';
      default: return 'storage';
    }
  }
  
  /**
   * Downloads a saved file set
   */
  downloadSavedFileSet(set: SavedFileSet): void {
    this.storageManagerService.downloadFileSet(set.id)
      .then(success => {
        if (!success) {
          this.notificationService.error('Error downloading file set. Please try again.');
        }
      })
      .catch(error => {
        console.error('Error downloading file set:', error);
        this.notificationService.error('Error downloading file set. Please try again.');
      });
  }
  
  /**
   * Deletes a saved file set
   */
  deleteSavedFileSet(set: SavedFileSet, event: Event): void {
    // Prevent event bubbling
    event.stopPropagation();
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete File Set',
        message: `Are you sure you want to delete "${set.name}"?\n\nThis action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger'
      }
    });

    dialogRef.afterClosed().pipe(take(1)).subscribe(result => {
      if (result) {
        this.storageManagerService.deleteFileSet(set.id).pipe(take(1)).subscribe(
          success => {
            if (!success) {
              this.notificationService.error('Error deleting file set. Please try again.');
            } else {
              this.notificationService.success('File set deleted successfully.');
            }
          },
          error => {
            console.error('Error deleting file set:', error);
            this.notificationService.error('Error deleting file set. Please try again.');
          }
        );
      }
    });
  }
  
  /**
   * Deletes all file sets of a specific source type
   */
  deleteFileSetsByType(sourceType: string): void {
    // Check if there are file sets of this type
    if (!this.groupedFileSets[sourceType] || this.groupedFileSets[sourceType].length === 0) {
      return; // Nothing to delete
    }
    
    const count = this.groupedFileSets[sourceType].length;
    
    // Extract just the name portion from the full display name
    const fullName = this.getSourceDisplayName(sourceType);
    const sourceName = fullName.includes('FileSets converted from ') 
      ? fullName.replace('FileSets converted from ', '') 
      : fullName;
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: `Delete ${sourceName} File Sets`,
        message: `Are you sure you want to delete all ${count} file sets from ${sourceName}?\n\nThis action cannot be undone.`,
        confirmText: 'Delete All',
        cancelText: 'Cancel',
        type: 'danger'
      }
    });

    dialogRef.afterClosed().pipe(take(1)).subscribe(result => {
      if (result) {
        // Use the new batch delete method
        this.storageManagerService.deleteFileSetsByType(sourceType)
          .pipe(take(1))
          .subscribe({
            next: (deletedCount) => {
              // Show success message
              this.notificationService.success(`Successfully deleted all ${deletedCount} ${sourceName} file sets.`);
            },
            error: (error) => {
              console.error('Error deleting file sets:', error);
              this.notificationService.error('There was an error deleting some file sets.');
            }
          });
      }
    });
  }
  
  /**
   * Navigates to the file converter with the selected file set
   */
  loadInConverter(set: SavedFileSet): void {
    // Store the ID in sessionStorage for the converter to pick up
    sessionStorage.setItem('loadFileSetId', set.id);
    this.router.navigate(['/converter']);
  }
  
  /**
   * Clear all saved file sets
   */
  clearAllSavedFileSets(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete All File Sets',
        message: 'Are you sure you want to delete ALL saved file sets?\n\nThis action cannot be undone.',
        confirmText: 'Delete All',
        cancelText: 'Cancel',
        type: 'danger'
      }
    });

    dialogRef.afterClosed().pipe(take(1)).subscribe(result => {
      if (result) {
        this.storageManagerService.clearAllSets().pipe(take(1)).subscribe(() => {
          this.notificationService.success('All file sets deleted successfully.');
        });
      }
    });
  }
  
  /**
   * Format date for display
   */
  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }
  
  /**
   * Get sorted keys of an object
   * This already sorts in the order we want:
   * 1. app-data (App Created Data)
   * 2. traderplus (TraderPlus v1)
   * 3. expansion (Expansion Trader)
   * 4. jones (Dr. Jones Trader)
   */
  getSortedKeys(obj: {[key: string]: any}): string[] {
    return Object.keys(obj).sort((a, b) => {
      // Custom sort order: app-data, traderplus, expansion, jones, then others alphabetically
      const order: {[key: string]: number} = {
        'app-data': 0,
        'traderplus': 1,
        'expansion': 2,
        'jones': 3
      };
      
      const orderA = order[a] || 99;
      const orderB = order[b] || 99;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      return a.localeCompare(b);
    });
  }
  
  /**
   * Gets summary of app data
   */
  getAppDataSummary(): string {
    const parts = [];
    if (this.hasAppProducts) {
      parts.push(`${this.storageService.products().length} products`);
    }
    if (this.hasAppCategories) {
      parts.push(`${this.storageService.categories().length} categories`);
    }
    if (this.hasAppCurrency) {
      parts.push('currency settings');
    }
    if (this.hasAppGeneralSettings) {
      parts.push('general settings');
    }
    
    return parts.join(', ');
  }
  
  /**
   * Shows storage warning alert
   */
  showStorageWarning(): void {
    // Only show the warning for critical levels (check actual percentage)
    this.storageManagerService.getStorageBreakdown().subscribe(breakdown => {
      if (breakdown.percentUsed >= 90) {
        this.notificationService.warning(`WARNING: Local storage is at ${Math.round(breakdown.percentUsed)}% of its 5MB limit. Some data may not be saved properly.`);
        this.criticalWarningShown = true;
      }
    });
  }
  
  /**
   * Gets the storage usage color based on warning level
   */
  getStorageUsageColor(): string {
    if (!this.storageBreakdown) return 'primary';
    
    const percentUsed = this.storageBreakdown.percentUsed;
    
    if (percentUsed >= 80) {
      return 'warn';
    } else if (percentUsed >= 60) {
      return 'accent';
    } else {
      return 'primary';
    }
  }
  
  /**
   * Get color class for storage percentage
   */
  getStoragePercentageClass(): string {
    if (!this.storageBreakdown) return 'storage-safe';
    
    const percentUsed = this.storageBreakdown.percentUsed;
    
    if (percentUsed >= 80) {
      return 'storage-critical';
    } else if (percentUsed >= 60) {
      return 'storage-warning';
    } else {
      return 'storage-safe';
    }
  }
  
  /**
   * Check if we have file set data
   */
  hasFileSets(): boolean {
    return this.savedFileSets.length > 0;
  }
  
  /**
   * Check if storage usage is over a certain percentage
   */
  isStorageUsageOver(percentage: number): boolean {
    if (!this.storageBreakdown) return false;
    return this.storageBreakdown.percentUsed >= percentage;
  }
  
  /**
   * Safely calculate percentage with formatting
   */
  getPercentage(value: number, total: number): string {
    if (total <= 0) return '0.0';
    return ((value / total) * 100).toFixed(1);
  }

  /**
   * Calculate chart segment size (percentage)
   */
  getChartSegmentSize(value: number, total: number): number {
    if (total <= 0) return 0;
    return Math.round((value / total) * 100);
  }

  /**
   * Gets compression details for display
   */
  getCompressionDetails(fileSet: SavedFileSet): string {
    if (!fileSet.compressed || !fileSet.compressedSize) {
      return '';
    }
    
    const originalSize = fileSet.totalSize;
    const compressedSize = fileSet.compressedSize;
    const savingsPercent = Math.round((1 - (compressedSize / originalSize)) * 100);
    
    return `${savingsPercent}% saved`;
  }
  
  /**
   * Checks if file set is compressed
   */
  isCompressed(fileSet: SavedFileSet): boolean {
    return !!fileSet.compressed;
  }

  /**
   * Refreshes the storage breakdown data
   */
  refreshStorageBreakdown(): void {
    this.storageManagerService.forceStorageBreakdownRecalculation().subscribe(breakdown => {
      this.storageBreakdown = breakdown;
      this.isLoading = false;
    });
  }

  /**
   * Resets the entire application by clearing all localStorage data
   * This will remove ALL data including file sets, app data, and statistics
   */
  resetEntireApp(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Reset Entire Application',
        message: 'WARNING: This will permanently delete ALL data from the application, including:' +
                '\n• All saved file sets' + 
                '\n• All products and categories' +
                '\n• All currency and general settings' +
                '\n• Application preferences and statistics' +
                '\n• File converter data and uploaded files' +  // Added this line to clarify
                '\n\nThis action cannot be undone and the application will reload after reset.',
        confirmText: 'Reset Everything',
        cancelText: 'Cancel',
        type: 'danger',
        additionalInfo: 'You may want to download your data before proceeding.'
      }
    });

    dialogRef.afterClosed().pipe(take(1)).subscribe(result => {
      if (result) {
        // First clear all file sets
        this.storageManagerService.clearAllSets().pipe(take(1)).subscribe(() => {
          // Then clear all app data
          this.storageService.clearAllData();
          
          // Reset all statistics
          this.statisticsService.resetStatistics();
          
          // Reset the file converter data
          this.fileConverterStorageService.resetStorage();
          
          // Show success notification
          this.notificationService.success('Application reset complete. The page will reload.');
          
          // Refresh storage breakdown
          this.refreshStorageBreakdown();
          
          // Reload the application after a brief delay
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        });
      }
    });
  }
}

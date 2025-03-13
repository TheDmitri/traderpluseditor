import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

// Application imports
import { FileService } from '../../../core/services';
import { ConfirmDialogComponent } from '../../../shared/components';
import { NotificationService } from '../../../shared/services';
import { ActivityLog } from '../../../shared/models/activity-log.model';
import { ActivityLogService } from '../../../shared/services/activity-log.service';
import { FileProcessingService, ImportStats } from '../services/file-processing.service';

/**
 * FileManagementComponent provides functionality to import and export TraderPlus configuration files.
 *
 * This component handles:
 * - Importing categories, products, currency settings, and general settings via file selection
 * - Drag & drop import of multiple files with automatic format detection
 * - Exporting configuration files individually or as a combined ZIP archive
 * - Tracking and displaying recent file operations
 * - Providing visual feedback on import/export operations
 *
 * The component implements intelligent file type detection based on both filename patterns
 * and content analysis to provide a seamless import experience for users.
 */
@Component({
  selector: 'app-file-management',
  standalone: true,
  imports: [
    CommonModule,
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
  ],
  templateUrl: './file-management.component.html',
  styleUrls: ['./file-management.component.scss'],
})
export class FileManagementComponent implements OnInit {
  /** Services injected using the inject pattern for better tree-shaking */
  private fileService = inject(FileService);
  private notificationService = inject(NotificationService);
  private dialog = inject(MatDialog);
  private fileProcessingService = inject(FileProcessingService);
  private activityLogService = inject(ActivityLogService);

  /**
   * References to hidden file input elements used for triggering file selection dialogs
   * Each input handles a specific file type (categories, products, etc.)
   */
  @ViewChild('categoriesInput') categoriesInput!: ElementRef<HTMLInputElement>;
  @ViewChild('productsInput') productsInput!: ElementRef<HTMLInputElement>;
  @ViewChild('currenciesInput') currenciesInput!: ElementRef<HTMLInputElement>;
  @ViewChild('settingsInput') settingsInput!: ElementRef<HTMLInputElement>;

  /** UI state flags for managing drag & drop interactions and loading states */
  /** Flag indicating whether a file is currently being dragged over the drop zone */
  isDragging = false;
  /** Flag indicating whether a file upload operation is in progress */
  isUploading = false;

  /** Data availability flags to track what types of data are currently loaded */
  /** Flag indicating whether any category data is currently loaded */
  hasCategories = false;
  /** Flag indicating whether any product data is currently loaded */
  hasProducts = false;
  /** Flag indicating whether currency settings data is currently loaded */
  hasCurrencies = false;
  /** Flag indicating whether general settings data is currently loaded */
  hasSettings = false;
  isActivityExpanded: boolean = false;

  /**
   * Reference to activity log from service for template binding
   */
  recentActivity: ActivityLog[] = [];

  /**
   * Detailed statistics about import operations for providing user feedback
   */
  importStats: ImportStats = this.fileProcessingService.createEmptyImportStats();

  /**
   * Initializes the component when it is first created
   * - Checks for existing data in storage
   * - Logs initial activity entry
   */
  ngOnInit(): void {
    // Check for existing data in storage
    this.updateDataStatus();
    
    // Subscribe to activity log updates for UI display
    this.activityLogService.getActivityLog().subscribe(log => {
      this.recentActivity = log;
    });
  }

  // ----- Data Status Management Methods ----- //

  /**
   * Updates the local data status flags from the service
   */
  private updateDataStatus(): void {
    const dataStatus = this.fileProcessingService.checkExistingData();
    this.hasCategories = dataStatus.hasCategories;
    this.hasProducts = dataStatus.hasProducts;
    this.hasCurrencies = dataStatus.hasCurrencies;
    this.hasSettings = dataStatus.hasSettings;
  }

  /**
   * Returns the total number of categories currently in storage
   *
   * @returns {number} The count of categories, or 0 if none exist
   */
  getCategoriesCount(): number {
    return this.fileProcessingService.getCategoriesCount();
  }

  /**
   * Returns the total number of products currently in storage
   *
   * @returns {number} The count of products, or 0 if none exist
   */
  getProductsCount(): number {
    return this.fileProcessingService.getProductsCount();
  }

  /**
   * Returns the number of currency types defined in currency settings
   *
   * @returns {number} The count of currency types, or 0 if none exist
   */
  getCurrencyTypesCount(): number {
    return this.fileProcessingService.getCurrencyTypesCount();
  }

  /**
   * Checks if any type of data exists in the application
   * Used to determine whether export functions should be enabled
   *
   * @returns {boolean} True if any data exists, false otherwise
   */
  hasAnyData(): boolean {
    return (
      this.hasCategories ||
      this.hasProducts ||
      this.hasCurrencies ||
      this.hasSettings
    );
  }

  // ----- Activity Logging Methods ----- //

  /**
   * Returns the appropriate Material icon name for each activity type
   * Used to visually distinguish different types of activities in the log
   *
   * @param {string} type - The type of activity
   * @returns {string} The name of the Material icon to display
   */
  getActivityIcon(type: string): string {
    return this.activityLogService.getActivityIcon(type);
  }

  // ----- File Input Handling Methods ----- //

  /**
   * Triggers the appropriate file input element based on the specified type
   * This creates the effect of clicking a hidden file input when a visible button is clicked
   *
   * @param {string} type - The type of file input to trigger ('categories', 'products', etc.)
   */
  triggerFileInput(type: string): void {
    switch (type) {
      case 'categories':
        this.categoriesInput.nativeElement.click();
        break;
      case 'products':
        this.productsInput.nativeElement.click();
        break;
      case 'currencies':
        this.currenciesInput.nativeElement.click();
        break;
      case 'settings':
        this.settingsInput.nativeElement.click();
        break;
    }
  }

  /**
   * Handles file selection from input element
   * Processes the selected files and resets the input element
   *
   * @param {Event} event - The file input change event
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files?.length) {
      return;
    }

    // Reset statistics for each new import session
    this.importStats = this.fileProcessingService.createEmptyImportStats();
    this.isUploading = true;

    // Process files with automatic type detection
    this.processFiles(input.files);

    // Reset the input so that selecting the same file again will trigger the event.
    input.value = '';
  }

  // ----- Drag & Drop Functionality ----- //

  /**
   * Handles the dragover event for the drop zone
   * Prevents default behavior and updates UI state
   *
   * @param {DragEvent} event - The drag event
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  /**
   * Handles the dragleave event for the drop zone
   * Prevents default behavior and updates UI state
   *
   * @param {DragEvent} event - The drag event
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  /**
   * Handles the drop event when files are dropped onto the drop zone
   * Processes the dropped files and updates UI state
   *
   * @param {DragEvent} event - The drop event containing the files
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    // Reset statistics
    this.importStats = this.fileProcessingService.createEmptyImportStats();
    this.isUploading = true;

    // Process each file individually for better error handling
    this.processFiles(files);
  }

  // ----- File Processing Methods ----- //

  /**
   * Processes files using the file processing service
   * 
   * @param files Files to process
   * @param typeHint Optional type hint
   */
  private async processFiles(files: FileList, typeHint?: string): Promise<void> {
    try {
      // Process the files and get the results
      this.importStats = await this.fileProcessingService.processFiles(files, typeHint);
      
      // Update UI state to reflect newly imported data
      this.updateDataStatus();
      
      // Show appropriate notifications
      this.fileProcessingService.showImportResults(this.importStats);
    } finally {
      this.isUploading = false;
    }
  }

  // ----- Export Functions ----- //

  /**
   * Exports category data to a JSON file
   */
  exportCategories(): void {
    if (!this.hasCategories) {
      this.notificationService.warning('No categories to export');
      this.activityLogService.logActivity(
        'error',
        'Attempted to export categories but none exist'
      );
      return;
    }

    const success = this.fileService.exportCategories();
    if (success) {
      this.notificationService.success('Categories exported successfully');
      this.activityLogService.logActivity('export', 'Exported categories to file');
    }
  }

  /**
   * Exports product data to a JSON file
   */
  exportProducts(): void {
    if (!this.hasProducts) {
      this.notificationService.warning('No products to export');
      this.activityLogService.logActivity('error', 'Attempted to export products but none exist');
      return;
    }

    const success = this.fileService.exportProducts();
    if (success) {
      this.notificationService.success('Products exported successfully');
      this.activityLogService.logActivity('export', 'Exported products to file');
    }
  }

  /**
   * Exports currency settings to a JSON file
   */
  exportCurrencySettings(): void {
    if (!this.hasCurrencies) {
      this.notificationService.warning('No currency settings to export');
      this.activityLogService.logActivity(
        'error',
        'Attempted to export currency settings but none exist'
      );
      return;
    }

    const success = this.fileService.exportCurrencySettings();
    if (success) {
      this.notificationService.success('Currency settings exported successfully');
      this.activityLogService.logActivity('export', 'Exported currency settings to file');
    }
  }

  /**
   * Exports general settings to a JSON file
   */
  exportGeneralSettings(): void {
    if (!this.hasSettings) {
      this.notificationService.warning('No general settings to export');
      this.activityLogService.logActivity(
        'error',
        'Attempted to export general settings but none exist'
      );
      return;
    }

    const success = this.fileService.exportGeneralSettings();
    if (success) {
      this.notificationService.success('General settings exported successfully');
      this.activityLogService.logActivity('export', 'Exported general settings to file');
    }
  }

  /**
   * Exports all configurations as a ZIP archive
   */
  async exportAllConfigs(): Promise<void> {
    // Check if there's any data to export
    if (!this.hasAnyData()) {
      this.notificationService.warning('No configurations to export');
      this.activityLogService.logActivity(
        'error',
        'Attempted to export all configurations but none exist'
      );
      return;
    }

    try {
      // Attempt to create and download a ZIP archive with all configurations
      const success = await this.fileService.exportAllAsZip();
      if (success) {
        this.notificationService.success('All configurations exported as ZIP archive');
        this.activityLogService.logActivity('export', 'Exported all configurations as ZIP archive');
      } else {
        throw new Error('No data was exported');
      }
    } catch (error) {
      // If ZIP creation fails (e.g., browser limitations), fall back to individual exports
      console.error('Error exporting as ZIP:', error);
      const errorMessage = 'Could not create ZIP archive. Exporting individual files instead.';
      this.notificationService.warning(errorMessage);
      this.activityLogService.logActivity('error', errorMessage);

      // Fallback to individual files export
      if (this.hasCategories) {
        this.fileService.exportCategories();
        this.activityLogService.logActivity('export', 'Exported categories (fallback)');
      }
      if (this.hasProducts) {
        this.fileService.exportProducts();
        this.activityLogService.logActivity('export', 'Exported products (fallback)');
      }
      if (this.hasCurrencies) {
        this.fileService.exportCurrencySettings();
        this.activityLogService.logActivity('export', 'Exported currency settings (fallback)');
      }
      if (this.hasSettings) {
        this.fileService.exportGeneralSettings();
        this.activityLogService.logActivity('export', 'Exported general settings (fallback)');
      }
    }
  }

  /**
   * Opens a confirmation dialog before deleting data
   * 
   * @param {string} dataType - The type of data to delete ('categories', 'products', etc.)
   */
  confirmDeleteData(dataType: 'categories' | 'products' | 'currencies' | 'settings'): void {
    const typeLabel = this.fileProcessingService.getTypeLabel(dataType, true);
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: `Delete ${typeLabel}`,
        message: `Are you sure you want to delete all ${typeLabel.toLowerCase()}? \n\nThis action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger',
        destructive: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.deleteData(dataType);
      }
    });
  }

  /**
   * Deletes data of the specified type
   * 
   * @param {string} dataType - The type of data to delete ('categories', 'products', etc.)
   */
  deleteData(dataType: 'categories' | 'products' | 'currencies' | 'settings'): void {
    this.fileProcessingService.deleteData(dataType);
    
    // Update the component's data status after deletion
    this.updateDataStatus();
  }
}

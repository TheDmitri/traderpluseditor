import {
  Component,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { FileService, StorageService } from '../../../core/services';
import { NotificationService } from '../../../shared/services/notification.service';

/**
 * Interface for tracking and displaying user actions in the activity log
 * 
 * @property {string} type - The category of activity (import, export, error, etc.)
 * @property {string} message - Descriptive text about what happened
 * @property {Date} timestamp - When the activity occurred
 */
interface ActivityLog {
  type:
    | 'import'    // File import operations
    | 'export'    // File export operations
    | 'error'     // Error conditions
    | 'categories' // Category-specific operations
    | 'products'   // Product-specific operations 
    | 'currencies' // Currency settings operations
    | 'settings';  // General settings operations
  message: string;
  timestamp: Date;
}

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
  private storageService = inject(StorageService);
  private notificationService = inject(NotificationService);

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

  /** 
   * Array of recent activities for displaying in the activity log
   * Most recent activities are added to the beginning of the array
   */
  recentActivity: ActivityLog[] = [];

  /** 
   * Detailed statistics about import operations for providing user feedback
   * Tracks counts of processed, successful, failed, and skipped files by type
   */
  importStats = {
    processed: 0,  // Total number of files processed
    successful: 0, // Files successfully imported
    failed: 0,     // Files that failed to import
    skipped: 0,    // Files skipped (not matching any known format)
    categories: 0, // Number of category files successfully processed
    products: 0,   // Number of product files successfully processed
    currencies: 0, // Number of currency settings files successfully processed
    settings: 0,   // Number of general settings files successfully processed
  };

  /**
   * Initializes the component when it is first created
   * - Checks for existing data in storage
   * - Logs initial activity entry
   */
  ngOnInit(): void {
    // Check for existing data in storage
    this.checkExistingData();

    // Add initial log entry
    this.logActivity('import', 'Application initialized');
  }

  // ----- Data Status Management Methods ----- //

  /**
   * Checks storage services for existing data and updates status flags
   * These flags control which UI elements are enabled/disabled and display appropriate messages
   */
  private checkExistingData(): void {
    this.hasCategories = this.storageService.categories()?.length > 0;
    this.hasProducts = this.storageService.products()?.length > 0;
    this.hasCurrencies = !!this.storageService.currencySettings();
    this.hasSettings = !!this.storageService.generalSettings();
  }

  /**
   * Returns the total number of categories currently in storage
   * 
   * @returns {number} The count of categories, or 0 if none exist
   */
  getCategoriesCount(): number {
    return this.storageService.categories()?.length || 0;
  }

  /**
   * Returns the total number of products currently in storage
   * 
   * @returns {number} The count of products, or 0 if none exist
   */
  getProductsCount(): number {
    return this.storageService.products()?.length || 0;
  }

  /**
   * Returns the number of currency types defined in currency settings
   * 
   * @returns {number} The count of currency types, or 0 if none exist
   */
  getCurrencyTypesCount(): number {
    const settings = this.storageService.currencySettings();
    return settings?.currencyTypes?.length || 0;
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
   * Logs an activity for display in the recent activity section
   * Keeps a limited history of the most recent operations
   * 
   * @param {ActivityLog['type']} type - The type of activity being logged
   * @param {string} message - A descriptive message about the activity
   */
  private logActivity(type: ActivityLog['type'], message: string): void {
    this.recentActivity.unshift({
      type,
      message,
      timestamp: new Date(),
    });

    // Limit the activity log to 10 entries to prevent memory issues with very long sessions
    if (this.recentActivity.length > 10) {
      this.recentActivity.pop();
    }
  }

  /**
   * Returns the appropriate Material icon name for each activity type
   * Used to visually distinguish different types of activities in the log
   * 
   * @param {string} type - The type of activity
   * @returns {string} The name of the Material icon to display
   */
  getActivityIcon(type: string): string {
    switch (type) {
      case 'import':
        return 'file_upload';
      case 'export':
        return 'file_download';
      case 'error':
        return 'error';
      case 'categories':
        return 'category';
      case 'products':
        return 'inventory_2';
      case 'currencies':
        return 'payments';
      case 'settings':
        return 'settings';
      default:
        return 'circle';
    }
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
    this.resetImportStats();
    this.isUploading = true;
    
    // Log the number of files being processed
    this.logActivity('import', `Processing ${input.files.length} selected files`);

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
    this.resetImportStats();
    this.isUploading = true;

    this.logActivity('import', `Processing ${files.length} dropped files`);

    // Process each file individually for better error handling
    this.processFiles(files);
  }

  // ----- File Processing Methods ----- //

  /**
   * Resets the import statistics to their initial state
   * Called before starting a new import operation
   */
  private resetImportStats(): void {
    this.importStats = {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      categories: 0,
      products: 0,
      currencies: 0,
      settings: 0,
    };
  }

  /**
   * Returns a user-friendly label for each data type, with pluralization support
   * 
   * @param {string} type - The data type ('categories', 'products', etc.)
   * @param {boolean} plural - Whether to use the plural form
   * @returns {string} The formatted label
   */
  private getTypeLabel(type: string, plural: boolean = false): string {
    switch (type) {
      case 'categories':
        return plural ? 'Categories' : 'Category';
      case 'products':
        return plural ? 'Products' : 'Product';
      case 'currencies':
        return 'Currency Settings';
      case 'settings':
        return 'General Settings';
      default:
        return type;
    }
  }

  /**
   * Processes one or more files for import
   * Core file processing logic that handles file type detection, parsing, and importing
   * 
   * @param {FileList} files - The files to process
   * @param {string} [typeHint] - Optional hint about the file type for better detection
   * @returns {Promise<void>} Promise that resolves when processing is complete
   */
  private async processFiles(
    files: FileList,
    typeHint?: string
  ): Promise<void> {
    const filesArray = Array.from(files);
    const totalFiles = filesArray.length;
    this.importStats.processed = totalFiles;

    // Log with type information when available
    if (typeHint) {
      this.logActivity(
        'import',
        `Processing ${totalFiles} ${this.getTypeLabel(
          typeHint,
          totalFiles > 1
        )}`
      );
    } else {
      this.logActivity('import', `Processing ${totalFiles} Files`);
    }

    // Process each file individually for better error handling and reporting
    for (const file of filesArray) {
      try {
        // If we have a type hint (from button selection), prioritize it over filename detection
        let dataType = typeHint ? this.convertTypeHint(typeHint) : this.guessTypeFromFilename(file.name);
        let data;
  
        try {
          // Parse the file contents
          data = await this.fileService.importFile(file);
          
          // Only use content detection if we don't have a type hint
          // This prevents mis-categorization when the user has explicitly selected a type
          if (!typeHint) {
            // Try to detect the type based on content structure
            const contentType = this.fileService.detectDataType(data);
            if (contentType) {
              dataType = contentType;
            }
          }
        } catch (parseError) {
          console.error(`Error parsing file ${file.name}:`, parseError);
          this.importStats.failed++;
          this.logActivity('error', `Failed to parse file: ${file.name}`);
          continue; // Skip to next file
        }

        // Process according to detected type
        switch (dataType) {
          case 'category':
            await this.fileService.importCategories(file);
            this.importStats.categories++;
            this.importStats.successful++;
            break;
          case 'product':
            await this.fileService.importProducts(file);
            this.importStats.products++;
            this.importStats.successful++;
            break;
          case 'currency':
            await this.fileService.importCurrencySettings(file);
            this.importStats.currencies++;
            this.importStats.successful++;
            break;
          case 'general':
            await this.fileService.importGeneralSettings(file);
            this.importStats.settings++;
            this.importStats.successful++;
            break;
          default:
            // File type couldn't be determined
            this.importStats.skipped++;
            const skipMessage = `File ${file.name} doesn't match any TraderPlus format`;
            console.warn(skipMessage);
            this.logActivity('error', skipMessage);
        }
      } catch (error) {
        this.importStats.failed++;
        const errorMessage = `Error processing ${file.name}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        console.error(errorMessage);
        this.logActivity('error', errorMessage);
      }
    }

    // Update UI state to reflect newly imported data
    this.checkExistingData();

    // Show appropriate notifications
    this.isUploading = false;

    // Prepare result notifications
    this.showImportResults();
  }

  /**
   * Shows appropriate notifications based on import statistics
   * Creates informative messages for successful, failed, and skipped imports
   */
  private showImportResults(): void {
    if (this.importStats.successful > 0) {
      // Create a detailed success message listing what was imported
      const successTypes = [];
      if (this.importStats.categories > 0)
        successTypes.push(`${this.importStats.categories} categories`);
      if (this.importStats.products > 0)
        successTypes.push(`${this.importStats.products} products`);
      if (this.importStats.currencies > 0)
        successTypes.push('currency settings');
      if (this.importStats.settings > 0) 
        successTypes.push('general settings');

      const successMessage = `Successfully imported ${
        this.importStats.successful
      } ${
        this.importStats.successful > 1 ? 'files' : 'file'
      } (${successTypes.join(', ')})`;

      this.notificationService.success(successMessage);
      this.logActivity('import', successMessage);
    }

    if (this.importStats.failed > 0) {
      const errorMessage = `Failed to import ${this.importStats.failed} ${
        this.importStats.failed > 1 ? 'files' : 'file'
      }`;
      this.notificationService.error(errorMessage);
      this.logActivity('error', errorMessage);
    }

    if (this.importStats.skipped > 0) {
      const skipMessage = `Skipped ${this.importStats.skipped} ${
        this.importStats.skipped > 1 ? 'files' : 'file'
      } not matching any TraderPlus format`;
      this.notificationService.warning(skipMessage);
      this.logActivity('error', skipMessage);
    }
  }

  /**
   * Converts type hints from menu selections to file type identifiers
   * Translates UI concepts (plural, human-readable) to internal type identifiers
   * 
   * @param {string} hint - The type hint from the UI
   * @returns {'category' | 'product' | 'currency' | 'general' | null} The corresponding file type
   */
  private convertTypeHint(hint: string): 'category' | 'product' | 'currency' | 'general' | null {
    switch (hint) {
      case 'categories': return 'category';
      case 'products': return 'product';
      case 'currencies': return 'currency';
      case 'settings': return 'general';
      default: return null;
    }
  }

  /**
   * Attempts to determine the file type based on filename patterns
   * Uses common naming conventions to identify file types when content analysis is ambiguous
   * 
   * @param {string} fileName - The name of the file
   * @returns {'category' | 'product' | 'currency' | 'general' | null} The best guess file type, or null if unknown
   */
  private guessTypeFromFilename(
    fileName: string
  ): 'category' | 'product' | 'currency' | 'general' | null {
    const lowerName = fileName.toLowerCase();

    // Check for category file pattern (starts with cat_ or contains category/categories)
    if (
      lowerName.startsWith('cat_') ||
      lowerName.includes('category') ||
      lowerName.includes('categories')
    ) {
      return 'category';
    }

    // Check for product file pattern (starts with prod_ or contains product/products)
    if (
      lowerName.startsWith('prod_') ||
      lowerName.includes('product') ||
      lowerName.includes('products')
    ) {
      return 'product';
    }

    // Check for currency settings (contains currency)
    if (lowerName.includes('currency')) {
      return 'currency';
    }

    // Check for general settings (contains general or settings)
    if (lowerName.includes('general') || lowerName.includes('settings')) {
      return 'general';
    }

    // File type couldn't be determined from filename
    return null;
  }

  // ----- Export Functions ----- //

  /**
   * Exports category data to a JSON file
   * Checks if categories exist before attempting export to avoid empty files
   */
  exportCategories(): void {
    if (this.storageService.categories().length === 0) {
      this.notificationService.warning('No categories to export');
      this.logActivity(
        'error',
        'Attempted to export categories but none exist'
      );
      return;
    }

    this.fileService.exportCategories();
    this.notificationService.success('Categories exported successfully');
    this.logActivity('export', 'Exported categories to file');
  }

  /**
   * Exports product data to a JSON file
   * Checks if products exist before attempting export to avoid empty files
   */
  exportProducts(): void {
    if (this.storageService.products().length === 0) {
      this.notificationService.warning('No products to export');
      this.logActivity('error', 'Attempted to export products but none exist');
      return;
    }

    this.fileService.exportProducts();
    this.notificationService.success('Products exported successfully');
    this.logActivity('export', 'Exported products to file');
  }

  /**
   * Exports currency settings to a JSON file
   * Checks if currency settings exist before attempting export to avoid empty files
   */
  exportCurrencySettings(): void {
    if (!this.storageService.currencySettings()) {
      this.notificationService.warning('No currency settings to export');
      this.logActivity(
        'error',
        'Attempted to export currency settings but none exist'
      );
      return;
    }

    this.fileService.exportCurrencySettings();
    this.notificationService.success('Currency settings exported successfully');
    this.logActivity('export', 'Exported currency settings to file');
  }

  /**
   * Exports general settings to a JSON file
   * Checks if general settings exist before attempting export to avoid empty files
   */
  exportGeneralSettings(): void {
    if (!this.storageService.generalSettings()) {
      this.notificationService.warning('No general settings to export');
      this.logActivity(
        'error',
        'Attempted to export general settings but none exist'
      );
      return;
    }

    this.fileService.exportGeneralSettings();
    this.notificationService.success('General settings exported successfully');
    this.logActivity('export', 'Exported general settings to file');
  }

  /**
   * Exports all configurations as a ZIP archive
   * Attempts to create a ZIP file containing all configuration files
   * Falls back to individual file exports if ZIP creation fails
   */
  exportAllConfigs(): void {
    // Check if there's any data to export
    if (
      !this.hasCategories &&
      !this.hasProducts &&
      !this.hasCurrencies &&
      !this.hasSettings
    ) {
      this.notificationService.warning('No configurations to export');
      this.logActivity(
        'error',
        'Attempted to export all configurations but none exist'
      );
      return;
    }

    try {
      // Attempt to create and download a ZIP archive with all configurations
      this.fileService.exportAllAsZip();
      this.notificationService.success(
        'All configurations exported as ZIP archive'
      );
      this.logActivity('export', 'Exported all configurations as ZIP archive');
    } catch (error) {
      // If ZIP creation fails (e.g., browser limitations), fall back to individual exports
      console.error('Error exporting as ZIP:', error);
      const errorMessage =
        'Could not create ZIP archive. Exporting individual files instead.';
      this.notificationService.warning(errorMessage);
      this.logActivity('error', errorMessage);

      // Fallback to individual files export
      if (this.hasCategories) {
        this.fileService.exportCategories();
        this.logActivity('export', 'Exported categories (fallback)');
      }
      if (this.hasProducts) {
        this.fileService.exportProducts();
        this.logActivity('export', 'Exported products (fallback)');
      }
      if (this.hasCurrencies) {
        this.fileService.exportCurrencySettings();
        this.logActivity('export', 'Exported currency settings (fallback)');
      }
      if (this.hasSettings) {
        this.fileService.exportGeneralSettings();
        this.logActivity('export', 'Exported general settings (fallback)');
      }
    }
  }
}
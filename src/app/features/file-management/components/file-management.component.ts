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

// Activity type for recent activity log
interface ActivityLog {
  type:
    | 'import'
    | 'export'
    | 'error'
    | 'categories'
    | 'products'
    | 'currencies'
    | 'settings';
  message: string;
  timestamp: Date;
}

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
  private fileService = inject(FileService);
  private storageService = inject(StorageService);
  private notificationService = inject(NotificationService);

  // References to hidden file inputs
  @ViewChild('categoriesInput') categoriesInput!: ElementRef<HTMLInputElement>;
  @ViewChild('productsInput') productsInput!: ElementRef<HTMLInputElement>;
  @ViewChild('currenciesInput') currenciesInput!: ElementRef<HTMLInputElement>;
  @ViewChild('settingsInput') settingsInput!: ElementRef<HTMLInputElement>;

  isDragging = false;
  isUploading = false;
  hasCategories = false;
  hasProducts = false;
  hasCurrencies = false;
  hasSettings = false;

  // Recent activity log
  recentActivity: ActivityLog[] = [];

  // Track import statistics for better user feedback
  importStats = {
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    categories: 0,
    products: 0,
    currencies: 0,
    settings: 0,
  };

  ngOnInit(): void {
    // Check for existing data
    this.checkExistingData();

    // Add initial log entry
    this.logActivity('import', 'Application initialized');
  }

  /**
   * Check if there's existing data in storage
   */
  private checkExistingData(): void {
    this.hasCategories = this.storageService.categories()?.length > 0;
    this.hasProducts = this.storageService.products()?.length > 0;
    this.hasCurrencies = !!this.storageService.currencySettings();
    this.hasSettings = !!this.storageService.generalSettings();
  }

  /**
   * Get count of categories for display
   */
  getCategoriesCount(): number {
    return this.storageService.categories()?.length || 0;
  }

  /**
   * Get count of products for display
   */
  getProductsCount(): number {
    return this.storageService.products()?.length || 0;
  }

  /**
   * Get count of currency types for display
   */
  getCurrencyTypesCount(): number {
    const settings = this.storageService.currencySettings();
    return settings?.currencyTypes?.length || 0;
  }

  /**
   * Check if any data exists
   */
  hasAnyData(): boolean {
    return (
      this.hasCategories ||
      this.hasProducts ||
      this.hasCurrencies ||
      this.hasSettings
    );
  }

  /**
   * Trigger the appropriate file input based on type
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
   * Log an activity for display in the recent activity section
   */
  private logActivity(type: ActivityLog['type'], message: string): void {
    this.recentActivity.unshift({
      type,
      message,
      timestamp: new Date(),
    });

    // Limit the activity log to 10 entries
    if (this.recentActivity.length > 10) {
      this.recentActivity.pop();
    }
  }

  /**
   * Get appropriate icon for activity type
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

  /**
   * Handle file selection for import
   */
  onFileSelected(event: Event, type: string): void {
    const input = event.target as HTMLInputElement;

    if (!input.files?.length) {
      return;
    }

    this.processFiles(input.files, type);

    // Reset the input so that selecting the same file again will trigger the event.
    input.value = '';
  }

  /**
   * Handle drag events for drag and drop functionality
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

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

  /**
   * Reset import statistics
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

  private getTypeLabel(type: string, plural: boolean = false): string {
    switch (type) {
      case 'categories':
        return plural ? 'Categories' : 'Category';
      case 'products':
        return plural ? 'Products' : 'Product';
      case 'currencies':
        return 'Currrency Settings';
      case 'settings':
        return 'General Settings';
      default:
        return type;
    }
  }

  /**
   * Process files by examining their content
   */
  private async processFiles(
    files: FileList,
    typeHint?: string
  ): Promise<void> {
    const filesArray = Array.from(files);
    const totalFiles = filesArray.length;
    this.importStats.processed = totalFiles;

    // Logging mit Typinformation wenn verfügbar
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

    // Process according to detected type
    for (const file of filesArray) {
      try {
        // If we have a type hint and this is button-triggered import, 
        // prioritize the hint over filename detection
        let dataType = typeHint ? this.convertTypeHint(typeHint) : this.guessTypeFromFilename(file.name);
        let data;
  
        try {
          // Parse the file contents
          data = await this.fileService.importFile(file);
          
          // Only use content detection if we don't have a type hint
          if (!typeHint) {
            // Try to detect the type based on content
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

    // Update UI state
    this.checkExistingData();

    // Show appropriate notifications
    this.isUploading = false;

    if (this.importStats.successful > 0) {
      // Create a detailed success message
      const successTypes = [];
      if (this.importStats.categories > 0)
        successTypes.push(`${this.importStats.categories} categories`);
      if (this.importStats.products > 0)
        successTypes.push(`${this.importStats.products} products`);
      if (this.importStats.currencies > 0)
        successTypes.push('currency settings');
      if (this.importStats.settings > 0) successTypes.push('general settings');

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
   * Convert type hint from menu selection to file type
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
   * Try to determine the file type based on filename
   * This helps when JSON validation is ambiguous
   */
  private guessTypeFromFilename(
    fileName: string
  ): 'category' | 'product' | 'currency' | 'general' | null {
    const lowerName = fileName.toLowerCase();

    // Check for category file pattern (starts with cat_)
    if (
      lowerName.startsWith('cat_') ||
      lowerName.includes('category') ||
      lowerName.includes('categories')
    ) {
      return 'category';
    }

    // Check for product file pattern (starts with prod_)
    if (
      lowerName.startsWith('prod_') ||
      lowerName.includes('product') ||
      lowerName.includes('products')
    ) {
      return 'product';
    }

    // Check for currency settings
    if (lowerName.includes('currency')) {
      return 'currency';
    }

    // Check for general settings
    if (lowerName.includes('general') || lowerName.includes('settings')) {
      return 'general';
    }

    return null;
  }

  /**
   * Export categories
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
   * Export products
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
   * Export currency settings
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
   * Export general settings
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
   * Export all configurations as a ZIP archive
   */
  exportAllConfigs(): void {
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
      this.fileService.exportAllAsZip();
      this.notificationService.success(
        'All configurations exported as ZIP archive'
      );
      this.logActivity('export', 'Exported all configurations as ZIP archive');
    } catch (error) {
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

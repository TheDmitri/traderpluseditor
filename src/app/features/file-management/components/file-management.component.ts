import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FileService, StorageService } from '../../../core/services';
import { NotificationService } from '../../../shared/services/notification.service';

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
  ],
  templateUrl: './file-management.component.html',
  styleUrls: ['./file-management.component.scss'],
})
export class FileManagementComponent implements OnInit {
  private fileService = inject(FileService);
  private storageService = inject(StorageService);
  private notificationService = inject(NotificationService);

  isDragging = false;
  isUploading = false;
  hasCategories = false;
  hasProducts = false;
  hasCurrencies = false;
  hasSettings = false;
  
  // Track import statistics for better user feedback
  importStats = {
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    categories: 0,
    products: 0,
    currencies: 0,
    settings: 0
  };

  ngOnInit(): void {
    // Check for existing data
    this.checkExistingData();
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
   * Process the uploaded files
   */
  private processFiles(files: FileList, type: string): void {
    this.isUploading = true;
    // Reset statistics
    this.resetImportStats();

    switch (type) {
      case 'categories':
        if (files.length > 1) {
          this.fileService
            .importMultipleCategories(files)
            .then(() => {
              this.hasCategories = true;
              this.notificationService.success(
                'Categories imported successfully'
              );
              this.checkExistingData();
            })
            .catch((error) => {
              this.notificationService.error(
                `Failed to import categories: ${error.message}`
              );
            })
            .finally(() => {
              this.isUploading = false;
            });
        } else {
          this.fileService
            .importCategories(files[0])
            .then(() => {
              this.hasCategories = true;
              this.notificationService.success(
                'Categories imported successfully'
              );
              this.checkExistingData();
            })
            .catch((error) => {
              this.notificationService.error(
                `Failed to import categories: ${error.message}`
              );
            })
            .finally(() => {
              this.isUploading = false;
            });
        }
        break;
      case 'products':
        if (files.length > 1) {
          this.fileService
            .importMultipleProducts(files)
            .then(() => {
              this.hasProducts = true;
              this.notificationService.success(
                'Products imported successfully'
              );
              this.checkExistingData();
            })
            .catch((error) => {
              this.notificationService.error(
                `Failed to import products: ${error.message}`
              );
            })
            .finally(() => {
              this.isUploading = false;
            });
        } else {
          this.fileService
            .importProducts(files[0])
            .then(() => {
              this.hasProducts = true;
              this.notificationService.success(
                'Products imported successfully'
              );
              this.checkExistingData();
            })
            .catch((error) => {
              this.notificationService.error(
                `Failed to import products: ${error.message}`
              );
            })
            .finally(() => {
              this.isUploading = false;
            });
        }
        break;
      case 'currencies':
        this.fileService
          .importCurrencySettings(files[0])
          .then(() => {
            this.hasCurrencies = true;
            this.notificationService.success(
              'Currency settings imported successfully'
            );
            this.checkExistingData();
          })
          .catch((error) => {
            this.notificationService.error(
              `Failed to import currency settings: ${error.message}`
            );
          })
          .finally(() => {
            this.isUploading = false;
          });
        break;
      case 'settings':
        this.fileService
          .importGeneralSettings(files[0])
          .then(() => {
            this.hasSettings = true;
            this.notificationService.success(
              'General settings imported successfully'
            );
            this.checkExistingData();
          })
          .catch((error) => {
            this.notificationService.error(
              `Failed to import general settings: ${error.message}`
            );
          })
          .finally(() => {
            this.isUploading = false;
          });
        break;
      default:
        this.notificationService.error('Unknown import type');
        this.isUploading = false;
    }
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
    
    // Process each file individually for better error handling
    this.processDroppedFiles(files);
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
      settings: 0
    };
  }

  /**
   * Process dropped files by examining their content
   */
  private async processDroppedFiles(files: FileList): Promise<void> {
    const filesArray = Array.from(files);
    const totalFiles = filesArray.length;
    this.importStats.processed = totalFiles;
    
    // Process each file
    for (const file of filesArray) {
      try {
        // First check if the filename helps identify the type
        let initialType = this.guessTypeFromFilename(file.name);
        let data;
        let dataType;
        
        try {
          // Parse the file contents
          data = await this.fileService.importFile(file);
          // Detect the type based on content
          dataType = this.fileService.detectDataType(data);
          
          // If we couldn't detect from content but have a filename guess, use that
          if (!dataType && initialType) {
            dataType = initialType;
            console.log(`Using filename to guess type: ${initialType} for ${file.name}`);
          }
        } catch (parseError) {
          console.error(`Error parsing file ${file.name}:`, parseError);
          this.importStats.failed++;
          continue; // Skip to next file
        }

        // Process according to detected type
        switch(dataType) {
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
            console.warn(`File ${file.name} doesn't match any TraderPlus format`);
        }
      } catch (error) {
        this.importStats.failed++;
        console.error(`Error processing ${file.name}:`, error);
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
      if (this.importStats.settings > 0) 
        successTypes.push('general settings');
      
      const successMessage = `Successfully imported ${this.importStats.successful} ${
        this.importStats.successful > 1 ? 'files' : 'file'
      } (${successTypes.join(', ')})`;
      
      this.notificationService.success(successMessage);
    }
    
    if (this.importStats.failed > 0) {
      this.notificationService.error(
        `Failed to import ${this.importStats.failed} ${
          this.importStats.failed > 1 ? 'files' : 'file'
        }. Check console for details.`
      );
    }
    
    if (this.importStats.skipped > 0) {
      this.notificationService.warning(
        `Skipped ${this.importStats.skipped} ${
          this.importStats.skipped > 1 ? 'files' : 'file'
        } not matching any TraderPlus format`
      );
    }
  }

  /**
   * Try to determine the file type based on filename
   * This helps when JSON validation is ambiguous
   */
  private guessTypeFromFilename(fileName: string): 'category' | 'product' | 'currency' | 'general' | null {
    const lowerName = fileName.toLowerCase();
    
    // Check for category file pattern (starts with cat_)
    if (lowerName.startsWith('cat_') || lowerName.includes('category') || lowerName.includes('categories')) {
      return 'category';
    }
    
    // Check for product file pattern (starts with prod_)
    if (lowerName.startsWith('prod_') || lowerName.includes('product') || lowerName.includes('products')) {
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
      return;
    }

    this.fileService.exportCategories();
    this.notificationService.success('Categories exported successfully');
  }

  /**
   * Export products
   */
  exportProducts(): void {
    if (this.storageService.products().length === 0) {
      this.notificationService.warning('No products to export');
      return;
    }

    this.fileService.exportProducts();
    this.notificationService.success('Products exported successfully');
  }

  /**
   * Export currency settings
   */
  exportCurrencySettings(): void {
    if (!this.storageService.currencySettings()) {
      this.notificationService.warning('No currency settings to export');
      return;
    }

    this.fileService.exportCurrencySettings();
    this.notificationService.success('Currency settings exported successfully');
  }

  /**
   * Export general settings
   */
  exportGeneralSettings(): void {
    if (!this.storageService.generalSettings()) {
      this.notificationService.warning('No general settings to export');
      return;
    }

    this.fileService.exportGeneralSettings();
    this.notificationService.success('General settings exported successfully');
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
      return;
    }

    try {
      this.fileService.exportAllAsZip();
      this.notificationService.success('All configurations exported as ZIP archive');
    } catch (error) {
      console.error('Error exporting as ZIP:', error);
      
      // Fallback to individual files export
      this.notificationService.warning(
        'Could not create ZIP archive. Exporting individual files instead.'
      );
      
      if (this.hasCategories) this.fileService.exportCategories();
      if (this.hasProducts) this.fileService.exportProducts();
      if (this.hasCurrencies) this.fileService.exportCurrencySettings();
      if (this.hasSettings) this.fileService.exportGeneralSettings();
    }
  }
}
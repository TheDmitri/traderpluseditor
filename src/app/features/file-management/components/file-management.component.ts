import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { FileService, StorageService } from '../../../core/services';

@Component({
  selector: 'app-file-management',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatDividerModule
  ],
  templateUrl: './file-management.component.html',
  styleUrls: ['./file-management.component.scss']
})
export class FileManagementComponent {
  private fileService = inject(FileService);
  private storageService = inject(StorageService);
  private snackBar = inject(MatSnackBar);
  
  /**
   * Handle file selection for import
   */
  onFileSelected(event: Event, type: string): void {
    const input = event.target as HTMLInputElement;
    
    if (!input.files?.length) {
      return;
    }
    
    const files = input.files;
    
    switch (type) {
      case 'categories':
        if (files.length > 1) {
          this.fileService.importMultipleCategories(files)
            .then(() => {
              this.showSuccess('Categories imported successfully');
            })
            .catch(error => {
              this.showError(`Failed to import categories: ${error.message}`);
            });
        } else {
          this.fileService.importCategories(files[0])
            .then(() => {
              this.showSuccess('Categories imported successfully');
            })
            .catch(error => {
              this.showError(`Failed to import categories: ${error.message}`);
            });
        }
        break;
      case 'products':
        this.fileService.importProducts(files[0])
          .then(() => {
            this.showSuccess('Products imported successfully');
          })
          .catch(error => {
            this.showError(`Failed to import products: ${error.message}`);
          });
        break;
      case 'currencies':
        this.fileService.importCurrencySettings(files[0])
          .then(() => {
            this.showSuccess('Currency settings imported successfully');
          })
          .catch(error => {
            this.showError(`Failed to import currency settings: ${error.message}`);
          });
        break;
      case 'settings':
        this.fileService.importGeneralSettings(files[0])
          .then(() => {
            this.showSuccess('General settings imported successfully');
          })
          .catch(error => {
            this.showError(`Failed to import general settings: ${error.message}`);
          });
        break;
      default:
        this.showError('Unknown import type');
    }
    
    // Reset the input so that selecting the same file again will trigger the event.
    input.value = '';
  }
  
  /**
   * Export categories
   */
  exportCategories(): void {
    if (this.storageService.categories().length === 0) {
      this.showWarning('No categories to export');
      return;
    }
    
    this.fileService.exportCategories();
    this.showSuccess('Categories exported successfully');
  }
  
  /**
   * Export products
   */
  exportProducts(): void {
    if (this.storageService.products().length === 0) {
      this.showWarning('No products to export');
      return;
    }
    
    this.fileService.exportProducts();
    this.showSuccess('Products exported successfully');
  }
  
  /**
   * Export currency settings
   */
  exportCurrencySettings(): void {
    if (!this.storageService.currencySettings()) {
      this.showWarning('No currency settings to export');
      return;
    }
    
    this.fileService.exportCurrencySettings();
    this.showSuccess('Currency settings exported successfully');
  }
  
  /**
   * Export general settings
   */
  exportGeneralSettings(): void {
    if (!this.storageService.generalSettings()) {
      this.showWarning('No general settings to export');
      return;
    }
    
    this.fileService.exportGeneralSettings();
    this.showSuccess('General settings exported successfully');
  }
  
  /**
   * Show success message
   */
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: 'success-snackbar'
    });
  }
  
  /**
   * Show warning message
   */
  private showWarning(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: 'warning-snackbar'
    });
  }
  
  /**
   * Show error message
   */
  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: 'error-snackbar'
    });
  }
}

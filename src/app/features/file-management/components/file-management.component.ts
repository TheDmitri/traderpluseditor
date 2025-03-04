import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
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
    MatDividerModule
  ],
  templateUrl: './file-management.component.html',
  styleUrls: ['./file-management.component.scss'],
})
export class FileManagementComponent {
  private fileService = inject(FileService);
  private storageService = inject(StorageService);
  private notificationService = inject(NotificationService);

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
          this.fileService
            .importMultipleCategories(files)
            .then(() => {
              this.notificationService.success(
                'Categories imported successfully'
              );
            })
            .catch((error) => {
              this.notificationService.error(
                `Failed to import categories: ${error.message}`
              );
            });
        } else {
          this.fileService
            .importCategories(files[0])
            .then(() => {
              this.notificationService.success(
                'Categories imported successfully'
              );
            })
            .catch((error) => {
              this.notificationService.error(
                `Failed to import categories: ${error.message}`
              );
            });
        }
        break;
      case 'products':
        if (files.length > 1) {
          this.fileService
            .importMultipleProducts(files)
            .then(() => {
              this.notificationService.success(
                'Products imported successfully'
              );
            })
            .catch((error) => {
              this.notificationService.error(
                `Failed to import products: ${error.message}`
              );
            });
        } else {
          this.fileService
            .importProducts(files[0])
            .then(() => {
              this.notificationService.success(
                'Products imported successfully'
              );
            })
            .catch((error) => {
              this.notificationService.error(
                `Failed to import products: ${error.message}`
              );
            });
        }
        break;
      case 'currencies':
        this.fileService
          .importCurrencySettings(files[0])
          .then(() => {
            this.notificationService.success(
              'Currency settings imported successfully'
            );
          })
          .catch((error) => {
            this.notificationService.error(
              `Failed to import currency settings: ${error.message}`
            );
          });
        break;
      case 'settings':
        this.fileService
          .importGeneralSettings(files[0])
          .then(() => {
            this.notificationService.success(
              'General settings imported successfully'
            );
          })
          .catch((error) => {
            this.notificationService.error(
              `Failed to import general settings: ${error.message}`
            );
          });
        break;
      default:
        this.notificationService.error('Unknown import type');
    }

    // Reset the input so that selecting the same file again will trigger the event.
    input.value = '';
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
}

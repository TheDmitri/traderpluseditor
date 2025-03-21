import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';

// Application imports
import { GeneralSettings, TraderObject } from '../../../core/models';
import { StorageService } from '../../../core/services';
import { ConfirmDialogComponent } from '../../../shared/components';
import { NotificationService } from '../../../shared/services';

/**
 * Service for managing trader objects in general settings
 */
@Injectable({
  providedIn: 'root',
})
export class ObjectsService {
  constructor(
    private storageService: StorageService,
    private dialog: MatDialog,
    private notificationService: NotificationService
  ) {}

  /**
   * Get all trader objects from general settings
   * @returns Array of trader objects or empty array if none exists
   */
  getTraderObjects(): TraderObject[] {
    const settings = this.storageService.generalSettings();
    return settings?.traderObjects || [];
  }

  /**
   * Get trader objects as MatTableDataSource for display
   * @returns MatTableDataSource containing trader objects
   */
  getObjectsDataSource(): MatTableDataSource<TraderObject> {
    return new MatTableDataSource<TraderObject>(this.getTraderObjects());
  }

  /**
   * Add a new trader object to settings
   * @param object The trader object to add
   * @returns True if successful
   */
  addObjectToSettings(object: TraderObject): boolean {
    try {
      const settings = this.storageService.generalSettings();
      if (!settings) return false;

      // Add the new object to the existing array
      settings.traderObjects.push(object);
      
      // Save updated settings
      this.storageService.saveGeneralSettings(settings);
      return true;
    } catch (error) {
      console.error('Error adding trader object:', error);
      return false;
    }
  }

  /**
   * Update an existing trader object
   * @param index The index of the object to update
   * @param updatedObject The updated object data
   * @returns True if successful
   */
  updateObject(index: number, updatedObject: TraderObject): boolean {
    try {
      const settings = this.storageService.generalSettings();
      if (!settings || !settings.traderObjects[index]) return false;

      // Update the object at the specified index
      settings.traderObjects[index] = updatedObject;
      
      // Save updated settings
      this.storageService.saveGeneralSettings(settings);
      return true;
    } catch (error) {
      console.error('Error updating trader object:', error);
      return false;
    }
  }

  /**
   * Delete a trader object after confirmation
   * @param index The index of the object to delete
   * @returns Promise resolving to updated data source
   */
  deleteObjectWithConfirmation(index: number): Promise<MatTableDataSource<TraderObject>> {
    return new Promise((resolve) => {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Delete Object',
          message: 'Are you sure you want to delete this trader object? \n\nThis cannot be undone.',
          confirmText: 'Delete',
          cancelText: 'Cancel',
          type: 'danger',
        },
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          // User confirmed deletion
          const settings = this.storageService.generalSettings();
          if (!settings) {
            resolve(new MatTableDataSource<TraderObject>([]));
            return;
          }

          // Remove the object at the specified index
          settings.traderObjects.splice(index, 1);
          
          // Save updated settings
          this.storageService.saveGeneralSettings(settings);
          
          // Show success notification
          this.notificationService.success('Trader object deleted successfully');
          
          // Return updated data source
          resolve(new MatTableDataSource<TraderObject>(settings.traderObjects));
        } else {
          // User cancelled, return unchanged data source
          resolve(this.getObjectsDataSource());
        }
      });
    });
  }

  /**
   * Delete all trader objects after confirmation
   * @returns Promise resolving to updated data source
   */
  deleteAllObjectsWithConfirmation(): Promise<MatTableDataSource<TraderObject>> {
    return new Promise((resolve) => {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Delete All Objects',
          message: 'Are you sure you want to delete all trader objects? \n\nThis cannot be undone.',
          confirmText: 'Delete All',
          cancelText: 'Cancel',
          type: 'danger',
        },
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          // User confirmed deletion
          const settings = this.storageService.generalSettings();
          if (!settings) {
            resolve(new MatTableDataSource<TraderObject>([]));
            return;
          }

          // Clear all objects
          settings.traderObjects = [];
          
          // Save updated settings
          this.storageService.saveGeneralSettings(settings);
          
          // Show success notification
          this.notificationService.success('All trader objects deleted successfully');
          
          // Return empty data source
          resolve(new MatTableDataSource<TraderObject>([]));
        } else {
          // User cancelled, return unchanged data source
          resolve(this.getObjectsDataSource());
        }
      });
    });
  }

  /**
   * Format position or orientation array for display
   * @param values The position or orientation array [x, y, z]
   * @returns Formatted string
   */
  formatVector(values: number[]): string {
    if (!values || values.length !== 3) return 'Invalid values';
    return `X: ${values[0].toFixed(1)}, Y: ${values[1].toFixed(1)}, Z: ${values[2].toFixed(1)}`;
  }
}

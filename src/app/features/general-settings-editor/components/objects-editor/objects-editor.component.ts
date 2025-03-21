import { Component, Input, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';

// Application imports
import { GeneralSettings, TraderObject } from '../../../../core/models';
import { ObjectsService } from '../../services/objects.service';
import { NotificationService } from '../../../../shared/services';
import { ObjectModalComponent } from './object-modal/object-modal.component';

@Component({
  selector: 'app-objects-editor',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatDialogModule,
    MatTooltipModule,
    MatSortModule,
    MatPaginatorModule
  ],
  templateUrl: './objects-editor.component.html',
  styleUrls: ['./objects-editor.component.scss']
})
export class ObjectsEditorComponent implements OnInit, AfterViewInit {
  @Input() hasSettings = false;
  @Input() generalSettings: GeneralSettings | null = null;

  // Data source for the object table
  objectsDataSource = new MatTableDataSource<TraderObject>([]);
  
  // Columns to display in the table
  displayedColumns: string[] = ['className', 'position', 'orientation', 'actions'];
  
  // References for table pagination and sorting
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  
  constructor(
    private objectsService: ObjectsService,
    private notificationService: NotificationService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    if (this.hasSettings) {
      this.loadObjects();
    }
  }

  ngAfterViewInit(): void {
    if (this.paginator && this.sort) {
      this.setupObjectsTable();
    }
  }

  /**
   * Load objects from the service
   */
  loadObjects(): void {
    this.objectsDataSource = this.objectsService.getObjectsDataSource();
    this.setupObjectsTable();
  }

  /**
   * Apply pagination and sorting to objects table
   */
  setupObjectsTable(): void {
    if (this.objectsDataSource && this.paginator && this.sort) {
      this.objectsDataSource.paginator = this.paginator;
      this.objectsDataSource.sort = this.sort;
    }
  }

  /**
   * Open dialog to add a new trader object
   */
  openAddObjectDialog(): void {
    const dialogRef = this.dialog.open(ObjectModalComponent, {
      data: { object: null }
    });

    dialogRef.afterClosed().subscribe((object: TraderObject) => {
      if (object) {
        if (this.objectsService.addObjectToSettings(object)) {
          this.objectsDataSource = this.objectsService.getObjectsDataSource();
          this.setupObjectsTable();
          this.notificationService.success('Trader object added successfully');
        } else {
          this.notificationService.error('Failed to add trader object');
        }
      }
    });
  }

  /**
   * Open dialog to edit an existing trader object
   * @param object The object to edit
   * @param index The index of the object in the array
   */
  openEditObjectDialog(object: TraderObject, index: number): void {
    const dialogRef = this.dialog.open(ObjectModalComponent, {
      data: { object: {...object} }
    });

    dialogRef.afterClosed().subscribe((updatedObject: TraderObject) => {
      if (updatedObject) {
        if (this.objectsService.updateObject(index, updatedObject)) {
          this.objectsDataSource = this.objectsService.getObjectsDataSource();
          this.setupObjectsTable();
          this.notificationService.success('Trader object updated successfully');
        } else {
          this.notificationService.error('Failed to update trader object');
        }
      }
    });
  }

  /**
   * Delete a trader object after confirmation
   * @param index The index of the object to delete
   */
  async deleteObject(index: number): Promise<void> {
    this.objectsDataSource = await this.objectsService.deleteObjectWithConfirmation(index);
    this.setupObjectsTable();
  }

  /**
   * Delete all trader objects after confirmation
   */
  async deleteAllObjects(): Promise<void> {
    this.objectsDataSource = await this.objectsService.deleteAllObjectsWithConfirmation();
    this.setupObjectsTable();
  }

  /**
   * Format position coordinates for display
   * @param position The position array [x, y, z]
   * @returns Formatted position string
   */
  formatPosition(position: number[]): string {
    return this.objectsService.formatVector(position);
  }

  /**
   * Format orientation values for display
   * @param orientation The orientation array [x, y, z]
   * @returns Formatted orientation string
   */
  formatOrientation(orientation: number[]): string {
    return this.objectsService.formatVector(orientation);
  }
}

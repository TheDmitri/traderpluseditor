import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

// Application imports
import { CurrencySettings, CurrencyType } from '../../../core/models';
import { InitializationService, StorageService } from '../../../core/services';
import { ConfirmDialogComponent, LoaderComponent } from '../../../shared/components';
import { NotificationService } from '../../../shared/services';
import { CurrencyService } from '../services';
import { CurrencyModalComponent } from './currency-modal/currency-modal.component';

/**
 * CurrencyEditorComponent handles the management of TraderPlus currencies.
 *
 * This component provides a comprehensive interface for managing the in-game currency system:
 * - View and filter currency types in a paginated, sortable table
 * - Create, edit, and delete currency types
 * - Manage individual currencies within each currency type
 */
@Component({
  selector: 'app-currency-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatCardModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatDialogModule,
    RouterModule,
    LoaderComponent,
  ],
  providers: [InitializationService, CurrencyService],
  templateUrl: './currency-editor.component.html',
  styleUrls: ['./currency-editor.component.scss'],
})
export class CurrencyEditorComponent implements OnInit, OnDestroy, AfterViewInit {
  /** Subject for handling component destruction and unsubscribing from observables */
  private destroy$ = new Subject<void>();

  /** Data source for the Material table, containing all currency type entries */
  dataSource: MatTableDataSource<CurrencyType>;

  /** Defines which columns appear in the main currency types table and their order */
  displayedColumns: string[] = [
    'currencyName',
    'currencyCount',
    'actions',
  ];
  
  /** Defines which columns appear in the nested currencies table and their order */
  currencyColumns: string[] = [
    'className',
    'value',
    'actions',
  ];

  /** Reference to the paginator component for handling table pagination */
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  /** Reference to the sort directive for handling column sorting */
  @ViewChild(MatSort) sort!: MatSort;

  /** Reference to the current active input field for editing currency names */
  @ViewChildren('currencyNameInput') currencyNameInputs!: QueryList<ElementRef>;

  /** Flag indicating whether any currency types exist in the system */
  hasCurrencyTypes = false;
  
  /** Tracks if we had currency types before the last update */
  private hadCurrencyTypesBefore = false;
  
  /** Currently selected currency type for detailed view (null when collapsed) */
  expandedCurrencyType: CurrencyType | null = null;
  
  /** Complete currency configuration containing all currency types and settings */
  currencySettings: CurrencySettings | null = null;

  /** Reference to the currency type currently being edited (null when not in edit mode) */
  currentlyEditing: any = null;

  /** Temporary storage for the name being edited to prevent direct mutation */
  editableName: string = '';

  /** Flag indicating whether a new currency type is being created */
  isNewMode: boolean = false;

  /** Flag indicating if the current edit has a name error */
  hasNameError = false;

  /** Error message for name validation */
  nameErrorMessage = '';

  /** Flag indicating whether standard currencies are being created */
  isCreatingStandardCurrencies = false;

  /**
   * Initializes the component with required services for data management,
   * user interactions, and notifications.
   */
  constructor(
    private storageService: StorageService,
    private dialog: MatDialog,
    private notificationService: NotificationService,
    private initializationService: InitializationService,
    private currencyService: CurrencyService,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.dataSource = new MatTableDataSource<CurrencyType>([]);
  }

  /**
   * Initializes the component by loading currency settings from service.
   */
  ngOnInit(): void {
    this.loadCurrencySettings();
  }

  /**
   * Sets up table functionality after view initialization.
   * Configures pagination, sorting, and custom UI enhancements.
   */
  ngAfterViewInit(): void {
    this.connectTableControls();

    // Initialize ripple effects after DOM is fully rendered
    setTimeout(() => {
      this.initializationService.initializeCustomRipples();
    });
  }

  /**
   * Connect the table's paginator and sort components to the data source
   * Should be called any time we need to re-initialize these connections
   */
  private connectTableControls(): void {
    if (this.paginator && this.sort) {
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
    }
  }

  /**
   * Retrieves currency settings from service and updates the component state.
   */
  loadCurrencySettings(): void {
    // Store the previous state before loading new data
    this.hadCurrencyTypesBefore = this.hasCurrencyTypes;
    
    this.currencySettings = this.currencyService.loadCurrencySettings();
    
    if (this.currencySettings) {
      this.hasCurrencyTypes = this.currencySettings.currencyTypes.length > 0;
      this.dataSource.data = this.currencySettings.currencyTypes;
    } else {
      this.hasCurrencyTypes = false;
      this.dataSource.data = [];
    }

    // If we've transitioned from no currencies to having currencies,
    // we need to re-initialize the table controls and trigger change detection
    if (!this.hadCurrencyTypesBefore && this.hasCurrencyTypes) {
      // Give Angular time to render the table before connecting controls
      setTimeout(() => {
        this.connectTableControls();
        this.changeDetectorRef.detectChanges();
      });
    }
  }

  /**
   * Filters the currency types table based on user input.
   * @param event - Input event containing the search text
   */
  applyFilter(event: Event): void {
    if (!this.hasCurrencyTypes) return;

    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }

    if (
      this.dataSource.filteredData.length === 0 &&
      this.dataSource.data.length > 0
    ) {
      this.notificationService.error('No currency types match the search criteria');
    }
  }

  /**
   * Gets the number of currencies in a currency type from the service
   * @param currencyType The currency type to analyze
   */
  getCurrencyCount(currencyType: CurrencyType): number {
    return this.currencyService.getCurrencyCount(currencyType);
  }

  /**
   * Opens a modal dialog for managing currencies within a specific currency type.
   * @param currencyType - The currency type whose currencies will be edited
   */
  openCurrencyModal(currencyType: CurrencyType): void {
    // Don't allow opening modal if already editing
    if (this.currentlyEditing !== null) {
      return;
    }
    
    const dialogRef = this.dialog.open(CurrencyModalComponent, {
      width: '700px',
      data: { currencyType: structuredClone(currencyType) },
      disableClose: true,
      autoFocus: true,
    });

    dialogRef.afterClosed().subscribe((result: CurrencyType | undefined) => {
      if (result && this.currencySettings) {
        // Update the currency settings with the updated currency type
        this.currencySettings = this.currencyService.updateCurrencyType(
          this.currencySettings,
          result
        );
        
        // Reload data
        this.loadCurrencySettings();
        this.notificationService.success('Currencies updated successfully');
      }
    });
  }

  /**
   * Creates a new currency type and immediately enters edit mode.
   */
  addCurrencyType(): void {
    // Don't add if already editing
    if (this.currentlyEditing !== null) {
      return;
    }
    
    // Create a new currency type using the service
    const newCurrencyType = this.currencyService.createNewCurrencyType();
    
    // Insert at beginning of data array
    const currentData = this.dataSource.data;
    this.dataSource.data = this.currencyService.addCurrencyType(newCurrencyType, currentData);
    
    // Immediately start editing the new currency type
    this.currentlyEditing = newCurrencyType;
    this.editableName = newCurrencyType.currencyName;
    this.isNewMode = true;
    
    // Always set hasCurrencyTypes to true when adding a new currency
    this.hasCurrencyTypes = true;
    
    // Focus on the input field after Angular has updated the view
    setTimeout(() => {
      this.focusOnInput();
    });
  }

  /**
   * Enters edit mode for an existing currency type.
   * @param currencyType - The currency type to be edited
   */
  editCurrencyType(currencyType: CurrencyType): void {
    // Don't start editing if already editing something else
    if (this.currentlyEditing !== null) {
      return;
    }
    
    this.currentlyEditing = currencyType;
    this.editableName = currencyType.currencyName;
    this.isNewMode = false;
  }

  /**
   * Checks if a currency type name already exists using the service
   */
  isCurrencyTypeNameDuplicate(name: string, excludeCurrencyType?: CurrencyType): boolean {
    if (!this.currencySettings) return false;
    return this.currencyService.isCurrencyTypeNameDuplicate(
      name, 
      this.currencySettings, 
      excludeCurrencyType
    );
  }

  /**
   * Validates if current name is valid using service validation
   */
  isValidName(): boolean {
    if (!this.currencySettings) return false;
    
    const validation = this.currencyService.validateCurrencyTypeName(
      this.editableName,
      this.currencySettings,
      this.isNewMode ? undefined : this.currentlyEditing
    );
    
    this.hasNameError = !validation.isValid;
    this.nameErrorMessage = validation.errorMessage;
    return validation.isValid;
  }

  /**
   * Validates currency type name before saving.
   * @param name - The name to validate
   * @param currencyType - The currency type being edited
   */
  validateCurrencyName(name: string, currencyType?: CurrencyType): boolean {
    if (!this.currencySettings) return false;
    
    const validation = this.currencyService.validateCurrencyTypeName(
      name,
      this.currencySettings,
      currencyType
    );
    
    this.hasNameError = !validation.isValid;
    this.nameErrorMessage = validation.errorMessage;
    
    if (!validation.isValid) {
      this.notificationService.error(validation.errorMessage);
    }
    
    return validation.isValid;
  }

  /**
   * Persists changes to a currency type's name using the service.
   * @param currencyType - The currency type being saved
   */
  saveCurrencyEdit(currencyType: CurrencyType): void {
    if (!this.isValidName()) {
      return;
    }

    // Save the changes using the service
    this.currencySettings = this.currencyService.saveCurrencyType(
      currencyType,
      this.editableName,
      this.isNewMode
    );
    
    // Show appropriate success message
    if (this.isNewMode) {
      this.notificationService.success('New currency type created successfully');
    } else {
      this.notificationService.success('Currency name updated successfully');
    }
    
    // Reset edit state and refresh the table
    this.resetEditState();
    this.dataSource.data = [...this.dataSource.data];
  }

  /**
   * Abandons the current edit operation.
   * Uses service to handle cancellation logic.
   */
  cancelEdit(): void {
    if (!this.currentlyEditing) return;
    
    const result = this.currencyService.cancelCurrencyTypeEdit(
      this.currentlyEditing,
      this.isNewMode,
      this.dataSource.data
    );
    
    this.dataSource.data = result.updatedData;
    this.currencySettings = result.updatedSettings;
    this.hasCurrencyTypes = result.updatedData.length > 0;
    
    this.resetEditState();
  }

  /**
   * Cleans up the edit state variables.
   * Called after save or cancel operations to reset the UI.
   */
  private resetEditState(): void {
    this.currentlyEditing = null;
    this.editableName = '';
    this.isNewMode = false;
    this.hasNameError = false;
    this.nameErrorMessage = '';
  }

  /**
   * Deletes a currency type after user confirmation using the service.
   * @param currencyType - The currency type to be removed
   */
  removeCurrencyType(currencyType: CurrencyType): void {
    // Don't allow deletion during edit mode
    if (this.currentlyEditing !== null) {
      return;
    }
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Currency Type',
        message: `Are you sure you want to delete the currency type "${currencyType.currencyName}"? \nThis will also delete all currencies within this type.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.currencySettings = this.currencyService.removeCurrencyType(currencyType);
        this.loadCurrencySettings();
        this.notificationService.success('Currency type deleted successfully');
      }
    });
  }

  /**
   * Deletes all currency types after user confirmation using the service.
   */
  removeAllCurrencyTypes(): void {
    // Don't allow mass deletion during edit mode
    if (this.currentlyEditing !== null) {
      return;
    }
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete All Currency Types',
        message:
          'Are you sure you want to delete all currency types and currencies? \nThis action cannot be undone.',
        confirmText: 'Delete All',
        cancelText: 'Cancel',
        type: 'danger',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.currencySettings = this.currencyService.removeAllCurrencyTypes();
        this.loadCurrencySettings();
        this.notificationService.success('All currency types deleted successfully');
      }
    });
  }

  /**
   * Checks if a specific currency type is currently in edit mode.
   */
  isEditing(currencyType: any): boolean {
    return this.currentlyEditing === currencyType;
  }
  
  /**
   * Checks if a specific currency type is a new one being created.
   */
  isNewCurrencyType(currencyType: any): boolean {
    return this.isNewMode && this.currentlyEditing === currencyType;
  }
  
  /**
   * Initiates editing of an existing currency type's name.
   */
  editCurrencyName(currencyType: CurrencyType): void {
    // Don't start editing if already editing something else
    if (this.currentlyEditing !== null) {
      return;
    }
    
    this.currentlyEditing = currencyType;
    this.editableName = currencyType.currencyName;
    this.isNewMode = false;
    
    // Focus on the input field after Angular has updated the view
    setTimeout(() => {
      this.focusOnInput();
    });
  }

  /**
   * Sets focus on the currency name input field
   */
  private focusOnInput(): void {
    if (this.currencyNameInputs && this.currencyNameInputs.first) {
      this.currencyNameInputs.first.nativeElement.focus();
    }
  }

  /**
   * Creates standard currencies via initialization service.
   */
  createStandardCurrencies(): void {
    this.isCreatingStandardCurrencies = true;
    
    // Use setTimeout to allow the UI to update and show the loader
    setTimeout(() => {
      // Call the initialization service method to create standard currencies
      this.initializationService.createStandardCurrencies();
      
      // Simulate some processing time to show the loader
      setTimeout(() => {
        // Reload the settings to update the UI
        this.loadCurrencySettings();
        this.isCreatingStandardCurrencies = false;
        
        // Important: Let Angular render the table before connecting the paginator
        setTimeout(() => {
          // Re-connect the table controls now that the table is visible
          this.connectTableControls();
          
          // Make sure the paginator shows the correct view
          if (this.dataSource.paginator) {
            this.dataSource.paginator.firstPage();
          }
          
          this.changeDetectorRef.detectChanges();
        }, 0);
        
        // Show success message
        this.notificationService.success('Standard currencies created successfully');
      }, 800);
    }, 100);
  }

  /**
   * Performs cleanup when the component is destroyed.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

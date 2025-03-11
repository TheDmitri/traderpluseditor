import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StorageService } from '../../../core/services/storage.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { CurrencyType, CurrencySettings } from '../../../core/models';
import { Subject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CurrencyModalComponent } from './currency-modal/currency-modal.component';

// Material Imports
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * CurrencyEditorComponent handles the management of TraderPlus currencies.
 *
 * This component provides a comprehensive interface for managing the in-game currency system:
 * - View and filter currency types in a paginated, sortable table
 * - Create, edit, and delete currency types
 * - Manage individual currencies within each currency type
 * 
 * The component manages both currency types (categories of currency) and individual 
 * currencies (specific items that have monetary value in the game).
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
  ],
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

  /** Flag indicating whether any currency types exist in the system */
  hasCurrencyTypes = false;
  
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

  /**
   * Initializes the component with required services for data management,
   * user interactions, and notifications.
   *
   * @param storageService - Handles persistent data storage and retrieval
   * @param dialog - Manages modal dialogs for edit operations and confirmations
   * @param notificationService - Displays user feedback messages
   */
  constructor(
    private storageService: StorageService,
    private dialog: MatDialog,
    private notificationService: NotificationService
  ) {
    this.dataSource = new MatTableDataSource<CurrencyType>([]);
  }

  /**
   * Initializes the component by loading currency settings from storage.
   * This is called automatically when the component is created.
   */
  ngOnInit(): void {
    this.loadCurrencySettings();
  }

  /**
   * Sets up table functionality after view initialization.
   * Configures pagination, sorting, and custom UI enhancements.
   */
  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // Initialize ripple effects after DOM is fully rendered
    setTimeout(() => {
      this.initializeCustomRipples();
    });
  }

  /**
   * Creates interactive ripple animations for custom buttons.
   * Enhances user experience by providing visual feedback on button interactions.
   * Uses attribute tracking to prevent duplicate initialization.
   */
  private initializeCustomRipples(): void {
    const buttons = document.querySelectorAll('.custom-icon-btn');

    buttons.forEach((button: Element) => {
      if (!(button as HTMLElement).hasAttribute('data-ripple-initialized')) {
        button.setAttribute('data-ripple-initialized', 'true');

        button.addEventListener('click', (event: Event) => {
          const mouseEvent = event as MouseEvent;
          const rippleContainer = button.querySelector(
            '.icon-btn-ripple'
          ) as HTMLElement;
          if (!rippleContainer) return;

          // Remove existing ripples
          const existingRipples = rippleContainer.querySelectorAll(
            '.icon-btn-ripple-effect'
          );
          existingRipples.forEach((ripple) => ripple.remove());

          // Create new ripple
          const ripple = document.createElement('span');
          ripple.classList.add('icon-btn-ripple-effect');

          const rect = button.getBoundingClientRect();
          const size = Math.max(rect.width, rect.height);
          const x = mouseEvent.clientX - rect.left - size / 2;
          const y = mouseEvent.clientY - rect.top - size / 2;

          ripple.style.width = ripple.style.height = `${size}px`;
          ripple.style.left = `${x}px`;
          ripple.style.top = `${y}px`;

          rippleContainer.appendChild(ripple);

          // Remove ripple after animation completes
          setTimeout(() => {
            ripple.remove();
          }, 500);
        });
      }
    });
  }

  /**
   * Retrieves currency settings from storage and updates the component state.
   * Creates default settings if none exist.
   * Updates table data and visibility states based on loaded data.
   */
  loadCurrencySettings(): void {
    this.currencySettings = this.storageService.currencySettings();
    
    if (this.currencySettings && this.currencySettings.currencyTypes) {
      this.hasCurrencyTypes = this.currencySettings.currencyTypes.length > 0;
      this.dataSource.data = this.currencySettings.currencyTypes;
    } else {
      // Initialize empty currency settings if none exist
      this.currencySettings = {
        version: '2.0.0',
        currencyTypes: []
      };
      this.hasCurrencyTypes = false;
      this.dataSource.data = [];
    }
  }

  /**
   * Filters the currency types table based on user input.
   * Provides real-time search functionality across all displayed fields.
   * Resets to first page when filter is applied and shows feedback if no results.
   *
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
   * Calculates the number of currencies in a given currency type.
   * Safely handles cases where currencies array might be undefined.
   *
   * @param currencyType - The currency type to analyze
   * @returns The total count of currencies in this type
   */
  getCurrencyCount(currencyType: CurrencyType): number {
    return currencyType.currencies ? currencyType.currencies.length : 0;
  }

  /**
   * Opens a modal dialog for managing currencies within a specific currency type.
   * Creates a deep clone of the currency type to prevent direct mutation.
   * Updates the data store when changes are confirmed.
   *
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
        // Update the currency type with the updated currencies
        this.currencySettings.currencyTypes = this.currencySettings.currencyTypes.map((ct) => {
          if (ct.currencyName === result.currencyName) {
            return result;
          }
          return ct;
        });

        // Save the updated currency settings
        this.storageService.saveCurrencySettings(this.currencySettings);
        this.loadCurrencySettings();
        // Update hasCurrencyTypes flag
        this.hasCurrencyTypes = this.currencySettings.currencyTypes.length > 0;
        this.notificationService.success('Currencies updated successfully');
      }
    });
  }

  /**
   * Creates a new currency type and immediately enters edit mode.
   * Inserts the new type at the beginning of the table for immediate visibility.
   * Sets default values that can be modified by the user.
   */
  addCurrencyType(): void {
    // Don't add if already editing
    if (this.currentlyEditing !== null) {
      return;
    }
    
    // Create a properly typed CurrencyType object with the required properties
    const newCurrencyType: CurrencyType = {
      currencyName: '',
      currencies: []
    };
    
    // Insert at beginning of data array
    const currentData = this.dataSource.data;
    this.dataSource.data = [newCurrencyType, ...currentData];
    
    // Immediately start editing the new currency type
    this.currentlyEditing = newCurrencyType;
    this.editableName = newCurrencyType.currencyName;
    this.isNewMode = true;
    
    // Always set hasCurrencyTypes to true when adding a new currency
    // This ensures we see the table with the edit form rather than the empty state
    this.hasCurrencyTypes = true;
  }

  /**
   * Enters edit mode for an existing currency type.
   * Stores the original name to allow cancellation of changes.
   * 
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
   * Persists changes to a currency type's name.
   * Handles both new currency types and existing ones differently.
   * Validates input to prevent empty names and provides user feedback.
   *
   * @param currencyType - The currency type being saved
   */
  saveCurrencyEdit(currencyType: CurrencyType): void {
    if (this.editableName && this.editableName.trim()) {
      currencyType.currencyName = this.editableName.trim();
      
      if (this.isNewMode) {
        // For new currency types, make sure they're added to the settings
        if (this.currencySettings) {
          this.currencySettings.currencyTypes = this.dataSource.data;
          this.storageService.saveCurrencySettings(this.currencySettings);
          // Update hasCurrencyTypes flag when adding new currency
          this.hasCurrencyTypes = true;
        }
        this.notificationService.success('New currency type created successfully');
        this.isNewMode = false;
      } else {
        // For existing currency types, update them in settings
        if (this.currencySettings) {
          this.storageService.saveCurrencySettings(this.currencySettings);
          // Ensure hasCurrencyTypes flag is updated
          this.hasCurrencyTypes = this.currencySettings.currencyTypes.length > 0;
        }
        this.notificationService.success('Currency name updated successfully');
      }
      
      this.resetEditState();
      // Refresh the table
      this.dataSource.data = [...this.dataSource.data];
    }
  }

  /**
   * Abandons the current edit operation.
   * Removes newly created currency types if in new mode.
   * Restores previous state without saving changes.
   * Cleans up localStorage if no currencies remain.
   */
  cancelEdit(): void {
    if (this.isNewMode) {
      // Remove the new currency from the data source
      const filteredData = this.dataSource.data.filter(
        item => item !== this.currentlyEditing
      );
      
      this.dataSource.data = filteredData;
      
      // Check if this was the last currency type
      if (filteredData.length === 0) {
        // If no currency types remain, remove currency settings from localStorage
        this.storageService.deleteCurrencySettings();
        this.hasCurrencyTypes = false;
        this.currencySettings = {
          version: '2.0.0',
          currencyTypes: []
        };
      } else if (this.currencySettings) {
        // Otherwise, update the currency types
        this.currencySettings.currencyTypes = filteredData;
        this.storageService.saveCurrencySettings(this.currencySettings);
      }
    }
    
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
  }

  /**
   * Deletes a currency type after user confirmation.
   * Warns about cascading deletion of contained currencies.
   * Updates the data store when confirmed.
   *
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
      if (result && this.currencySettings) {
        // Filter out the currency type to be deleted
        this.currencySettings.currencyTypes = this.currencySettings.currencyTypes.filter(
          (ct) => ct.currencyName !== currencyType.currencyName
        );

        // Save the updated currency settings
        this.storageService.saveCurrencySettings(this.currencySettings);
        this.loadCurrencySettings();
        // Update hasCurrencyTypes flag after deletion
        this.hasCurrencyTypes = this.currencySettings.currencyTypes.length > 0;
        this.notificationService.success('Currency type deleted successfully');
      }
    });
  }

  /**
   * Deletes all currency types after user confirmation.
   * Presents a strong warning as this is a destructive operation.
   * Resets the data store to initial state when confirmed.
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
        // Create empty currency settings
        const emptyCurrencySettings: CurrencySettings = {
          version: this.currencySettings?.version || '2.0.0',
          currencyTypes: [],
        };
        
        // Save the empty currency settings
        this.storageService.saveCurrencySettings(emptyCurrencySettings);
        this.loadCurrencySettings();
        this.notificationService.success('All currency types deleted successfully');
      }
    });
  }

  /**
   * Checks if a specific currency type is currently in edit mode.
   * Controls the display of edit UI elements.
   * 
   * @param currencyType - The currency type to check
   * @returns Boolean indicating if this currency type is being edited
   */
  isEditing(currencyType: any): boolean {
    return this.currentlyEditing === currencyType;
  }
  
  /**
   * Checks if a specific currency type is a new one being created.
   * Different UI and behavior applies to new versus existing items.
   * 
   * @param currencyType - The currency type to check
   * @returns Boolean indicating if this is a new currency type
   */
  isNewCurrencyType(currencyType: any): boolean {
    return this.isNewMode && this.currentlyEditing === currencyType;
  }
  
  /**
   * Initiates editing of an existing currency type's name.
   * Sets up the edit state variables and prepares the form.
   * 
   * @param currencyType - The currency type whose name will be edited
   */
  editCurrencyName(currencyType: CurrencyType): void {
    // Don't start editing if already editing something else
    if (this.currentlyEditing !== null) {
      return;
    }
    
    this.currentlyEditing = currencyType;
    this.editableName = currencyType.currencyName;
    this.isNewMode = false;
  }

  /**
   * Creates standard currency types and currencies based on TraderPlusCurrencySettings.json
   * This provides a set of commonly used currencies (EUR and USD) with different denominations
   */
  createStandardCurrencies(): void {
    // Create standard currency settings with EUR and USD
    const standardCurrencySettings: CurrencySettings = {
      version: '2.0.0',
      currencyTypes: [
        {
          currencyName: 'EUR',
          currencies: [
            { className: 'TraderPlus_Money_Euro100', value: 100 },
            { className: 'TraderPlus_Money_Euro50', value: 50 },
            { className: 'TraderPlus_Money_Euro10', value: 10 },
            { className: 'TraderPlus_Money_Euro5', value: 5 },
            { className: 'TraderPlus_Money_Euro1', value: 1 }
          ]
        },
        {
          currencyName: 'USD',
          currencies: [
            { className: 'TraderPlus_Money_Dollar100', value: 100 },
            { className: 'TraderPlus_Money_Dollar50', value: 50 },
            { className: 'TraderPlus_Money_Dollar10', value: 10 },
            { className: 'TraderPlus_Money_Dollar5', value: 5 },
            { className: 'TraderPlus_Money_Dollar1', value: 1 }
          ]
        }
      ]
    };
    
    // Save the standard currency settings
    this.storageService.saveCurrencySettings(standardCurrencySettings);
    
    // Reload the settings to update the UI
    this.loadCurrencySettings();
    
    // Show success message
    this.notificationService.success('Standard currencies created successfully');
  }

  /**
   * Performs cleanup when the component is destroyed.
   * Prevents memory leaks by completing observables.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

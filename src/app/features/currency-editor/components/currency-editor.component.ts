import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms'; // Add FormsModule import
import { RouterModule } from '@angular/router';
import { StorageService } from '../../../core/services/storage.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { CurrencyType, Currency, CurrencySettings } from '../../../core/models';
import { Subject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { DenominationModalComponent } from './denomination-modal/denomination-modal.component';

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
 * This component allows users to:
 * - View all currency types in a paginated, sortable table
 * - Manage denominations through a modal dialog
 * - Add new currency types and denominations
 * - Edit existing currency types and denominations
 * - Delete currency types and denominations
 */
@Component({
  selector: 'app-currency-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule, // Add FormsModule to the imports
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
  /** Subject for handling component destruction and preventing memory leaks */
  private destroy$ = new Subject<void>();

  /** Data source for the Material table with currency type data */
  dataSource: MatTableDataSource<CurrencyType>;

  /** Columns to display in the currency types table */
  displayedColumns: string[] = [
    'currencyName',
    'denominationCount',
    'actions',
  ];
  
  /** Columns to display in the denominations table */
  denominationColumns: string[] = [
    'className',
    'value',
    'actions',
  ];

  /** Reference to the Material paginator for table pagination */
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  /** Reference to the Material sort directive for table sorting */
  @ViewChild(MatSort) sort!: MatSort;

  /** Flag to track if currency types are available */
  hasCurrencyTypes = false;
  
  /** Currently expanded currency type for viewing denominations */
  expandedCurrencyType: CurrencyType | null = null;
  
  /** Currency settings object that contains all currency types */
  currencySettings: CurrencySettings | null = null;

  /** Currently editing currency type */
  currentlyEditing: any = null;

  /** Editable name for the currency type */
  editableName: string = '';

  /** Flag to track if a new currency type is being created */
  isNewMode: boolean = false;

  /**
   * Constructor initializes services and the data source
   *
   * @param storageService - Service for persisting and retrieving data
   * @param currencyService - Service for currency-specific operations
   * @param dialog - Material dialog service for modal dialogs
   * @param notificationService - Service for displaying user notifications
   */
  constructor(
    private storageService: StorageService,
    private currencyService: CurrencyService,
    private dialog: MatDialog,
    private notificationService: NotificationService
  ) {
    this.dataSource = new MatTableDataSource<CurrencyType>([]);
  }

  /**
   * OnInit lifecycle hook - Loads currency settings from storage
   */
  ngOnInit(): void {
    this.loadCurrencySettings();
  }

  /**
   * AfterViewInit lifecycle hook - Sets up table pagination and sorting
   * Also initializes custom ripple effects for enhanced UI interaction
   */
  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // Initialize ripple effects for custom buttons after a short delay
    setTimeout(() => {
      this.initializeCustomRipples();
    });
  }

  /**
   * Initialize custom ripple effects for icon buttons
   *
   * Creates an interactive ripple animation when buttons are clicked,
   * enhancing the user experience with visual feedback
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
   * Load currency settings from storage service and update data source
   *
   * This method retrieves the latest currency settings and refreshes the table display.
   * Called on component initialization and after any data modification.
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
   * Apply filtering to the data table
   *
   * Filters currency types based on user input, enabling quick search across displayed fields
   *
   * @param event - Input event containing the filter text
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
   * Get the count of denominations in a currency type
   *
   * @param currencyType - The currency type to count denominations for
   * @returns The number of denominations in the currency type
   */
  getDenominationCount(currencyType: CurrencyType): number {
    return currencyType.currencies ? currencyType.currencies.length : 0;
  }

  /**
   * Open the denomination modal dialog for the specified currency type
   *
   * @param currencyType - The currency type to edit denominations for
   */
  openDenominationModal(currencyType: CurrencyType): void {
    const dialogRef = this.dialog.open(DenominationModalComponent, {
      width: '700px',
      data: { currencyType: structuredClone(currencyType) },
      disableClose: true,
      autoFocus: true,
    });

    dialogRef.afterClosed().subscribe((result: CurrencyType | undefined) => {
      if (result && this.currencySettings) {
        // Update the currency type with the updated denominations
        this.currencySettings.currencyTypes = this.currencySettings.currencyTypes.map((ct) => {
          if (ct.currencyName === result.currencyName) {
            return result;
          }
          return ct;
        });

        // Save the updated currency settings
        this.storageService.saveCurrencySettings(this.currencySettings);
        this.loadCurrencySettings();
        this.notificationService.success('Denominations updated successfully');
      }
    });
  }

  /**
   * Add a new currency type
   * 
   * Creates a new currency type with a placeholder name and immediately
   * enters edit mode for the user to customize it.
   */
  addCurrencyType(): void {
    // Create a properly typed CurrencyType object with the required properties
    const newCurrency: CurrencyType = {
      currencyName: 'New Currency Type',
      currencies: [] // Use 'currencies' instead of 'denominations' to match the interface
    };
    
    // Insert at beginning of data array
    const currentData = this.dataSource.data;
    this.dataSource.data = [newCurrency, ...currentData];
    
    // Immediately start editing the new currency
    this.currentlyEditing = newCurrency;
    this.editableName = newCurrency.currencyName;
    this.isNewMode = true;
  }

  /**
   * Edit an existing currency type
   * 
   * Note: This is a placeholder - we'll implement the modal dialog later
   * 
   * @param currencyType - The currency type to edit
   */
  editCurrencyType(currencyType: CurrencyType): void {
    this.currentlyEditing = currencyType;
    this.editableName = currencyType.currencyName;
    this.isNewMode = false;
  }

  /**
   * Save currency name changes
   *
   * @param currencyType - The currency type to save
   */
  saveCurrencyEdit(currencyType: CurrencyType): void {
    if (this.editableName && this.editableName.trim()) {
      currencyType.currencyName = this.editableName.trim();
      
      if (this.isNewMode) {
        // For new currency types, make sure they're added to the settings
        if (this.currencySettings) {
          this.currencySettings.currencyTypes = this.dataSource.data;
          this.storageService.saveCurrencySettings(this.currencySettings);
        }
        this.notificationService.success('New currency type created successfully');
        this.isNewMode = false;
      } else {
        // For existing currency types, update them in settings
        if (this.currencySettings) {
          this.storageService.saveCurrencySettings(this.currencySettings);
        }
        this.notificationService.success('Currency name updated successfully');
      }
      
      this.resetEditState();
      // Refresh the table
      this.dataSource.data = [...this.dataSource.data];
    }
  }

  /**
   * Cancel editing
   */
  cancelEdit(): void {
    if (this.isNewMode) {
      // Remove the new currency from the data source
      this.dataSource.data = this.dataSource.data.filter(
        item => item !== this.currentlyEditing
      );
    }
    this.resetEditState();
  }

  /**
   * Reset the edit state
   */
  private resetEditState(): void {
    this.currentlyEditing = null;
    this.editableName = '';
    this.isNewMode = false;
  }

  /**
   * Remove a currency type after confirmation
   *
   * @param currencyType - The currency type to remove
   */
  removeCurrencyType(currencyType: CurrencyType): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Currency Type',
        message: `Are you sure you want to delete the currency type "${currencyType.currencyName}"? \nThis will also delete all denominations within this type.`,
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
        this.notificationService.success('Currency type deleted successfully');
      }
    });
  }

  /**
   * Add a new denomination to a currency type
   * Opens the denomination modal dialog
   * 
   * @param currencyType - The currency type to add the denomination to
   */
  addDenomination(currencyType: CurrencyType): void {
    // Open the denomination modal to add a new denomination
    this.openDenominationModal(currencyType);
  }

  /**
   * Edit an existing denomination
   * Now handled through the denomination modal dialog
   * 
   * @param currencyType - The parent currency type
   * @param currency - The denomination to edit
   */
  editDenomination(currencyType: CurrencyType, currency: Currency): void {
    // This method is no longer needed as individual denominations
    // are edited in the modal dialog, but keeping it for any external calls
    this.openDenominationModal(currencyType);
  }

  /**
   * Remove all currency types after confirmation
   */
  removeAllCurrencyTypes(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete All Currency Types',
        message:
          'Are you sure you want to delete all currency types and denominations? \nThis action cannot be undone.',
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
   * Check if a currency type is the currently expanded one
   * 
   * @param row - The currency type to check
   * @returns True if this is the expanded currency type
   */
  isExpanded(row: CurrencyType): boolean {
    return this.expandedCurrencyType === row;
  }

  /**
   * Returns a predicate function for the expandable row
   * This approach avoids the 'Property row does not exist' compiler error
   */
  getExpandedRowPredicate(): (index: number, item: CurrencyType) => boolean {
    return (index: number, item: CurrencyType) => {
      // Compare by currencyName instead of object reference
      return this.expandedCurrencyType?.currencyName === item.currencyName;
    };
  }

  /**
   * Check if a currency type is currently being edited
   * 
   * @param currencyType - The currency type to check
   * @returns True if this currency type is being edited
   */
  isEditing(currencyType: any): boolean {
    return this.currentlyEditing === currencyType;
  }
  
  /**
   * Check if a currency type is a new one being created
   * 
   * @param currencyType - The currency type to check
   * @returns True if this is a new currency type being created
   */
  isNewCurrency(currencyType: any): boolean {
    return this.isNewMode && this.currentlyEditing === currencyType;
  }
  
  /**
   * Start editing a currency name
   * 
   * @param currencyType - The currency type to edit
   */
  editCurrencyName(currencyType: CurrencyType): void {
    this.currentlyEditing = currencyType;
    this.editableName = currencyType.currencyName;
    this.isNewMode = false;
  }

  /**
   * OnDestroy lifecycle hook - Clean up subscriptions and resources
   *
   * Completes the destroy$ subject to prevent memory leaks from any
   * subscriptions that may be using it as a takeUntil condition
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

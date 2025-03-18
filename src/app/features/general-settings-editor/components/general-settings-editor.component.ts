import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';

// Application imports
import { GeneralSettings, License, TraderNpc } from '../../../core/models';
import { InitializationService } from '../../../core/services';
import { NotificationService } from '../../../shared/services';
import { 
  AcceptedStatesService, 
  GeneralSettingsService, 
  LicenseService,
  TraderService 
} from '../services';
import { LoaderComponent } from '../../../shared/components';
import { TraderModalComponent } from './traders-editor/trader-modal/trader-modal.component';
import { TradersEditorComponent } from "./traders-editor/traders-editor.component";
import { ObjectsEditorComponent } from "./objects-editor/objects-editor.component";

/**
 * General Settings Editor Component
 * 
 * This component provides an interface for editing general settings including:
 * - Licenses (name, description)
 * - Accepted states (worn, damaged, badly damaged and their coefficients)
 * - Traders (NPCs that provide trading services)
 * - Trader Objects (Objects placed in trader zones)
 */
@Component({
  selector: 'app-general-settings-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatDialogModule,
    MatTableModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatMenuModule,
    MatPaginatorModule,
    MatSortModule,
    RouterModule,
    LoaderComponent,
    TradersEditorComponent,
    ObjectsEditorComponent
],
  templateUrl: './general-settings-editor.component.html',
  styleUrls: ['./general-settings-editor.component.scss']
})
export class GeneralSettingsEditorComponent implements OnInit, OnDestroy, AfterViewInit {
  /** Subject for handling component destruction and preventing memory leaks */
  private destroy$ = new Subject<void>();
  
  /** Form group for accepted states */
  acceptedStatesForm!: FormGroup;
  
  /** General settings object */
  generalSettings: GeneralSettings | null = null;
  
  /** Data source for the licenses table */
  licensesDataSource = new MatTableDataSource<License>([]);
  
  /** Data source for the traders table */
  tradersDataSource = new MatTableDataSource<TraderNpc>([]);
  
  /** Columns to display in the licenses table */
  displayedColumns: string[] = ['licenseName', 'description', 'actions'];
  
  /** Columns to display in the traders table */
  traderColumns: string[] = ['npcId', 'givenName', 'className', 'position', 'actions'];
  
  /** Flag to track if settings exist */
  hasSettings = false;
  
  /** Index of the license currently being edited */
  editingLicenseIndex: number | null = null;

  /** Temporary license data during editing */
  editLicenseName: string = '';
  editLicenseDescription: string = '';

  /** Index of the trader currently being edited */
  editingTraderIndex: number | null = null;

  /** Flag to track if we're adding a new trader */
  isAddingTrader = false;

  /** Flag to track if default settings are being created */
  isCreatingDefaultSettings = false;

  /** Track which coefficient is being edited */
  editingCoefficient: 'worn' | 'damaged' | 'badly_damaged' | null = null;

  /** References for table pagination and sorting */
  @ViewChild('traderPaginator') traderPaginator!: MatPaginator;
  @ViewChild('traderSort') traderSort!: MatSort;

  /**
   * Constructor initializes necessary services
   */
  constructor(
    private generalSettingsService: GeneralSettingsService,
    private licenseService: LicenseService,
    private acceptedStatesService: AcceptedStatesService,
    private traderService: TraderService,
    private notificationService: NotificationService,
    private initializationService: InitializationService,
    private dialog: MatDialog
  ) { }

  /**
   * On component initialization, load settings and initialize forms
   */
  ngOnInit(): void {
    this.loadSettings();
    this.initializeAcceptedStatesForm();
  }

  /**
   * Initialize the form for accepted states
   */
  initializeAcceptedStatesForm(): void {
    // Initialize form using the service (with automatic setup of listeners and values)
    this.acceptedStatesForm = this.acceptedStatesService.initializeAcceptedStatesForm(
      this.hasSettings,
      this.destroy$
    );
  }

  /**
   * Load general settings
   */
  loadSettings(): void {
    this.generalSettings = this.generalSettingsService.getGeneralSettings();
    this.hasSettings = this.generalSettingsService.hasSettings();
    
    // Update the licenses data source if settings exist
    if (this.hasSettings) {
      this.licensesDataSource = this.licenseService.getLicensesDataSource();
      this.tradersDataSource = this.traderService.getTradersDataSource();
    } else {
      this.licensesDataSource = new MatTableDataSource<License>([]);
      this.tradersDataSource = new MatTableDataSource<TraderNpc>([]);
    }
    
    // Update form state if it exists
    if (this.acceptedStatesForm) {
      this.acceptedStatesService.updateFormState(this.acceptedStatesForm, this.hasSettings);
    }
  }

  /**
   * Create new general settings with default values
   */
  createGeneralSettings(): void {
    this.isCreatingDefaultSettings = true;
    
    // Use setTimeout to allow the UI to update and show the loader
    setTimeout(() => {
      // Create and save default settings using the service
      this.generalSettings = this.generalSettingsService.createAndSaveDefaultGeneralSettings();
      
      // Simulate some processing time to show the loader
      setTimeout(() => {
        // Update component state
        this.hasSettings = true;
        
        // Reinitialize the form for accepted states
        this.initializeAcceptedStatesForm();
        
        // Update the license data source to display default licenses
        this.licensesDataSource = this.licenseService.getLicensesDataSource();
        
        // Update the trader data source to display default traders
        this.tradersDataSource = this.traderService.getTradersDataSource();
        
        this.isCreatingDefaultSettings = false;
        
        this.notificationService.success('General settings created successfully');
      }, 800);
    }, 100);
  }

  // License management methods
  addLicense(): void {
    // Use the service to handle license addition logic
    const result = this.licenseService.addLicense();
    
    // Update component state with service result
    this.licensesDataSource = result.dataSource;
    this.editingLicenseIndex = result.editingIndex;
    this.editLicenseName = result.editName;
    this.editLicenseDescription = result.editDescription;
  }

  /**
   * Cancel editing a license
   */
  cancelEditLicense(): void {
    // Use the service to handle license cancellation logic
    this.licensesDataSource = this.licenseService.cancelEditLicense();
    this.editingLicenseIndex = null;
  }

  /**
   * Check if the current license being edited can be saved
   * @returns true if the license has a non-empty name and can be saved
   */
  canSaveLicense(): boolean {
    return this.licenseService.canSaveLicense(this.editLicenseName);
  }

  /**
   * Save the currently edited license
   */
  saveLicense(): void {
    if (this.editingLicenseIndex === null) return;

    // Use the service to handle license saving logic
    const result = this.licenseService.saveLicenseWithUIState(
      this.editingLicenseIndex,
      this.editLicenseName,
      this.editLicenseDescription
    );
    
    // Update component state based on service result
    if (result.success) {
      this.licensesDataSource = result.dataSource;
      this.editingLicenseIndex = null;
      
      // Refresh the settings object reference
      this.generalSettings = this.generalSettingsService.getGeneralSettings();
      
      this.notificationService.success('License saved successfully');
    } else {
      this.notificationService.error(result.error || 'Failed to save license');
    }
  }

  /**
   * Start editing a license
   * @param license - The license to edit
   * @param index - The index of the license in the array
   */
  startEditLicense(license: License, index: number): void {
    // Use the service to handle license editing logic
    const result = this.licenseService.startEditLicense(license, index);
    
    // Update component state with service result
    this.licensesDataSource = result.dataSource;
    this.editingLicenseIndex = result.editingIndex;
    this.editLicenseName = result.editName;
    this.editLicenseDescription = result.editDescription;
  }

  /**
   * Update license edit fields (when user types)
   * @param name - The updated name value
   * @param description - The updated description value
   */
  updateLicenseEditFields(name: string, description: string): void {
    this.editLicenseName = name;
    this.editLicenseDescription = description;
    this.licenseService.setLicenseEditState(name, description);
  }

  /**
   * Delete a license after confirmation
   * @param index - The index of the license to delete
   */
  async deleteLicense(index: number): Promise<void> {
    // Use the service to handle license deletion with confirmation
    this.licensesDataSource = await this.licenseService.deleteLicenseWithConfirmation(index);
    
    // Refresh the settings object reference
    this.generalSettings = this.generalSettingsService.getGeneralSettings();
  }

  /**
   * Delete all licenses after confirmation
   */
  async deleteAllLicenses(): Promise<void> {
    // Use the service to handle deletion of all licenses with confirmation
    this.licensesDataSource = await this.licenseService.deleteAllLicensesWithConfirmation();
    
    // Refresh the settings object reference
    this.generalSettings = this.generalSettingsService.getGeneralSettings();
  }

  /**
   * Delete all general settings after confirmation
   */
  async deleteAllSettings(): Promise<void> {
    // Use the service to handle general settings deletion with confirmation
    const deleted = await this.generalSettingsService.deleteGeneralSettingsWithConfirmation();
    
    if (deleted) {
      // Reset state
      this.generalSettings = null;
      this.hasSettings = false;
      this.licensesDataSource = new MatTableDataSource<License>([]);
      this.tradersDataSource = new MatTableDataSource<TraderNpc>([]);
      
      // Disable form
      if (this.acceptedStatesForm) {
        this.acceptedStatesForm.disable();
      }
    }
  }

  /**
   * Open dialog to add a new trader
   */
  openAddTraderDialog(): void {
    const dialogRef = this.dialog.open(TraderModalComponent, {
      data: { trader: null }
    });

    dialogRef.afterClosed().subscribe((trader: TraderNpc) => {
      if (trader) {
        if (this.traderService.addTraderToSettings(trader)) {
          this.tradersDataSource = this.traderService.getTradersDataSource();
          this.notificationService.success('Trader added successfully');
        } else {
          this.notificationService.error('Failed to add trader');
        }
      }
    });
  }

  /**
   * Open dialog to edit an existing trader
   * @param trader - The trader to edit
   * @param index - The index of the trader in the array
   */
  openEditTraderDialog(trader: TraderNpc, index: number): void {
    const dialogRef = this.dialog.open(TraderModalComponent, {
      data: { trader: {...trader} }
    });

    dialogRef.afterClosed().subscribe((updatedTrader: TraderNpc) => {
      if (updatedTrader) {
        if (this.traderService.updateTrader(index, updatedTrader)) {
          this.tradersDataSource = this.traderService.getTradersDataSource();
          this.notificationService.success('Trader updated successfully');
        } else {
          this.notificationService.error('Failed to update trader');
        }
      }
    });
  }

  /**
   * Delete a trader after confirmation
   * @param index - The index of the trader to delete
   */
  async deleteTrader(index: number): Promise<void> {
    this.tradersDataSource = await this.traderService.deleteTraderWithConfirmation(index);
    
    // Refresh the settings object reference
    this.generalSettings = this.generalSettingsService.getGeneralSettings();
  }

  /**
   * Delete all traders after confirmation
   */
  async deleteAllTraders(): Promise<void> {
    this.tradersDataSource = await this.traderService.deleteAllTradersWithConfirmation();
    
    // Refresh the settings object reference
    this.generalSettings = this.generalSettingsService.getGeneralSettings();
  }

  /**
   * Format the position coordinates for display
   * @param position - The position array [x, y, z]
   * @returns Formatted position string
   */
  formatPosition(position: number[]): string {
    if (!position || position.length !== 3) return 'Invalid position';
    return `X: ${position[0].toFixed(1)}, Y: ${position[1].toFixed(1)}, Z: ${position[2].toFixed(1)}`;
  }

  /**
   * Apply pagination and sorting to trader table
   */
  setupTraderTable(): void {
    if (this.tradersDataSource && this.traderPaginator && this.traderSort) {
      this.tradersDataSource.paginator = this.traderPaginator;
      this.tradersDataSource.sort = this.traderSort;
    }
  }

  /**
   * Sets up table functionality after view initialization.
   * Configures custom UI enhancements like ripple effects.
   */
  ngAfterViewInit(): void {
    // Initialize ripple effects after DOM is fully rendered
    setTimeout(() => {
      this.initializationService.initializeCustomRipples();
      this.setupTraderTable();
    });
  }

  /**
   * Toggle editing state for a coefficient
   * @param coefficient - The coefficient to edit ('worn', 'damaged', or 'badly_damaged')
   */
  toggleCoefficientEdit(coefficient: 'worn' | 'damaged' | 'badly_damaged'): void {
    if (this.editingCoefficient === coefficient) {
      this.editingCoefficient = null;
    } else {
      this.editingCoefficient = coefficient;
    }
  }

  /**
   * Check if a coefficient is being edited
   * @param coefficient - The coefficient to check
   * @returns True if the coefficient is being edited
   */
  isEditingCoefficient(coefficient: 'worn' | 'damaged' | 'badly_damaged'): boolean {
    return this.editingCoefficient === coefficient;
  }

  /**
   * Save the coefficient value and exit editing mode
   */
  saveCoefficient(): void {
    this.editingCoefficient = null;
  }

  /**
   * Get a coefficient value for display, regardless of state activation status
   * @param coefficient - The coefficient to get ('worn', 'damaged', or 'badly_damaged')
   * @returns The coefficient value as a percentage
   */
  getCoefficientValue(coefficient: 'worn' | 'damaged' | 'badly_damaged'): number {
    let formValue = 0;
    
    switch (coefficient) {
      case 'worn':
        formValue = this.acceptedStatesForm.get('coefficientWorn')?.value || 0;
        break;
      case 'damaged':
        formValue = this.acceptedStatesForm.get('coefficientDamaged')?.value || 0;
        break;
      case 'badly_damaged':
        formValue = this.acceptedStatesForm.get('coefficientBadlyDamaged')?.value || 0;
        break;
    }
    
    return formValue * 100;
  }

  /**
   * Check if a coefficient value is valid (between 0 and 1)
   * @param coefficient - The coefficient to check ('worn', 'damaged', or 'badly_damaged')
   * @returns True if the coefficient value is valid
   */
  isValidCoefficient(coefficient: 'worn' | 'damaged' | 'badly_damaged'): boolean {
    let value: number;
    
    switch (coefficient) {
      case 'worn':
        value = this.acceptedStatesForm.get('coefficientWorn')?.value;
        break;
      case 'damaged':
        value = this.acceptedStatesForm.get('coefficientDamaged')?.value;
        break;
      case 'badly_damaged':
        value = this.acceptedStatesForm.get('coefficientBadlyDamaged')?.value;
        break;
      default:
        return false;
    }
    
    // Check if value is a number and between 0 and 1 inclusive
    return typeof value === 'number' && value >= 0 && value <= 1;
  }

  /**
   * Cleanup on component destruction
   */
  ngOnDestroy(): void {
    // Clear any license edit state in the service
    this.licenseService.clearLicenseEditState();
    
    // Clear any trader edit state in the service
    this.traderService.clearTraderEditState();
    
    // Complete the destroy subject to unsubscribe from all subscriptions
    this.destroy$.next();
    this.destroy$.complete();

    // Make sure to clear any editing states
    this.editingCoefficient = null;
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, AfterViewInit } from '@angular/core';
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

// Application imports
import { GeneralSettings, License } from '../../../core/models';
import { InitializationService } from '../../../core/services';
import { NotificationService } from '../../../shared/services';
import { AcceptedStatesService, GeneralSettingsService, LicenseService } from '../services';
import { LoaderComponent } from '../../../shared/components';

/**
 * General Settings Editor Component
 * 
 * This component provides an interface for editing general settings including:
 * - Licenses (name, description)
 * - Accepted states (worn, damaged, badly damaged and their coefficients)
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
    RouterModule,
    LoaderComponent
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
  
  /** Columns to display in the licenses table */
  displayedColumns: string[] = ['licenseName', 'description', 'actions'];
  
  /** Flag to track if settings exist */
  hasSettings = false;
  
  /** Index of the license currently being edited */
  editingLicenseIndex: number | null = null;

  /** Temporary license data during editing */
  editLicenseName: string = '';
  editLicenseDescription: string = '';

  /** Flag to track if default settings are being created */
  isCreatingDefaultSettings = false;

  /**
   * Constructor initializes necessary services
   */
  constructor(
    private generalSettingsService: GeneralSettingsService,
    private licenseService: LicenseService,
    private acceptedStatesService: AcceptedStatesService,
    private notificationService: NotificationService,
    private initializationService: InitializationService
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
    } else {
      this.licensesDataSource = new MatTableDataSource<License>([]);
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
        
        this.isCreatingDefaultSettings = false;
        
        this.notificationService.success('General settings created successfully');
      }, 800);
    }, 100);
  }

  /**
   * Add a new license for editing (but don't save it yet)
   */
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
      
      // Disable form
      if (this.acceptedStatesForm) {
        this.acceptedStatesForm.disable();
      }
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
    });
  }

  /**
   * Cleanup on component destruction
   */
  ngOnDestroy(): void {
    // Clear any license edit state in the service
    this.licenseService.clearLicenseEditState();
    
    // Complete the destroy subject to unsubscribe from all subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }
}

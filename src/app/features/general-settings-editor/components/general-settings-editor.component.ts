import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { GeneralSettings, License } from '../../../core/models/general-settings.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatMenuModule } from '@angular/material/menu';

// Services
import { GeneralSettingsService } from '../services/general-settings.service';
import { LicenseService } from '../services/license.service';
import { AcceptedStatesService } from '../services/accepted-states.service';

import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { NotificationService } from '../../../shared/services/notification.service';

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
    RouterModule
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

  /** Temporary license for adding new licenses */
  private newLicense: License | null = null;
  
  /** Flag to track if we're adding a new license vs editing an existing one */
  private isAddingNewLicense = false;

  /**
   * Constructor initializes necessary services
   */
  constructor(
    private generalSettingsService: GeneralSettingsService,
    private licenseService: LicenseService,
    private acceptedStatesService: AcceptedStatesService,
    private dialog: MatDialog,
    private notificationService: NotificationService
  ) { }

  /**
   * On component initialization, load settings and initialize forms
   */
  ngOnInit(): void {
    this.loadSettings();
    this.initAcceptedStatesForm();
  }

  /**
   * Initialize the form for accepted states
   */
  initAcceptedStatesForm(): void {
    // Create the form using the service
    this.acceptedStatesForm = this.acceptedStatesService.createAcceptedStatesForm();

    // If settings exist, populate the form
    if (this.hasSettings) {
      this.acceptedStatesService.initFormFromSettings(this.acceptedStatesForm);
      
      // Set up listeners to reset coefficients when states are toggled off
      this.acceptedStatesService.setupStateToggleListeners(this.acceptedStatesForm, () => {
        if (this.acceptedStatesForm.valid) {
          this.saveAcceptedStates();
        }
      });
      
      // Save settings when form changes
      this.acceptedStatesForm.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          if (this.acceptedStatesForm.valid) {
            this.saveAcceptedStates();
          }
        });
    } else {
      // Disable the form if no settings exist
      this.acceptedStatesForm.disable();
    }
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
      // Ensure we reset the data source when no settings exist
      this.licensesDataSource = new MatTableDataSource<License>([]);
    }
    
    // Ensure form is enabled/disabled based on settings existence
    if (this.acceptedStatesForm) {
      if (this.hasSettings) {
        this.acceptedStatesForm.enable();
      } else {
        this.acceptedStatesForm.disable();
      }
    }
  }

  /**
   * Create new general settings with default values
   */
  createGeneralSettings(): void {
    // Create default settings using the service
    this.generalSettings = this.generalSettingsService.createDefaultGeneralSettings();
    
    // Save the new settings
    this.generalSettingsService.saveGeneralSettings(this.generalSettings);
    
    // Update state
    this.hasSettings = true;
    
    // Recreate and enable the form
    this.acceptedStatesForm = this.acceptedStatesService.createAcceptedStatesForm();
    this.acceptedStatesForm.enable();
    
    // Set up state toggle listeners
    this.acceptedStatesService.setupStateToggleListeners(this.acceptedStatesForm, () => {
      if (this.acceptedStatesForm.valid) {
        this.saveAcceptedStates();
      }
    });
    
    // Subscribe to form changes
    this.acceptedStatesForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.acceptedStatesForm.valid) {
          this.saveAcceptedStates();
        }
      });
    
    // Initialize accepted states form with values from new settings
    this.acceptedStatesService.initFormFromSettings(this.acceptedStatesForm);
    
    // Update the license data source to display default licenses
    this.licensesDataSource = this.licenseService.getLicensesDataSource();
    
    // Show success message
    this.notificationService.success('General settings created successfully');
  }

  /**
   * Save accepted states from form to settings
   */
  saveAcceptedStates(): void {
    if (this.acceptedStatesService.saveAcceptedStates(this.acceptedStatesForm)) {
      // Refresh the settings object reference
      this.generalSettings = this.generalSettingsService.getGeneralSettings();
    }
  }

  /**
   * Add a new license for editing (but don't save it yet)
   */
  addLicense(): void {
    // Create a new license but don't save it to settings yet
    this.newLicense = this.licenseService.createLicense();
    this.isAddingNewLicense = true;
    
    // Update the temporary data for editing
    this.editingLicenseIndex = 0;
    this.editLicenseName = '';
    this.editLicenseDescription = '';
    
    // Create a temporary datasource with the new license at the top
    const currentLicenses = [...this.licensesDataSource.data];
    currentLicenses.unshift(this.newLicense);
    this.licensesDataSource = new MatTableDataSource<License>(currentLicenses);
  }

  /**
   * Cancel editing a license
   */
  cancelEditLicense(): void {
    if (this.isAddingNewLicense) {
      // If we're adding a new license, just remove it from the UI
      this.isAddingNewLicense = false;
      this.newLicense = null;
      
      // Reset the datasource to remove the temporary license
      this.licensesDataSource = this.licenseService.getLicensesDataSource();
    }
    
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
    
    // Check if we're adding a new license
    if (this.isAddingNewLicense && this.newLicense) {
      // Update the temporary license object
      this.newLicense.licenseName = this.editLicenseName.trim();
      this.newLicense.description = this.editLicenseDescription.trim();
      
      // Validate the license name
      if (!this.newLicense.licenseName) {
        this.notificationService.error('License name is required');
        return;
      }
      
      // Add the license to the settings
      if (this.licenseService.addLicenseToSettings(this.newLicense)) {
        // Reset state
        this.isAddingNewLicense = false;
        this.newLicense = null;
        this.editingLicenseIndex = null;
        
        // Update the data source with the actual saved licenses
        this.licensesDataSource = this.licenseService.getLicensesDataSource();
        
        // Refresh the settings object reference
        this.generalSettings = this.generalSettingsService.getGeneralSettings();
        
        this.notificationService.success('License saved successfully');
      } else {
        this.notificationService.error('Failed to save license');
      }
    } else {
      // We're editing an existing license, use the service method
      const result = this.licenseService.validateAndSaveLicense(
        this.editingLicenseIndex, 
        this.editLicenseName, 
        this.editLicenseDescription
      );
      
      if (result.success) {
        // Update data source
        this.licensesDataSource = this.licenseService.getLicensesDataSource();
        
        // Reset editing state
        this.editingLicenseIndex = null;
        
        // Refresh the settings object reference
        this.generalSettings = this.generalSettingsService.getGeneralSettings();
        
        this.notificationService.success('License saved successfully');
      } else {
        this.notificationService.error(result.error || 'Failed to save license');
      }
    }
  }

  /**
   * Start editing a license
   * @param license - The license to edit
   * @param index - The index of the license in the array
   */
  startEditLicense(license: License, index: number): void {
    // If we were adding a new license and now want to edit something else,
    // discard the new license
    if (this.isAddingNewLicense) {
      this.isAddingNewLicense = false;
      this.newLicense = null;
      this.licensesDataSource = this.licenseService.getLicensesDataSource();
    }
    
    this.editingLicenseIndex = index;
    this.editLicenseName = license.licenseName || '';
    this.editLicenseDescription = license.description || '';
  }

  /**
   * Delete a license after confirmation
   * 
   * @param index - The index of the license to delete
   */
  deleteLicense(index: number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete License',
        message: 'Are you sure you want to delete this license? \n\nThis action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (this.licenseService.deleteLicense(index)) {
          // Update data source
          this.licensesDataSource = this.licenseService.getLicensesDataSource();
          
          // Refresh the settings object reference
          this.generalSettings = this.generalSettingsService.getGeneralSettings();
          
          this.notificationService.success('License deleted successfully');
        } else {
          this.notificationService.error('Failed to delete license');
        }
      }
    });
  }

  /**
   * Delete all licenses after confirmation
   */
  deleteAllLicenses(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete All Licenses',
        message: 'Are you sure you want to delete all licenses? \n\nThis action cannot be undone.',
        confirmText: 'Delete All',
        cancelText: 'Cancel',
        type: 'danger'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (this.licenseService.deleteAllLicenses()) {
          // Update data source
          this.licensesDataSource = new MatTableDataSource<License>([]);
          
          // Refresh the settings object reference
          this.generalSettings = this.generalSettingsService.getGeneralSettings();
          
          this.notificationService.success('All licenses deleted successfully');
        } else {
          this.notificationService.error('Failed to delete licenses');
        }
      }
    });
  }

  /**
   * Delete all general settings after confirmation
   */
  deleteAllSettings(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete All Settings',
        message: 'Are you sure you want to delete all general settings? \n\nThis action cannot be undone.',
        confirmText: 'Delete All',
        cancelText: 'Cancel',
        type: 'danger'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Clear all settings
        this.generalSettingsService.deleteGeneralSettings();
        
        // Reset state
        this.generalSettings = null;
        this.hasSettings = false;
        this.licensesDataSource = new MatTableDataSource<License>([]);
        
        // Disable form
        this.acceptedStatesForm.disable();
        
        // Notification
        this.notificationService.success('All general settings deleted successfully');
      }
    });
  }

  /**
   * Sets up table functionality after view initialization.
   * Configures custom UI enhancements like ripple effects.
   */
  ngAfterViewInit(): void {
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
          const rippleContainer = button.querySelector('.icon-btn-ripple') as HTMLElement;
          if (!rippleContainer) return;

          // Remove existing ripples
          const existingRipples = rippleContainer.querySelectorAll('.icon-btn-ripple-effect');
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
   * Cleanup on component destruction
   */
  ngOnDestroy(): void {
    // Discard any unsaved new license
    if (this.isAddingNewLicense && this.newLicense) {
      this.isAddingNewLicense = false;
      this.newLicense = null;
    }
    
    this.destroy$.next();
    this.destroy$.complete();
  }
}

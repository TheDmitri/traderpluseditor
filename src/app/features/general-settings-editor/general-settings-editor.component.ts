import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StorageService } from '../../core/services/storage.service';
import { GeneralSettings, License } from '../../core/models/general-settings.model';
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

import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { NotificationService } from '../../shared/services/notification.service';

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

  /**
   * Constructor initializes necessary services
   * 
   * @param storageService - Service for storing and retrieving data
   * @param formBuilder - Angular form builder
   * @param dialog - Material dialog service
   * @param notificationService - Service for displaying notifications
   */
  constructor(
    private storageService: StorageService,
    private formBuilder: FormBuilder,
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
    this.acceptedStatesForm = this.formBuilder.group({
      worn: [false],
      damaged: [false],
      badly_damaged: [false],
      coefficientWorn: [0.0, [Validators.min(0), Validators.max(1)]],
      coefficientDamaged: [0.0, [Validators.min(0), Validators.max(1)]],
      coefficientBadlyDamaged: [0.0, [Validators.min(0), Validators.max(1)]]
    });

    // If settings exist, populate the form
    if (this.generalSettings && this.generalSettings.acceptedStates) {
      this.acceptedStatesForm.patchValue({
        worn: this.generalSettings.acceptedStates.worn,
        damaged: this.generalSettings.acceptedStates.damaged,
        badly_damaged: this.generalSettings.acceptedStates.badly_damaged,
        coefficientWorn: this.generalSettings.acceptedStates.coefficientWorn || 0.0,
        coefficientDamaged: this.generalSettings.acceptedStates.coefficientDamaged || 0.0,
        coefficientBadlyDamaged: this.generalSettings.acceptedStates.coefficientBadlyDamaged || 0.0
      });
    }

    // Only subscribe to form changes if settings exist
    if (this.hasSettings) {
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
   * Load general settings from storage
   */
  loadSettings(): void {
    this.generalSettings = this.storageService.generalSettings();
    
    // Check if settings exist or have been imported
    this.hasSettings = !!this.generalSettings;
    
    // Update the licenses data source if settings exist
    if (this.hasSettings && this.generalSettings!.licenses) {
      this.licensesDataSource.data = this.generalSettings!.licenses;
    } else {
      // Ensure we reset the data source when no settings exist
      this.licensesDataSource.data = [];
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
    // Create default settings
    this.generalSettings = {
      version: '2.0.0',
      serverID: this.generateGUID(),
      licenses: [],
      acceptedStates: {
        worn: false,
        damaged: false,
        badly_damaged: false,
        coefficientWorn: 0.0,
        coefficientDamaged: 0.0,
        coefficientBadlyDamaged: 0.0
      },
      traders: [],
      traderObjects: []
    };
    
    // Save the new settings
    this.storageService.saveGeneralSettings(this.generalSettings);
    
    // Update state
    this.hasSettings = true;
    
    // Reset and enable form
    this.acceptedStatesForm.reset({
      worn: false,
      damaged: false,
      badly_damaged: false,
      coefficientWorn: 0.0,
      coefficientDamaged: 0.0,
      coefficientBadlyDamaged: 0.0
    });
    this.acceptedStatesForm.enable();
    
    // Subscribe to form changes
    this.acceptedStatesForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.acceptedStatesForm.valid) {
          this.saveAcceptedStates();
        }
      });
    
    // Update UI
    this.licensesDataSource.data = [];
    
    // Show success message
    this.notificationService.success('General settings created successfully');
  }

  /**
   * Generate a GUID string for the server ID
   */
  private generateGUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0,
        v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }).toUpperCase();
  }

  /**
   * Save accepted states from form to settings
   */
  saveAcceptedStates(): void {
    if (!this.acceptedStatesForm.valid || !this.generalSettings) return;
    
    const formValue = this.acceptedStatesForm.value;
    
    this.generalSettings.acceptedStates = {
      worn: formValue.worn,
      damaged: formValue.damaged,
      badly_damaged: formValue.badly_damaged,
      coefficientWorn: parseFloat(formValue.coefficientWorn),
      coefficientDamaged: parseFloat(formValue.coefficientDamaged),
      coefficientBadlyDamaged: parseFloat(formValue.coefficientBadlyDamaged)
    };
    
    this.storageService.saveGeneralSettings(this.generalSettings);
  }

  /**
   * Add a new license directly to the table
   */
  addLicense(): void {
    if (!this.generalSettings) {
      return;
    }
    
    // Create a new empty license
    const newLicense: License = {
      licenseId: this.generateGUID(),  // Generate a new GUID for license ID
      licenseName: '',
      description: ''
    };
    
    // Initialize the licenses array if it doesn't exist
    if (!this.generalSettings.licenses) {
      this.generalSettings.licenses = [];
    }
    
    // Add the new license to the beginning of the array
    this.generalSettings.licenses.unshift(newLicense);
    
    // Update the data source
    this.licensesDataSource.data = [...this.generalSettings.licenses];
    
    // Set it as the currently editing license
    this.editingLicenseIndex = 0;
    this.editLicenseName = '';
    this.editLicenseDescription = '';
  }

  /**
   * Start editing a license
   * @param license - The license to edit
   * @param index - The index of the license in the array
   */
  startEditLicense(license: License, index: number): void {
    this.editingLicenseIndex = index;
    this.editLicenseName = license.licenseName || '';
    this.editLicenseDescription = license.description || '';
  }

  /**
   * Cancel editing a license
   */
  cancelEditLicense(): void {
    // If we're editing a new license with no name, remove it
    if (
      this.editingLicenseIndex === 0 &&
      this.generalSettings &&
      this.generalSettings.licenses &&
      this.generalSettings.licenses.length > 0 &&
      !this.generalSettings.licenses[0].licenseName
    ) {
      this.generalSettings.licenses.shift();
      this.licensesDataSource.data = [...this.generalSettings.licenses];
    }
    
    this.editingLicenseIndex = null;
  }

  /**
   * Check if the current license being edited can be saved
   * @returns true if the license has a non-empty name and can be saved
   */
  canSaveLicense(): boolean {
    return !!this.editLicenseName?.trim();
  }

  /**
   * Save the currently edited license
   */
  saveLicense(): void {
    if (
      this.editingLicenseIndex === null || 
      !this.generalSettings || 
      !this.generalSettings.licenses
    ) return;
    
    // Validate the license (name is required)
    const trimmedName = this.editLicenseName.trim();
    if (!trimmedName) {
      this.notificationService.error('License name is required');
      return;
    }
    
    const currentLicense = this.generalSettings.licenses[this.editingLicenseIndex];
    
    // Update the license in the array
    this.generalSettings.licenses[this.editingLicenseIndex] = {
      licenseId: currentLicense.licenseId || this.generateGUID(),
      licenseName: trimmedName,
      description: this.editLicenseDescription.trim()
    };
    
    // Save to storage
    this.storageService.saveGeneralSettings(this.generalSettings);
    
    // Update the data source
    this.licensesDataSource.data = [...this.generalSettings.licenses];
    
    // Reset editing state
    this.editingLicenseIndex = null;
    
    this.notificationService.success('License saved successfully');
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
        message: 'Are you sure you want to delete this license? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.generalSettings && this.generalSettings.licenses) {
        // Remove the license
        this.generalSettings.licenses.splice(index, 1);
        this.storageService.saveGeneralSettings(this.generalSettings);
        
        // Update the data source
        this.licensesDataSource.data = this.generalSettings.licenses;
        
        this.notificationService.success('License deleted successfully');
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
        message: 'Are you sure you want to delete all licenses? This action cannot be undone.',
        confirmText: 'Delete All',
        cancelText: 'Cancel',
        type: 'danger'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.generalSettings) {
        // Clear all licenses
        this.generalSettings.licenses = [];
        this.storageService.saveGeneralSettings(this.generalSettings);
        
        // Update the data source
        this.licensesDataSource.data = [];
        
        this.notificationService.success('All licenses deleted successfully');
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
        message: 'Are you sure you want to delete all general settings? This action cannot be undone.',
        confirmText: 'Delete All',
        cancelText: 'Cancel',
        type: 'danger'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Clear all settings
        this.storageService.removeGeneralSettings();
        
        // Reset state
        this.generalSettings = null;
        this.hasSettings = false;
        this.licensesDataSource.data = [];
        
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
   * Cleanup on component destruction
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

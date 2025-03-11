import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StorageService } from '../../../core/services/storage.service';
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

import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { NotificationService } from '../../../shared/services/notification.service';
import { LicenseModalComponent } from './license-modal/license-modal.component';

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

    // Monitor form changes to auto-save
    this.acceptedStatesForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.acceptedStatesForm.valid) {
          this.saveAcceptedStates();
        }
      });
  }

  /**
   * Load general settings from storage
   */
  loadSettings(): void {
    this.generalSettings = this.storageService.generalSettings();
    
    if (!this.generalSettings) {
      // Create default settings if none exist
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
      this.storageService.saveGeneralSettings(this.generalSettings);
    }
    
    this.hasSettings = true;
    
    // Update the licenses data source
    if (this.generalSettings.licenses) {
      this.licensesDataSource.data = this.generalSettings.licenses;
    }
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
   * Open dialog to add a new license
   */
  addLicense(): void {
    const dialogRef = this.dialog.open(LicenseModalComponent, {
      width: '500px',
      data: { license: { name: '', description: '' } }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.generalSettings) {
        // Create a new license with a unique ID
        const newLicense: License = {
          name: result.name,
          description: result.description
        };
        
        // Add to the licenses array
        if (!this.generalSettings.licenses) {
          this.generalSettings.licenses = [];
        }
        
        this.generalSettings.licenses.push(newLicense);
        this.storageService.saveGeneralSettings(this.generalSettings);
        
        // Update the data source
        this.licensesDataSource.data = this.generalSettings.licenses;
        
        this.notificationService.success('License added successfully');
      }
    });
  }

  /**
   * Open dialog to edit an existing license
   * 
   * @param license - The license to edit
   * @param index - The index of the license in the array
   */
  editLicense(license: License, index: number): void {
    const dialogRef = this.dialog.open(LicenseModalComponent, {
      width: '500px',
      data: { license: { ...license } }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.generalSettings && this.generalSettings.licenses) {
        // Update the license
        this.generalSettings.licenses[index] = {
          name: result.name,
          description: result.description
        };
        
        this.storageService.saveGeneralSettings(this.generalSettings);
        
        // Update the data source
        this.licensesDataSource.data = this.generalSettings.licenses;
        
        this.notificationService.success('License updated successfully');
      }
    });
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

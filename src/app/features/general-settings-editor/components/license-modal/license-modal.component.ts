import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { License } from '../../../../core/models/general-settings.model';

/**
 * Modal component for adding/editing licenses
 */
@Component({
  selector: 'app-license-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>{{ isEditMode ? 'Edit' : 'Add' }} License</h2>
    <div mat-dialog-content>
      <form [formGroup]="licenseForm">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>License Name</mat-label>
          <input matInput formControlName="name" placeholder="Enter license name">
          <mat-error *ngIf="licenseForm.get('name')?.hasError('required')">
            License name is required
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" placeholder="Enter license description" rows="3"></textarea>
        </mat-form-field>
      </form>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" [disabled]="licenseForm.invalid" (click)="onSave()">
        {{ isEditMode ? 'Update' : 'Add' }}
      </button>
    </div>
  `,
  styles: [`
    .full-width {
      width: 100%;
      margin-bottom: 1rem;
    }
  `]
})
export class LicenseModalComponent implements OnInit {
  /** Form group for license data */
  licenseForm!: FormGroup;
  
  /** Flag to determine if we're editing or adding a license */
  isEditMode = false;

  /**
   * Constructor initializes necessary dependencies
   * 
   * @param dialogRef - Reference to the dialog
   * @param data - Data passed to the dialog
   * @param formBuilder - Angular form builder
   */
  constructor(
    public dialogRef: MatDialogRef<LicenseModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { license: License },
    private formBuilder: FormBuilder
  ) { }

  /**
   * On component initialization, set up the form
   */
  ngOnInit(): void {
    this.isEditMode = !!this.data.license.name;
    
    this.licenseForm = this.formBuilder.group({
      name: [this.data.license.name || '', Validators.required],
      description: [this.data.license.description || '']
    });
  }

  /**
   * Handle save action
   */
  onSave(): void {
    if (this.licenseForm.valid) {
      this.dialogRef.close(this.licenseForm.value);
    }
  }

  /**
   * Handle cancel action
   */
  onCancel(): void {
    this.dialogRef.close();
  }
}

import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Category } from '../../../../core/models';

@Component({
  selector: 'app-category-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule
  ],
  template: `
    <h2 mat-dialog-title>{{ isEditMode ? 'Edit' : 'Create' }} Category</h2>
    <form [formGroup]="categoryForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content>
        <div class="form-container">
          <mat-form-field appearance="fill">
            <mat-label>Category Name</mat-label>
            <input matInput formControlName="categoryName" required>
            <mat-error *ngIf="categoryForm.get('categoryName')?.hasError('required')">
              Category name is required
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Icon</mat-label>
            <input matInput formControlName="icon" placeholder="e.g., shopping_cart">
            <mat-icon matSuffix>{{categoryForm.get('icon')?.value || 'category'}}</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="fill">
            <mat-label>Required Licenses (comma separated)</mat-label>
            <input matInput formControlName="licensesRequired" 
                   placeholder="e.g., license_weapons, license_trade">
          </mat-form-field>

          <mat-slide-toggle formControlName="isVisible">
            Visible
          </mat-slide-toggle>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" type="submit" 
                [disabled]="categoryForm.invalid">
          {{isEditMode ? 'Save' : 'Create'}}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .form-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 400px;
      padding: 8px;
    }
    mat-form-field {
      width: 100%;
    }
  `]
})
export class CategoryModalComponent implements OnInit {
  categoryForm: FormGroup;
  isEditMode: boolean;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CategoryModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { category?: Category }
  ) {
    this.isEditMode = !!data.category;
    this.categoryForm = this.fb.group({
      categoryName: ['', Validators.required],
      icon: [''],
      licensesRequired: [''],
      isVisible: [true]
    });
  }

  ngOnInit(): void {
    if (this.isEditMode && this.data.category) {
      this.categoryForm.patchValue({
        categoryName: this.data.category.categoryName,
        icon: this.data.category.icon,
        licensesRequired: this.data.category.licensesRequired.join(', '),
        isVisible: this.data.category.isVisible
      });
    }
  }

  onSubmit(): void {
    if (this.categoryForm.valid) {
      const formValue = this.categoryForm.value;
      const category: Partial<Category> = {
        categoryName: formValue.categoryName,
        icon: formValue.icon,
        isVisible: formValue.isVisible,
        licensesRequired: formValue.licensesRequired
          ? formValue.licensesRequired.split(',').map((s: string) => s.trim())
          : [],
        productIds: this.isEditMode ? this.data.category?.productIds : []
      };
      this.dialogRef.close(category);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
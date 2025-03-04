import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { Category, Product } from '../../../../core/models';
import { StorageService } from '../../../../core/services/storage.service';

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
    MatSlideToggleModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
  ],
  templateUrl: './category-modal.component.html',
  styleUrls: ['./category-modal.component.scss']
})
export class CategoryModalComponent implements OnInit {
  categoryForm: FormGroup;
  isEditMode: boolean;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CategoryModalComponent>,
    private storageService: StorageService,
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
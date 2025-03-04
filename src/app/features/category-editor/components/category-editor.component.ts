import { Component, OnInit, OnDestroy } from '@angular/core'; // Add OnDestroy
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatExpansionModule } from '@angular/material/expansion';
import { StorageService } from '../../../core/services/storage.service';
import { RouterModule } from '@angular/router';
import { Category } from '../../../core/models';
import { Subject, takeUntil } from 'rxjs'; // Add Subject and takeUntil

@Component({
  selector: 'app-category-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatSlideToggleModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    MatExpansionModule,
    RouterModule
  ],
  templateUrl: './category-editor.component.html',
  styleUrls: ['./category-editor.component.scss']
})
export class CategoryEditorComponent implements OnInit, OnDestroy { // Implement OnDestroy
  categoriesFormArray: FormArray = this.fb.array([]);
  private destroy$ = new Subject<void>(); // Add a Subject to manage subscriptions

  // Getter that casts the controls as FormGroup[]
  get categoriesControls(): FormGroup[] {
    return this.categoriesFormArray.controls as FormGroup[];
  }

  constructor(private fb: FormBuilder, private storageService: StorageService) {}

  ngOnInit(): void {
    const categories: Category[] = this.storageService.categories();
    categories.forEach(category => {
      this.categoriesFormArray.push(this.createCategoryForm(category));
    });

    // Listen to changes on every category and save the changes to the storage
    this.categoriesFormArray.controls.forEach((control, index) => {
      control.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value)=>{
        this.updateCategoryStorage(index, value);
      })
    });
  }

  ngOnDestroy(): void { // Implement OnDestroy method
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Method to remove all categories
  removeAllCategories(): void {
    // Clear form array
    this.categoriesFormArray.clear();
    // Save the empty list to LocalStorage
    this.storageService.saveCategories([]);
  }

  // Method to toggle visibility for all categories
  toggleAllCategoriesVisibility(): void {
    // Determine the current collective state:
    const allVisible = this.categoriesControls.every(group => group.get('isVisible')?.value === true);
    const newVisibility = !allVisible;
    // Set the new visibility for every category
    this.categoriesControls.forEach((group, index) => {
      group.get('isVisible')?.setValue(newVisibility);
      const formValues = group.value;
      this.updateCategoryStorage(index, formValues);
    });
  }

  createCategoryForm(category: Category): FormGroup {
    return this.fb.group({
      categoryId: [category.categoryId],
      categoryName: [category.categoryName],
      icon: [category.icon],
      isVisible: [category.isVisible],
      licensesRequired: [category.licensesRequired.join(', ')],
      productIds: [category.productIds.join(', ')],
      categoryType: [category.categoryType]
    });
  }

  parseCommaSeparated(value: string): string[] {
    return value.split(',').map(v => v.trim()).filter(v => v);
  }

  addCategory(): void {
    const newCategory: Category = {
      categoryId: this.generateCategoryId(),
      categoryName: '',
      icon: '',
      isVisible: true,
      licensesRequired: [],
      productIds: []
    };
    const formGroup = this.createCategoryForm(newCategory);
    this.categoriesFormArray.push(formGroup);
    this.storageService.saveCategories([...this.storageService.categories(), newCategory]);

    // Subscribe to the changes of the new created entry
    formGroup.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value)=>{
      this.updateCategoryStorage(this.categoriesFormArray.length-1, value);
    })
  }

  removeCategory(index: number): void {
    const formGroup = this.categoriesFormArray.at(index);
    const categoryIdToRemove = formGroup.get('categoryId')?.value;

    // Remove from form array
    this.categoriesFormArray.removeAt(index);

    // Get current categories from storage and remove the specific one
    const currentCategories = this.storageService.categories();
    const updatedCategories = currentCategories.filter(category => category.categoryId !== categoryIdToRemove);

    // Save filtered categories back to storage
    this.storageService.saveCategories(updatedCategories);
  }

  generateCategoryId(): string {
    // Simple implementation: "cat_new_001".
    // In a real application, ensure uniqueness based on existing IDs.
    return 'cat_new_' + (this.categoriesFormArray.length + 1).toString().padStart(3, '0');
  }

  // Method to update the storage with the new data
  private updateCategoryStorage(index: number, value: any): void {
    const currentCategories = this.storageService.categories();
    const updatedCategory: Category = {
        categoryId: value.categoryId,
        categoryName: value.categoryName,
        icon: value.icon,
        isVisible: value.isVisible,
        licensesRequired: this.parseCommaSeparated(value.licensesRequired),
        productIds: this.parseCommaSeparated(value.productIds),
        categoryType: value.categoryType
      };

    currentCategories[index] = updatedCategory;
    this.storageService.saveCategories([...currentCategories]);
  }
}

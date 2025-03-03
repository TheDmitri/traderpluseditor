import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { StorageService } from '../../../core/services/storage.service';
import { Category } from '../../../core/models';

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
    MatButtonModule
  ],
  templateUrl: './category-editor.component.html',
  styleUrls: ['./category-editor.component.scss']
})
export class CategoryEditorComponent implements OnInit {

  categoriesFormArray: FormArray = this.fb.array([]);

  // Getter, der die Controls als FormGroup[] castet
  get categoriesControls(): FormGroup[] {
    return this.categoriesFormArray.controls as FormGroup[];
  }

  constructor(private fb: FormBuilder, private storageService: StorageService) {}

  ngOnInit(): void {
    const categories: Category[] = this.storageService.categories();
    categories.forEach(category => {
      this.categoriesFormArray.push(this.createCategoryForm(category));
    });

    // Auto-save: sobald sich ein Feld ändert, werden die aktualisierten Kategorien im LocalStorage gespeichert.
    this.categoriesFormArray.valueChanges.subscribe((values) => {
      const updatedCategories: Category[] = values.map((v: any) => ({
        categoryId: v.categoryId,
        categoryName: v.categoryName,
        icon: v.icon,
        isVisible: v.isVisible,
        licensesRequired: this.parseCommaSeparated(v.licensesRequired),
        productIds: this.parseCommaSeparated(v.productIds),
        categoryType: v.categoryType
      }));
      this.storageService.saveCategories(updatedCategories);
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
    this.categoriesFormArray.push(this.createCategoryForm(newCategory));
    const currentCategories: Category[] = this.storageService.categories();
    this.storageService.saveCategories([...currentCategories, newCategory]);
  }
  
  removeCategory(index: number): void {
    const formGroup = this.categoriesFormArray.at(index);
    const categoryId = formGroup.get('categoryId')?.value;
    this.categoriesFormArray.removeAt(index);
    const currentCategories: Category[] = this.storageService.categories();
    const updatedCategories = currentCategories.filter(cat => cat.categoryId !== categoryId);
    this.storageService.saveCategories(updatedCategories);
  }

  generateCategoryId(): string {
    // Einfache Implementierung: "cat_new_001".
    // Prüfe in einer realen Anwendung die Eindeutigkeit anhand existierender IDs.
    return 'cat_new_' + (this.categoriesFormArray.length + 1).toString().padStart(3, '0');
  }
}
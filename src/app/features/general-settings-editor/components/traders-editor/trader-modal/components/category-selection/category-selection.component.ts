import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

// Application imports
import { Category } from '../../../../../../../core/models';
import { TraderCategoryService } from '../../../../../services/trader-category.service';

@Component({
  selector: 'app-category-selection',
  standalone: true,
  imports: [
    CommonModule,
    MatCheckboxModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './category-selection.component.html',
  styleUrls: ['./category-selection.component.scss']
})
export class CategorySelectionComponent implements OnInit {
  @Input() categoryIds: string[] = [];
  @Output() categoriesChange = new EventEmitter<string[]>();
  
  constructor(private traderCategoryService: TraderCategoryService) {}

  ngOnInit(): void {
    this.traderCategoryService.loadCategories(this.categoryIds);
  }

  /**
   * Get available categories
   */
  getAvailableCategories(): Category[] {
    return this.traderCategoryService.getAvailableCategories();
  }

  /**
   * Get unknown category IDs
   */
  getUnknownCategoryIds(): string[] {
    return this.traderCategoryService.getUnknownCategoryIds();
  }

  /**
   * Get categories sorted with selected ones at the top
   */
  getSortedCategories(): Category[] {
    return this.traderCategoryService.getSortedCategories();
  }

  /**
   * Get unknown categories formatted for display
   */
  getUnknownCategoriesForDisplay(): Category[] {
    return this.traderCategoryService.getUnknownCategoriesForDisplay();
  }

  /**
   * Check if a category ID is unknown
   */
  isUnknownCategory(categoryId: string): boolean {
    return this.traderCategoryService.isUnknownCategory(categoryId);
  }

  /**
   * Toggle a category selection and update parent component
   */
  toggleCategory(categoryId: string): void {
    this.traderCategoryService.toggleCategory(categoryId);
    this.emitCategoryChange();
  }

  /**
   * Check if a category is selected
   */
  isCategorySelected(categoryId: string): boolean {
    return this.traderCategoryService.isCategorySelected(categoryId);
  }

  /**
   * Get the list of selected category IDs
   */
  getSelectedCategoryIds(): string[] {
    return this.traderCategoryService.getSelectedCategoryIds();
  }

  /**
   * Emit category change event to parent component
   */
  private emitCategoryChange(): void {
    this.categoriesChange.emit(this.getSelectedCategoryIds());
  }
}

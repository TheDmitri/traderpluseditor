/**
 * Category model based on TraderPlusCategory.c
 */
export interface Category {
  categoryId: string;  // Format: "cat_[lowercase_name]_[counter]" (e.g., "cat_weapons_001")
  categoryName: string;
  icon: string;
  isVisible: boolean;
  licensesRequired: string[];
  productIds: string[];
  className?: string[];
  categoryType?: number;
}

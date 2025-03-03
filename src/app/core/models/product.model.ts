/**
 * Product model based on TraderPlusProduct.c
 */
export interface Product {
  productId: string;  // Format: "prod_[lowercase_name]_[counter]" (e.g., "prod_m4a1_001")
  className: string;
  coefficient: number;
  maxStock: number;
  tradeQuantity: number;
  buyPrice: number;
  sellPrice: number;
  stockSettings: number; // Combined destock coefficient and behavior
  attachments: string[];
  variants: string[];
}

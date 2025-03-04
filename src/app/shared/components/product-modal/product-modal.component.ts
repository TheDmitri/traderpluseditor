import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Product } from '../../../core/models';
import { StorageService } from '../../../core/services/storage.service';
import { TextFieldModule } from '@angular/cdk/text-field';

@Component({
  selector: 'app-product-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    TextFieldModule,
],
  templateUrl: './product-modal.component.html',
  styleUrls: ['./product-modal.component.scss']
})
export class ProductModalComponent implements OnInit {
  productForm: FormGroup;
  isEditMode: boolean;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ProductModalComponent>,
    private storageService: StorageService,
    @Inject(MAT_DIALOG_DATA) public data: { 
      product?: Product;
      categoryId?: string; // Optional category ID when called from category-modal
    }
  ) {
    this.dialogRef.disableClose = true;
    this.isEditMode = !!data.product;
    
    this.productForm = this.fb.group({
      className: ['', Validators.required],
      coefficient: [1, [Validators.required, Validators.min(0)]],
      maxStock: [100, [Validators.required, Validators.min(0)]],
      tradeQuantity: [1, [Validators.required, Validators.min(1)]],
      buyPrice: [0, [Validators.required, Validators.min(0)]],
      sellPrice: [0, [Validators.required, Validators.min(0)]],
      stockSettings: [0, [Validators.required, Validators.min(0)]],
      attachments: [''],
      variants: ['']
    });
  }

  ngOnInit(): void {
    if (this.isEditMode && this.data.product) {
      this.productForm.patchValue({
        ...this.data.product,
        attachments: this.data.product.attachments?.join(', ') || '',
        variants: this.data.product.variants?.join(', ') || ''
      });
    }
  }

  onSubmit(): void {
    if (this.productForm.valid) {
      const formValue = this.productForm.value;
      const product: Partial<Product> = {
        ...formValue,
        productId: this.isEditMode ? this.data.product?.productId : crypto.randomUUID(),
        attachments: formValue.attachments ? formValue.attachments.split(',').map((s: string) => s.trim()) : [],
        variants: formValue.variants ? formValue.variants.split(',').map((s: string) => s.trim()) : []
      };

      this.dialogRef.close({
        product,
        categoryId: this.data.categoryId
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
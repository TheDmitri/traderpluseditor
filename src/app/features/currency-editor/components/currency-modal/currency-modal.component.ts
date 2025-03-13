import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

// Application imports
import { Currency, CurrencyType } from '../../../../core/models';

export interface CurrencyModalData {
  currencyType: CurrencyType;
  readOnly?: boolean;
}

@Component({
  selector: 'app-currency-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    MatExpansionModule
  ],
  templateUrl: './currency-modal.component.html',
  styleUrls: ['./currency-modal.component.scss']
})
export class CurrencyModalComponent implements OnInit {
  // Direct array of currencies for read-only display
  currencies: Currency[] = [];
  
  // Form for adding new currencies
  newCurrencyForm: FormGroup;

  // Expansion panel state
  expansionPanelOpen = false;
  
  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<CurrencyModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CurrencyModalData
  ) {
    // Initialize the form for adding new currencies
    this.newCurrencyForm = this.fb.group({
      className: ['', [
        Validators.required,
        this.uniqueClassNameValidator()
      ]],
      value: [null, [Validators.required, Validators.min(0)]]
    });
  }
  
  ngOnInit(): void {
    // Initialize the currencies array with sorted data
    if (this.data.currencyType.currencies) {
      this.currencies = [...this.data.currencyType.currencies]
        .sort((a, b) => b.value - a.value);
    }
  }
  
  /**
   * Add a new currency to the list
   */
  addNewCurrency(): void {
    if (this.newCurrencyForm.valid) {
      // Create new currency from form values
      const newCurrency: Currency = {
        className: this.newCurrencyForm.get('className')?.value,
        value: this.newCurrencyForm.get('value')?.value
      };
      
      // Add to the list
      this.currencies.push(newCurrency);
      
      // Sort currencies by value (descending)
      this.sortCurrencies();
      
      // Reset the form
      this.newCurrencyForm.reset();
      
      // Update validators to consider the newly added currency
      this.updateValidators();
    }
  }
  
  /**
   * Remove a currency from the list
   * @param index Index of the currency to remove
   */
  removeCurrency(index: number): void {
    this.currencies.splice(index, 1);
    
    // Update validators after removing a currency
    this.updateValidators();
  }
  
  /**
   * Sort currencies by value in descending order
   */
  sortCurrencies(): void {
    this.currencies.sort((a, b) => b.value - a.value);
  }
  
  /**
   * Update validators for the new currency form
   */
  updateValidators(): void {
    // Re-set the className validator to check against the current currencies list
    const classNameControl = this.newCurrencyForm.get('className');
    classNameControl?.clearValidators();
    classNameControl?.setValidators([
      Validators.required,
      this.uniqueClassNameValidator()
    ]);
    classNameControl?.updateValueAndValidity({ emitEvent: false });
  }
  
  /**
   * Validator to ensure unique class names
   */
  uniqueClassNameValidator(): ValidatorFn {
    return (control: AbstractControl): {[key: string]: any} | null => {
      if (!control.value) {
        return null;
      }
      
      const className = control.value;
      
      // Check if className exists in current currencies
      const exists = this.currencies.some(
        currency => currency.className === className
      );
      
      return exists ? { 'duplicate': { value: className } } : null;
    };
  }
  
  /**
   * Save changes and close the dialog
   */
  onSave(): void {
    // Update currency type with current currencies
    const updatedCurrencyType: CurrencyType = {
      ...this.data.currencyType,
      currencies: this.currencies
    };
    
    // Return updated currency type to the caller
    this.dialogRef.close(updatedCurrencyType);
  }
  
  /**
   * Cancel changes and close the dialog
   */
  onCancel(): void {
    this.dialogRef.close();
  }
}

import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, ValidatorFn, AbstractControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion'; // Neu hinzugefügt
import { CurrencyType, Currency } from '../../../../core/models';

export interface DenominationModalData {
  currencyType: CurrencyType;
  readOnly?: boolean;
}

@Component({
  selector: 'app-denomination-modal',
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
    MatExpansionModule // Neu hinzugefügt
  ],
  templateUrl: './denomination-modal.component.html',
  styleUrls: ['./denomination-modal.component.scss']
})
export class DenominationModalComponent implements OnInit {
  // Direct array of denominations for read-only display
  denominations: Currency[] = [];
  
  // Form for adding new denominations
  newDenominationForm: FormGroup;

  // Expansion panel state
  expansionPanelOpen = false;
  
  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<DenominationModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DenominationModalData
  ) {
    // Initialize the form for adding new denominations
    this.newDenominationForm = this.fb.group({
      className: ['', [
        Validators.required,
        this.uniqueClassNameValidator()
      ]],
      value: [null, [Validators.required, Validators.min(0)]]
    });
  }
  
  ngOnInit(): void {
    // Initialize the denominations array with sorted data
    if (this.data.currencyType.currencies) {
      this.denominations = [...this.data.currencyType.currencies]
        .sort((a, b) => b.value - a.value);
    }
  }
  
  /**
   * Add a new denomination to the list
   */
  addNewDenomination(): void {
    if (this.newDenominationForm.valid) {
      // Create new denomination from form values
      const newDenomination: Currency = {
        className: this.newDenominationForm.get('className')?.value,
        value: this.newDenominationForm.get('value')?.value
      };
      
      // Add to the list
      this.denominations.push(newDenomination);
      
      // Sort denominations by value (descending)
      this.sortDenominations();
      
      // Reset the form
      this.newDenominationForm.reset();
      
      // Update validators to consider the newly added denomination
      this.updateValidators();
    }
  }
  
  /**
   * Remove a denomination from the list
   * @param index Index of the denomination to remove
   */
  removeDenomination(index: number): void {
    this.denominations.splice(index, 1);
    
    // Update validators after removing a denomination
    this.updateValidators();
  }
  
  /**
   * Sort denominations by value in descending order
   */
  sortDenominations(): void {
    this.denominations.sort((a, b) => b.value - a.value);
  }
  
  /**
   * Update validators for the new denomination form
   */
  updateValidators(): void {
    // Re-set the className validator to check against the current denominations list
    const classNameControl = this.newDenominationForm.get('className');
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
      
      // Check if className exists in current denominations
      const exists = this.denominations.some(
        denomination => denomination.className === className
      );
      
      return exists ? { 'duplicate': { value: className } } : null;
    };
  }
  
  /**
   * Save changes and close the dialog
   */
  onSave(): void {
    // Update currency type with current denominations
    const updatedCurrencyType: CurrencyType = {
      ...this.data.currencyType,
      currencies: this.denominations
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

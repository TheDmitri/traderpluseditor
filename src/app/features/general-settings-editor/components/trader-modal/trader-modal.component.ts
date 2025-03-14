import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRadioModule } from '@angular/material/radio';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';

// Application imports
import { TraderNpc } from '../../../../core/models/general-settings.model';
import { CategorySelectionComponent } from '../category-selection/category-selection.component';
import { CurrencySelectionComponent } from '../currency-selection/currency-selection.component';

/**
 * Enum for trader types
 */
export enum TraderType {
  NPC = 'NPC',
  ATM = 'ATM',
  OBJECT = 'OBJECT'
}

/**
 * Component for adding/editing trader NPCs in a modal dialog
 */
@Component({
  selector: 'app-trader-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatRadioModule,
    MatExpansionModule,
    MatCheckboxModule,
    CategorySelectionComponent,
    CurrencySelectionComponent
  ],
  templateUrl: './trader-modal.component.html',
  styleUrls: ['./trader-modal.component.scss']
})
export class TraderModalComponent implements OnInit {
  /** Form group for trader data */
  traderForm: FormGroup;
  
  /** Title for the dialog */
  dialogTitle: string;
  
  /** Flag to track if this is a new trader */
  isNewTrader: boolean;

  /** Available trader types enum for template */
  traderTypes = TraderType;

  /** Selected category IDs */
  selectedCategoryIds: string[] = [];

  /** Selected currency names */
  selectedCurrencyNames: string[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TraderModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { trader: TraderNpc | null }
  ) {
    // Disable closing the dialog by clicking outside or pressing ESC key
    this.dialogRef.disableClose = true;
    
    this.isNewTrader = !data.trader || !data.trader.className;
    this.dialogTitle = this.isNewTrader ? 'Add New Trader' : 'Edit Trader';
    
    // Initialize form with empty values and custom validation
    this.traderForm = this.fb.group({
      type: [TraderType.NPC, Validators.required],
      npcId: [{ value: 0, disabled: true }],
      className: ['', [Validators.required, this.noSpecialCharsValidator()]],
      givenName: ['', Validators.required],
      role: [''],
      positionX: [0, Validators.required],
      positionY: [0, Validators.required],
      positionZ: [0, Validators.required],
      orientationX: [0, Validators.required],
      orientationY: [0, Validators.required],
      orientationZ: [0, Validators.required]
    });

    // React to type changes
    this.traderForm.get('type')?.valueChanges.subscribe((type: TraderType) => {
      this.handleTraderTypeChange(type);
    });
  }

  ngOnInit(): void {
    // If we have existing trader data, populate the form and determine type
    if (this.data.trader) {
      const trader = this.data.trader;
      
      // Determine trader type based on data
      let traderType = TraderType.NPC;
      if (trader.npcId === -2 && trader.className === 'TraderPlus_BANK_ATM') {
        traderType = TraderType.ATM;
      } else if (trader.className && !trader.loadouts?.length) {
        // If it has a className but no loadouts, assume it's an object
        // This is a simple heuristic, might need refinement
        traderType = TraderType.OBJECT;
      }
      
      this.traderForm.patchValue({
        type: traderType,
        npcId: trader.npcId,
        className: trader.className,
        givenName: trader.givenName,
        role: trader.role || '',
        positionX: trader.position?.[0] || 0,
        positionY: trader.position?.[1] || 0,
        positionZ: trader.position?.[2] || 0,
        orientationX: trader.orientation?.[0] || 0,
        orientationY: trader.orientation?.[1] || 0,
        orientationZ: trader.orientation?.[2] || 0
      });

      // Initialize selected categories and currencies from trader data
      this.selectedCategoryIds = trader.categoriesId || [];
      this.selectedCurrencyNames = trader.currenciesAccepted || [];

      // Lock fields if it's an ATM
      if (traderType === TraderType.ATM) {
        this.traderForm.get('givenName')?.disable();
        this.traderForm.get('role')?.disable();
        this.traderForm.get('className')?.disable();
      }
    }
  }

  /**
   * Handle changes to the trader type
   */
  handleTraderTypeChange(type: TraderType): void {
    const classnameControl = this.traderForm.get('className');
    const givenNameControl = this.traderForm.get('givenName');
    const roleControl = this.traderForm.get('role');
    const idControl = this.traderForm.get('npcId');

    // Reset to enabled state
    classnameControl?.enable();
    givenNameControl?.enable();
    roleControl?.enable();

    switch (type) {
      case TraderType.ATM:
        // Set fixed values for ATM
        idControl?.setValue(-2);
        classnameControl?.setValue('TraderPlus_BANK_ATM');
        givenNameControl?.setValue('ATM');
        roleControl?.setValue('ATM');
        
        // Disable fields that shouldn't be changed for ATM
        classnameControl?.disable();
        givenNameControl?.disable();
        roleControl?.disable();
        break;

      case TraderType.NPC:
      case TraderType.OBJECT:
        // If switching from ATM, reset these values only if they match ATM defaults
        if (this.isNewTrader || givenNameControl?.value === 'ATM') {
          givenNameControl?.setValue('');
        }
        if (this.isNewTrader || roleControl?.value === 'ATM') {
          roleControl?.setValue('');
        }
        if (this.isNewTrader || classnameControl?.value === 'TraderPlus_BANK_ATM') {
          classnameControl?.setValue('');
        }

        // Set next available ID
        this.setNextAvailableId();
        break;
    }
  }

  /**
   * Set the next available ID for the trader
   */
  setNextAvailableId(): void {
    const type = this.traderForm.get('type')?.value;
    if (type !== TraderType.ATM) {
      // Using a placeholder value of 0 since we don't directly interact with TraderService here
      this.traderForm.get('npcId')?.setValue(0);
    }
  }

  /**
   * Handle category selection changes
   */
  onCategoriesChange(categoryIds: string[]): void {
    this.selectedCategoryIds = categoryIds;
  }

  /**
   * Handle currency selection changes
   */
  onCurrenciesChange(currencyNames: string[]): void {
    this.selectedCurrencyNames = currencyNames;
  }

  /**
   * Submit the form data and close the dialog
   */
  onSubmit(): void {
    if (this.traderForm.invalid) {
      return;
    }
    
    // Get raw value to include disabled controls
    const formValue = this.traderForm.getRawValue();
    const traderType = formValue.type;
    
    // Build the trader object with all properties
    let trader: TraderNpc = {
      npcId: formValue.npcId,
      className: formValue.className.trim(),
      givenName: formValue.givenName.trim(),
      role: formValue.role.trim(),
      position: [formValue.positionX, formValue.positionY, formValue.positionZ],
      orientation: [formValue.orientationX, formValue.orientationY, formValue.orientationZ],
      categoriesId: this.selectedCategoryIds,
      currenciesAccepted: this.selectedCurrencyNames,
      loadouts: this.data.trader?.loadouts || []
    };
    
    // Clean the trader properties based on trader type
    trader = this.sanitizeTraderByType(trader, traderType);
    
    this.dialogRef.close({ trader, traderType });
  }
  
  /**
   * Sanitize the trader object based on trader type
   * Remove properties that shouldn't be included for specific trader types
   */
  sanitizeTraderByType(trader: TraderNpc, traderType: TraderType): TraderNpc {
    switch (traderType) {
      case TraderType.ATM:
        // ATMs should not have categories or loadouts, but can accept currencies
        return {
          ...trader,
          // ATM specific properties
          npcId: -2,
          className: 'TraderPlus_BANK_ATM',
          givenName: 'ATM',
          role: 'ATM',
          // Clear categories and loadouts, but keep currencies
          categoriesId: [],
          currenciesAccepted: trader.currenciesAccepted, // Keep currencies for ATMs
          loadouts: []
        };
        
      case TraderType.OBJECT:
        // Objects can have categories and currencies but not loadouts
        return {
          ...trader,
          loadouts: [] // Clear loadouts for objects
        };
        
      case TraderType.NPC:
      default:
        // NPCs can have all properties, keep as is
        return trader;
    }
  }

  /**
   * Close the dialog without saving
   */
  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Custom validator to prevent spaces and special characters in className
   */
  noSpecialCharsValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      // Allow only alphanumeric characters and underscores
      // Regex pattern: ^ start of string, \w alphanumeric and underscore, $ end of string
      const validPattern = /^[\w]+$/;
      
      const valid = validPattern.test(control.value);
      
      // Skip validation if empty (will be caught by required validator)
      if (!control.value) {
        return null;
      }
      
      return !valid ? { invalidCharacters: true } : null;
    };
  }

  /**
   * Check if className has space or special character error
   */
  hasClassNameSpecialCharError(): boolean {
    const control = this.traderForm.get('className');
    return control ? control.hasError('invalidCharacters') && (control.touched || control.dirty) : false;
  }
}

import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRadioModule } from '@angular/material/radio';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox'; // Add checkbox module
import { FormsModule } from '@angular/forms'; // Add FormsModule for ngModel

// Application imports
import { TraderNpc } from '../../../../core/models/general-settings.model';
import { Category, CurrencyType } from '../../../../core/models'; // Add CurrencyType import
import { TraderService } from '../../services/trader.service';
import { CategoryService } from '../../../category-editor/services/category.service'; // Import CategoryService
import { CurrencyService } from '../../../currency-editor/services/currency.service'; // Import CurrencyService

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
    FormsModule, // Add FormsModule
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatRadioModule,
    MatExpansionModule,
    MatCheckboxModule // Add checkbox module
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

  /** Available categories from CategoryService */
  availableCategories: Category[] = [];
  
  /** Selected category IDs map for quick lookup and state tracking */
  selectedCategoryIdMap: { [categoryId: string]: boolean } = {};

  /** Unknown category IDs that exist in trader but not in available categories */
  unknownCategoryIds: string[] = [];

  /** Available currency types from CurrencyService */
  availableCurrencyTypes: CurrencyType[] = [];
  
  /** Selected currency names map for quick lookup and state tracking */
  selectedCurrencyNameMap: { [currencyName: string]: boolean } = {};

  /** Unknown currency names that exist in trader but not in available currency types */
  unknownCurrencyNames: string[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TraderModalComponent>,
    private traderService: TraderService,
    private categoryService: CategoryService, // Inject CategoryService
    private currencyService: CurrencyService, // Inject CurrencyService
    @Inject(MAT_DIALOG_DATA) public data: { trader: TraderNpc | null }
  ) {
    this.isNewTrader = !data.trader || !data.trader.className;
    this.dialogTitle = this.isNewTrader ? 'Add New Trader' : 'Edit Trader';
    
    // Initialize form with empty values
    this.traderForm = this.fb.group({
      type: [TraderType.NPC, Validators.required],
      npcId: [{ value: 0, disabled: true }],
      className: ['', Validators.required],
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
    // Load available categories and currencies
    this.loadCategories();
    this.loadCurrencies();
    
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
      this.initializeSelectedCategories(trader.categoriesId || []);
      this.initializeSelectedCurrencies(trader.currenciesAccepted || []);

      // Lock fields if it's an ATM
      if (traderType === TraderType.ATM) {
        this.traderForm.get('givenName')?.disable();
        this.traderForm.get('role')?.disable();
        this.traderForm.get('className')?.disable();
      }
    } else {
      // For new traders, determine and set the next available ID
      this.setNextAvailableId();
    }
  }

  /**
   * Load categories from the CategoryService and identify unknown categories
   */
  loadCategories(): void {
    // Get categories from the CategoryService
    this.availableCategories = this.categoryService.getExportData();

    // After loading categories, check for unknown category IDs if we have a trader
    if (this.data.trader?.categoriesId?.length) {
      this.identifyUnknownCategories(this.data.trader.categoriesId);
    }
  }

  /**
   * Load currencies from the CurrencyService and identify unknown currencies
   */
  loadCurrencies(): void {
    // Get currency settings from the CurrencyService
    const currencySettings = this.currencyService.loadCurrencySettings();
    this.availableCurrencyTypes = currencySettings?.currencyTypes || [];

    // After loading currencies, check for unknown currencies if we have a trader
    if (this.data.trader?.currenciesAccepted?.length) {
      this.identifyUnknownCurrencies(this.data.trader.currenciesAccepted);
    }
  }

  /**
   * Find category IDs assigned to the trader that don't exist in availableCategories
   */
  identifyUnknownCategories(categoryIds: string[]): void {
    this.unknownCategoryIds = categoryIds.filter(id => 
      !this.availableCategories.some(category => category.categoryId === id)
    );
  }

  /**
   * Find currency names assigned to the trader that don't exist in availableCurrencyTypes
   */
  identifyUnknownCurrencies(currencyNames: string[]): void {
    this.unknownCurrencyNames = currencyNames.filter(name => 
      !this.availableCurrencyTypes.some(currencyType => currencyType.currencyName === name)
    );
  }

  /**
   * Initialize selected categories from trader data
   */
  initializeSelectedCategories(categoryIds: string[]): void {
    // Reset map
    this.selectedCategoryIdMap = {};
    
    // Set selected state for each category ID
    categoryIds.forEach(id => {
      this.selectedCategoryIdMap[id] = true;
    });

    // Identify unknown categories
    this.identifyUnknownCategories(categoryIds);
  }

  /**
   * Initialize selected currencies from trader data
   */
  initializeSelectedCurrencies(currencyNames: string[]): void {
    // Reset map
    this.selectedCurrencyNameMap = {};
    
    // Set selected state for each currency name
    currencyNames.forEach(name => {
      this.selectedCurrencyNameMap[name] = true;
    });

    // Identify unknown currencies
    this.identifyUnknownCurrencies(currencyNames);
  }

  /**
   * Get categories sorted with selected ones at the top
   * This will be used in the template instead of directly using availableCategories
   */
  getSortedCategories(): Category[] {
    if (!this.availableCategories || this.availableCategories.length === 0) {
      return [];
    }
    
    // Create a copy of the categories array to avoid modifying the original
    return [...this.availableCategories].sort((a, b) => {
      const isASelected = this.isCategorySelected(a.categoryId);
      const isBSelected = this.isCategorySelected(b.categoryId);
      
      // If A is selected and B is not, A comes first
      if (isASelected && !isBSelected) {
        return -1;
      }
      
      // If B is selected and A is not, B comes first
      if (!isASelected && isBSelected) {
        return 1;
      }
      
      // If both are selected or both are unselected, maintain original order
      // This keeps the sorting stable within each group
      return 0;
    });
  }

  /**
   * Get currencies sorted with selected ones at the top
   */
  getSortedCurrencyTypes(): CurrencyType[] {
    if (!this.availableCurrencyTypes || this.availableCurrencyTypes.length === 0) {
      return [];
    }
    
    // Create a copy of the currencies array to avoid modifying the original
    return [...this.availableCurrencyTypes].sort((a, b) => {
      const isASelected = this.isCurrencySelected(a.currencyName);
      const isBSelected = this.isCurrencySelected(b.currencyName);
      
      // If A is selected and B is not, A comes first
      if (isASelected && !isBSelected) {
        return -1;
      }
      
      // If B is selected and A is not, B comes first
      if (!isASelected && isBSelected) {
        return 1;
      }
      
      // If both are selected or both are unselected, maintain original order
      return 0;
    });
  }

  /**
   * Get unknown categories formatted for display
   * Creates simplified category objects for unknown category IDs
   */
  getUnknownCategoriesForDisplay(): Category[] {
    return this.unknownCategoryIds.map(id => ({
      categoryId: id,
      categoryName: 'Unknown Category',
      icon: '',
      isVisible: true,
      licensesRequired: [],
      productIds: []
    }));
  }

  /**
   * Get unknown currencies formatted for display
   */
  getUnknownCurrenciesForDisplay(): CurrencyType[] {
    return this.unknownCurrencyNames.map(name => ({
      currencyName: name,
      currencies: []
    }));
  }

  /**
   * Check if a category ID is unknown
   */
  isUnknownCategory(categoryId: string): boolean {
    return this.unknownCategoryIds.includes(categoryId);
  }

  /**
   * Check if a currency is unknown
   */
  isUnknownCurrency(currencyName: string): boolean {
    return this.unknownCurrencyNames.includes(currencyName);
  }

  /**
   * Toggle a category selection and update sorting
   */
  toggleCategory(categoryId: string): void {
    this.selectedCategoryIdMap[categoryId] = !this.selectedCategoryIdMap[categoryId];
    // The sorting will update automatically when the template calls getSortedCategories()
  }

  /**
   * Toggle a currency selection
   */
  toggleCurrency(currencyName: string): void {
    this.selectedCurrencyNameMap[currencyName] = !this.selectedCurrencyNameMap[currencyName];
  }

  /**
   * Check if a category is selected
   */
  isCategorySelected(categoryId: string): boolean {
    return !!this.selectedCategoryIdMap[categoryId];
  }

  /**
   * Check if a currency is selected
   */
  isCurrencySelected(currencyName: string): boolean {
    return !!this.selectedCurrencyNameMap[currencyName];
  }

  /**
   * Get the list of selected category IDs
   */
  getSelectedCategoryIds(): string[] {
    return Object.keys(this.selectedCategoryIdMap).filter(id => this.selectedCategoryIdMap[id]);
  }

  /**
   * Get the list of selected currency names
   */
  getSelectedCurrencyNames(): string[] {
    return Object.keys(this.selectedCurrencyNameMap).filter(name => this.selectedCurrencyNameMap[name]);
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
      const nextId = this.traderService.getNextTraderId();
      this.traderForm.get('npcId')?.setValue(nextId);
    }
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
    
    // Get the selected category IDs and currency names
    const selectedCategoryIds = this.getSelectedCategoryIds();
    const selectedCurrencyNames = this.getSelectedCurrencyNames();
    
    // Build the trader object
    const trader: TraderNpc = {
      npcId: formValue.npcId,
      className: formValue.className.trim(),
      givenName: formValue.givenName.trim(),
      role: formValue.role.trim(),
      position: [formValue.positionX, formValue.positionY, formValue.positionZ],
      orientation: [formValue.orientationX, formValue.orientationY, formValue.orientationZ],
      categoriesId: selectedCategoryIds, // Use the selected category IDs
      currenciesAccepted: selectedCurrencyNames, // Use the selected currency names
      // Only include loadouts for NPC type
      loadouts: traderType === TraderType.NPC ? (this.data.trader?.loadouts || []) : []
    };
    
    this.dialogRef.close({ trader, traderType });
  }

  /**
   * Close the dialog without saving
   */
  onCancel(): void {
    this.dialogRef.close();
  }
}

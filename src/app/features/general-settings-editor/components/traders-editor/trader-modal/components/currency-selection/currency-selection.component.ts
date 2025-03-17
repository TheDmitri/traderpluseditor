import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

// Application imports
import { CurrencyType } from '../../../../../../../core/models';
import { TraderCurrencyService } from '../../../../../services/trader-currency.service';

@Component({
  selector: 'app-currency-selection',
  standalone: true,
  imports: [
    CommonModule,
    MatCheckboxModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './currency-selection.component.html',
  styleUrls: ['./currency-selection.component.scss']
})
export class CurrencySelectionComponent implements OnInit {
  @Input() currencyNames: string[] = [];
  @Output() currenciesChange = new EventEmitter<string[]>();
  
  constructor(private traderCurrencyService: TraderCurrencyService) {}

  ngOnInit(): void {
    this.traderCurrencyService.loadCurrencies(this.currencyNames);
  }

  /**
   * Get available currency types
   */
  getAvailableCurrencyTypes(): CurrencyType[] {
    return this.traderCurrencyService.getAvailableCurrencyTypes();
  }

  /**
   * Get unknown currency names
   */
  getUnknownCurrencyNames(): string[] {
    return this.traderCurrencyService.getUnknownCurrencyNames();
  }

  /**
   * Get currencies sorted with selected ones at the top
   */
  getSortedCurrencyTypes(): CurrencyType[] {
    return this.traderCurrencyService.getSortedCurrencyTypes();
  }

  /**
   * Get unknown currencies formatted for display
   */
  getUnknownCurrenciesForDisplay(): CurrencyType[] {
    return this.traderCurrencyService.getUnknownCurrenciesForDisplay();
  }

  /**
   * Check if a currency is unknown
   */
  isUnknownCurrency(currencyName: string): boolean {
    return this.traderCurrencyService.isUnknownCurrency(currencyName);
  }

  /**
   * Toggle a currency selection and update parent component
   */
  toggleCurrency(currencyName: string): void {
    this.traderCurrencyService.toggleCurrency(currencyName);
    this.emitCurrencyChange();
  }

  /**
   * Check if a currency is selected
   */
  isCurrencySelected(currencyName: string): boolean {
    return this.traderCurrencyService.isCurrencySelected(currencyName);
  }

  /**
   * Get the list of selected currency names
   */
  getSelectedCurrencyNames(): string[] {
    return this.traderCurrencyService.getSelectedCurrencyNames();
  }

  /**
   * Emit currency change event to parent component
   */
  private emitCurrencyChange(): void {
    this.currenciesChange.emit(this.getSelectedCurrencyNames());
  }
}

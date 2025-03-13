import { Injectable } from '@angular/core';
import { CurrencySettings } from '../models';
import { StorageService } from './storage.service';

/**
 * Service for initializing standard application data
 */
@Injectable({
  providedIn: 'root'
})
export class InitializationService {
  constructor(private storageService: StorageService) {}

  /**
   * Initialize custom ripple effects for icon buttons
   *
   * Creates an interactive ripple animation when buttons are clicked,
   * enhancing the user experience with visual feedback
   */
  initializeCustomRipples(): void {
    const buttons = document.querySelectorAll('.custom-icon-btn');

    buttons.forEach((button: Element) => {
      if (!(button as HTMLElement).hasAttribute('data-ripple-initialized')) {
        button.setAttribute('data-ripple-initialized', 'true');

        button.addEventListener('click', (event: Event) => {
          const mouseEvent = event as MouseEvent;
          const rippleContainer = button.querySelector(
            '.icon-btn-ripple'
          ) as HTMLElement;
          if (!rippleContainer) return;

          // Remove existing ripples
          const existingRipples = rippleContainer.querySelectorAll(
            '.icon-btn-ripple-effect'
          );
          existingRipples.forEach((ripple) => ripple.remove());

          // Create new ripple
          const ripple = document.createElement('span');
          ripple.classList.add('icon-btn-ripple-effect');

          const rect = button.getBoundingClientRect();
          const size = Math.max(rect.width, rect.height);
          const x = mouseEvent.clientX - rect.left - size / 2;
          const y = mouseEvent.clientY - rect.top - size / 2;

          ripple.style.width = ripple.style.height = `${size}px`;
          ripple.style.left = `${x}px`;
          ripple.style.top = `${y}px`;

          rippleContainer.appendChild(ripple);

          // Remove ripple after animation completes
          setTimeout(() => {
            ripple.remove();
          }, 500);
        });
      }
    });
  }

  /**
   * Creates standard currency types and currencies based on TraderPlusCurrencySettings.json
   * This provides a set of commonly used currencies (EUR and USD) with different denominations
   */
  createStandardCurrencies(): void {
    // Create standard currency settings with EUR and USD
    const standardCurrencySettings: CurrencySettings = {
      version: '2.0.0',
      currencyTypes: [
        {
          currencyName: 'EUR',
          currencies: [
            { className: 'TraderPlus_Money_Euro100', value: 100 },
            { className: 'TraderPlus_Money_Euro50', value: 50 },
            { className: 'TraderPlus_Money_Euro10', value: 10 },
            { className: 'TraderPlus_Money_Euro5', value: 5 },
            { className: 'TraderPlus_Money_Euro1', value: 1 }
          ]
        },
        {
          currencyName: 'USD',
          currencies: [
            { className: 'TraderPlus_Money_Dollar100', value: 100 },
            { className: 'TraderPlus_Money_Dollar50', value: 50 },
            { className: 'TraderPlus_Money_Dollar10', value: 10 },
            { className: 'TraderPlus_Money_Dollar5', value: 5 },
            { className: 'TraderPlus_Money_Dollar1', value: 1 }
          ]
        }
      ]
    };
    
    // Save the standard currency settings
    this.storageService.saveCurrencySettings(standardCurrencySettings);
  }
}

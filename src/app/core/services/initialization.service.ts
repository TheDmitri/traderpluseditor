import { Injectable } from '@angular/core';
import { GeneralSettings, Category, Product } from '../models';
import { getDefaultCategories } from '../data/default-categories';
import { getDefaultGeneralSettings } from '../data/default-general-settings';
import { getDefaultCurrencySettings } from '../data/default-currency-settings';
import { StorageService } from './storage.service';
import { getDefaultProducts } from '../data/default-products';

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
   * Generate a GUID string
   * @returns A GUID string
   */
  generateGUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0,
        v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }).toUpperCase();
  }

  /**
   * Creates standard currency types and currencies based on TraderPlusCurrencySettings.json
   * This provides a set of commonly used currencies (EUR and USD) with different denominations
   */
  createStandardCurrencies(): void {
    // Get default currency settings from the externalized data file
    const standardCurrencySettings = getDefaultCurrencySettings();
    
    // Save the standard currency settings
    this.storageService.saveCurrencySettings(standardCurrencySettings);
  }

  /**
   * Create new general settings with default values
   * @returns New general settings object
   */
  createDefaultGeneralSettings(): GeneralSettings {
    return getDefaultGeneralSettings(this.generateGUID.bind(this));
  }

  /**
   * Create default categories for starting a new configuration
   * @returns Array of default categories
   */
  createDefaultCategories(): Category[] {
    // Get a deep copy of the default categories from the externalized data file
    return getDefaultCategories();
  }

  /**
   * Create default categories for starting a new configuration
   * @returns Array of default categories
   */
  createDefaultProducts(): Product[] {
    // Get a deep copy of the default categories from the externalized data file
    return getDefaultProducts();
  }

  /**
   * Initialize the application with default data
   */
  initializeFullDefaultConfig(): void {
    // Create standard currency types and currencies
    this.createStandardCurrencies();

    // Create default general settings
    const generalSettings = this.createDefaultGeneralSettings();
    this.storageService.saveGeneralSettings(generalSettings);

    // Create default categories
    const defaultCategories = this.createDefaultCategories();
    this.storageService.saveCategories(defaultCategories);

    // Create default products
    const defaultProducts = this.createDefaultProducts();
    this.storageService.saveProducts(defaultProducts);
  }
}

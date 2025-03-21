import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class ConfigCheckService {
  constructor(private storageService: StorageService) {}

  /**
   * Checks if any configuration data exists in storage
   */
  configsExist(): boolean {
    // Check if there are any categories, products, or settings
    const categories = this.storageService.categories();
    const products = this.storageService.products();
    const currencySettings = this.storageService.currencySettings();
    const generalSettings = this.storageService.generalSettings();
    
    // If any of them have data, configs exist
    return (
      (categories && categories.length > 0) || 
      (products && products.length > 0) || 
      !!currencySettings || 
      !!generalSettings
    );
  }
}

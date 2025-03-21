import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { StorageService } from '../services/storage.service';

@Injectable({
  providedIn: 'root'
})
export class ConfigExistsGuard implements CanActivate {
  private router = inject(Router);
  private storageService = inject(StorageService);
  
  canActivate(): boolean | UrlTree {
    // Check if configs exist
    const configsExist = this.checkIfConfigsExist();
    
    if (configsExist) {
      return true; // Allow navigation to dashboard
    } else {
      return this.router.createUrlTree(['/information']);
    }
  }
  
  /**
   * Checks if any configuration data exists in storage
   */
  private checkIfConfigsExist(): boolean {
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

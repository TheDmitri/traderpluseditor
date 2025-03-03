import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { StorageService } from '../../../core/services';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    RouterModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  private storageService = inject(StorageService);
  
  get categoriesCount(): number {
    return this.storageService.categories().length;
  }
  
  get productsCount(): number {
    return this.storageService.products().length;
  }
  
  get currenciesCount(): number {
    const settings = this.storageService.currencySettings();
    return settings ? settings.currencyTypes.length : 0;
  }
}

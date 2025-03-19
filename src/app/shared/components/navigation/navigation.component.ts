import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';

// Application imports
import { NavigationService } from '../../../core/services';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [
    CommonModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    RouterModule
  ],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent {
  private navigationService = inject(NavigationService);
  
  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Categories', icon: 'category', route: '/categories' },
    { label: 'Products', icon: 'shopping_cart', route: '/products' },
    { label: 'Currencies', icon: 'payments', route: '/currencies' },
    { label: 'Settings', icon: 'settings', route: '/settings' },
    { label: 'Import/Export', icon: 'import_export', route: '/file-management' },
    { label: 'Converter', icon: 'auto_fix_high', route: '/converter' },
    { label: 'Storage', icon: 'storage', route: '/storage-manager' }
  ];
  
  getContentClass(): string {
    return this.isExpanded() ? 'content-expanded' : 'content-collapsed';
  }

  isExpanded(): boolean {
    return this.navigationService.isExpanded();
  }

  toggleSidebar(): void {
    this.navigationService.toggleSidebar();
  }
}

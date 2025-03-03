import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { NavigationService } from '../../../core/services/navigation.service';

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
    { label: 'Categories', icon: 'my_library_books', route: '/categories' },
    { label: 'Products', icon: 'shopping_cart', route: '/products' },
    { label: 'Currencies', icon: 'attach_money', route: '/currencies' },
    { label: 'Settings', icon: 'settings', route: '/settings' },
    { label: 'Import/Export', icon: 'import_export', route: '/file-management' }
  ];

  isExpanded(): boolean {
    return this.navigationService.isExpanded();
  }

  toggleSidebar(): void {
    this.navigationService.toggleSidebar();
  }
}

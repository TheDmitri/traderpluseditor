import { Component, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../environments/environment';

import { NavigationComponent } from './shared/components/navigation/navigation.component';
import { HelpPanelComponent } from './shared/components/help-panel/help-panel.component';
import { NavigationService } from './core/services';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatToolbarModule,
    MatTooltipModule,
    NavigationComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  private navigationService = inject(NavigationService);
  private dialog = inject(MatDialog);
  title = 'traderpluseditor';
  appVersion = environment.version;
  
  ngOnInit(): void {
    // Additional initialization can be added here if needed
  }
  
  /**
   * Prevents the default context menu from appearing on right-click
   * This will allow us to implement our own custom context menu later
   */
  @HostListener('contextmenu', ['$event'])
  onRightClick(event: MouseEvent): void {
    // Prevent default browser context menu
    event.preventDefault();
    
    // Future implementation: show custom context menu
    console.log('Right click detected at:', event.clientX, event.clientY);
    // Here we would later add code to show our custom context menu
  }
  
  toggleNav(): void {
    this.navigationService.toggleSidebar();
  }
  
  isNavExpanded(): boolean {
    return this.navigationService.isExpanded();
  }
  
  openHelpPanel(): void {
    this.dialog.open(HelpPanelComponent, {
      panelClass: 'help-dialog',
      autoFocus: false
    });
  }
}

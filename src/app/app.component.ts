import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

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
export class AppComponent {
  private navigationService = inject(NavigationService);
  private dialog = inject(MatDialog);
  title = 'traderpluseditor';
  
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

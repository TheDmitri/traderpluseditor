import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

// Application imports
import { NavigationComponent } from './shared/components';
import { InitializationService, NavigationService } from './core/services';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    NavigationComponent,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'traderpluseditor';
  
  constructor(
    private navigationService: NavigationService,
    private initializationService: InitializationService
  ) {}
  
  ngAfterViewInit() {
    setTimeout(() => {
      this.initializationService.initializeCustomRipples();
    });
  }
  
  isNavExpanded(): boolean {
    return this.navigationService.isExpanded();
  }
  
  toggleNav(): void {
    this.navigationService.toggleSidebar();
  }
}

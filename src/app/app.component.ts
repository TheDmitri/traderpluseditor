import { Component, ElementRef, inject } from '@angular/core';
import { NavigationComponent } from './shared/components/navigation/navigation.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { NavigationService } from './core/services/navigation.service';
import { InitializationService } from './core/services';

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

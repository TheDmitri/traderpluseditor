import { Component, ElementRef, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationComponent } from './shared/components/navigation/navigation.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { NavigationService } from './core/services/navigation.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
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
    private elementRef: ElementRef
  ) {}
  
  ngAfterViewInit() {
    this.initializeCustomRipples();
  }
  
  isNavExpanded(): boolean {
    return this.navigationService.isExpanded();
  }
  
  toggleNav(): void {
    this.navigationService.toggleSidebar();
  }
  
  // Custom ripple effect for our icon buttons
  private initializeCustomRipples() {
    const buttons = this.elementRef.nativeElement.querySelectorAll('.custom-icon-btn');
    
    buttons.forEach((button: HTMLElement) => {
      button.addEventListener('click', (event: MouseEvent) => {
        const rippleContainer = button.querySelector('.icon-btn-ripple') as HTMLElement;
        if (!rippleContainer) return;
        
        // Remove existing ripples
        const existingRipples = rippleContainer.querySelectorAll('.icon-btn-ripple-effect');
        existingRipples.forEach(ripple => ripple.remove());
        
        // Create new ripple
        const ripple = document.createElement('span');
        ripple.classList.add('icon-btn-ripple-effect');
        
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        
        rippleContainer.appendChild(ripple);
        
        // Remove ripple after animation completes
        setTimeout(() => {
          ripple.remove();
        }, 500);
      });
    });
  }
}

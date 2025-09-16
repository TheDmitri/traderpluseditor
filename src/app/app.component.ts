import { Component, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../environments/environment';
import { Router } from '@angular/router';

import { NavigationComponent } from './shared/components/navigation/navigation.component';
import { NavigationService } from './core/services';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatToolbarModule,
    MatTooltipModule,
    NavigationComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  private navigationService = inject(NavigationService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  title = 'TraderX Editor';
  appVersion = environment.version;

  // PWA installation
  deferredPrompt: any;
  showInstallButton = false;

  ngOnInit(): void {
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      this.deferredPrompt = e;
      // Update UI to show the install button
      this.showInstallButton = true;
    });

    // Hide install button if app is already installed
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.showInstallButton = false;
      this.deferredPrompt = null;
    });
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
    // Navigate to information route instead of opening dialog
    this.router.navigate(['/information']);
  }

  // Install app functionality
  installApp(): void {
    if (!this.deferredPrompt) {
      console.log('Installation prompt not available');
      return;
    }

    // Show the prompt
    this.deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    this.deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the installation');
      } else {
        console.log('User dismissed the installation');
      }
      // We no longer need the prompt
      this.deferredPrompt = null;
      this.showInstallButton = false;
    });
  }
}

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { InformationService } from '../services/information.service';
import { InitializationService } from '../../../core/services/initialization.service';
import { StorageService } from '../../../core/services/storage.service';
import { ConfigCheckService } from '../../../core/services/config-check.service';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-information',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatCardModule,
    MatDividerModule,
  ],
  templateUrl: './information.component.html',
  styleUrl: './information.component.scss',
})
export class InformationComponent implements OnInit {
  private infoService = inject(InformationService);
  private router = inject(Router);
  private initializationService = inject(InitializationService);
  private storageService = inject(StorageService);
  private configCheckService = inject(ConfigCheckService);
  private notificationService = inject(NotificationService);

  appVersion: string = this.infoService.getAppVersion();
  currentYear: number = new Date().getFullYear();
  
  // Flag to check if configs exist
  configsExist = false;

  ngOnInit(): void {
    this.checkIfConfigsExist();
  }

  /**
   * Checks if any configuration data exists in storage
   */
  private checkIfConfigsExist(): void {
    this.configsExist = this.configCheckService.configsExist();
  }

  openLink(url: string): void {
    this.infoService.openExternalLink(url);
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  /**
   * Creates a full default configuration
   */
  createFullConfig(): void {
    try {
      // Check if configs already exist
      if (this.configsExist) {
        this.notificationService.warning(
          'Configuration data already exists. Please clear data before creating a new configuration.'
        );
        return;
      }
      
      // Initialize full default config
      this.initializationService.initializeFullDefaultConfig();
      
      // Show success message
      this.notificationService.success(
        'Default configuration created successfully!'
      );
      
      // Update the flag
      this.configsExist = true;
      
      // Navigate to dashboard to show the new config
      setTimeout(() => this.router.navigate(['/dashboard']), 1000);
    } catch (error) {
      console.error('Error creating default configuration:', error);
      this.notificationService.error(
        'Error creating default configuration. Please try again.'
      );
    }
  }
}

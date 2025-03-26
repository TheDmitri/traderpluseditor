import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter, takeUntil, Subject } from 'rxjs';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

// Application imports
import { StorageService } from '../../../core/services';
import { DiscordService } from '../../../core/services/discord.service';
import {
  StorageManagerService,
  StorageBreakdown,
} from '../../../shared/services/storage-manager.service';
import {
  StatisticsService,
  Statistics,
} from '../../../shared/services/statistics.service';
import { Observable, of } from 'rxjs';
import { RequestModalComponent } from './request-modal/request-modal.component';
import { NotificationService } from '../../../shared/services';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatTooltipModule,
    RouterModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private storageService = inject(StorageService);
  private storageManagerService = inject(StorageManagerService);
  private discordService = inject(DiscordService);
  private notificationService = inject(NotificationService);
  private statisticsService = inject(StatisticsService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private destroy$ = new Subject<void>();

  storageBreakdown$: Observable<StorageBreakdown> = of({
    fileSets: 0,
    appData: {
      products: 0,
      categories: 0,
      currencySettings: 0,
      generalSettings: 0,
      total: 0,
    },
    other: 0,
    total: 0,
    limit: 5 * 1024 * 1024,
    percentUsed: 0,
  });

  storageWarningLevel$: Observable<'safe' | 'warning' | 'critical'> =
    of('safe');

  // Statistics for application usage
  statistics: Statistics = {
    createdFileSets: 0,
    exportedFiles: 0,
    lastUpdated: 0,
  };

  // For Discord data
  activeUsers: number = 0;

  ngOnInit(): void {
    // Force storage breakdown calculation to ensure data is loaded
    this.loadStorageData();

    // Load Discord server data
    this.loadDiscordData();

    // Load statistics data
    this.loadStatisticsData();

    // Refresh data when navigating back to this component
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.loadStorageData();
        this.loadDiscordData();
        this.loadStatisticsData();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadStorageData(): void {
    // Use forceStorageBreakdownRecalculation to wait for data to be loaded
    this.storageBreakdown$ =
      this.storageManagerService.forceStorageBreakdownRecalculation();
    this.storageWarningLevel$ =
      this.storageManagerService.getStorageWarningLevel();
  }

  private loadDiscordData(): void {
    this.discordService
      .getServerData()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.activeUsers = data.approximate_presence_count;
      });
  }

  private loadStatisticsData(): void {
    this.statisticsService
      .getStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe((stats) => {
        this.statistics = stats;
      });
  }

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

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getStorageColorClass(level: 'safe' | 'warning' | 'critical'): string {
    switch (level) {
      case 'critical':
        return 'storage-critical';
      case 'warning':
        return 'storage-warning';
      case 'safe':
        return 'storage-safe';
      default:
        return 'storage-safe';
    }
  }

  openRequestModal(): void {
    const dialogRef = this.dialog.open(RequestModalComponent, {
      width: '700px',
      maxWidth: '90vw',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log('Request submitted:', result);
        // This will later integrate with the GitHub issue service
      }
    });
  }

  /**
   * Resets statistics with user confirmation
   */
  resetStatisticsWithConfirmation(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Reset Statistics',
        message: 'Are you sure you want to reset all statistics? \n\nThis action cannot be undone.',
        confirmText: 'Reset',
        cancelText: 'Cancel',
        type: 'warning'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.statisticsService.resetStatistics();
        this.notifyStatisticsReset();
      }
    });
  }

  /**
   * Shows notification after statistics reset
   */
  private notifyStatisticsReset(): void {
    // If you have a notification service, you can use it here
    this.notificationService.success('Statistics have been reset successfully');
  }
}

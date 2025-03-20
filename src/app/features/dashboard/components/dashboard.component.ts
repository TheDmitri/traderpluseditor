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

// Application imports
import { StorageService } from '../../../core/services';
import { StorageManagerService, StorageBreakdown } from '../../../shared/services/storage-manager.service';
import { Observable, of } from 'rxjs';
import { RequestModalComponent } from './request-modal/request-modal.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    RouterModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private storageService = inject(StorageService);
  private storageManagerService = inject(StorageManagerService);
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
      total: 0
    },
    other: 0,
    total: 0,
    limit: 5 * 1024 * 1024,
    percentUsed: 0
  });
  
  storageWarningLevel$: Observable<'safe' | 'warning' | 'critical'> = of('safe');
  
  // Dummy statistics for future implementation
  dummyStats = {
    activeUsers: 142,
    createdFileSets: 8,
    exportedFiles: 36
  };
  
  ngOnInit(): void {
    // Force storage breakdown calculation to ensure data is loaded
    this.loadStorageData();
    
    // Refresh data when navigating back to this component
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.loadStorageData();
    });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private loadStorageData(): void {
    // Use forceStorageBreakdownRecalculation to wait for data to be loaded
    this.storageBreakdown$ = this.storageManagerService.forceStorageBreakdownRecalculation();
    this.storageWarningLevel$ = this.storageManagerService.getStorageWarningLevel();
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
      case 'critical': return 'storage-critical';
      case 'warning': return 'storage-warning';
      case 'safe': return 'storage-safe';
      default: return 'storage-safe';
    }
  }

  openRequestModal(): void {
    const dialogRef = this.dialog.open(RequestModalComponent, {
      width: '700px',
      maxWidth: '90vw',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Request submitted:', result);
        // This will later integrate with the GitHub issue service
      }
    });
  }
}

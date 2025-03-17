import { Component, Input, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs';

// Application imports
import { TraderNpc, GeneralSettings } from '../../../../core/models';
import { TraderService } from '../../services';
import { NotificationService } from '../../../../shared/services';
import { TraderModalComponent } from './trader-modal/trader-modal.component';

/**
 * Traders Editor Component
 * 
 * This component manages the traders section of the general settings, allowing users
 * to add, edit, and delete trader NPCs.
 */
@Component({
  selector: 'app-traders-editor',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './traders-editor.component.html',
  styleUrls: ['./traders-editor.component.scss']
})
export class TradersEditorComponent implements OnInit, OnDestroy, AfterViewInit {
  /** Input to determine if settings exist */
  @Input() hasSettings = false;

  /** Input for general settings */
  @Input() generalSettings: GeneralSettings | null = null;
  
  /** Data source for the traders table */
  tradersDataSource = new MatTableDataSource<TraderNpc>([]);
  
  /** Columns to display in the traders table */
  traderColumns: string[] = ['npcId', 'givenName', 'className', 'position', 'actions'];
  
  /** Subject for handling component destruction */
  private destroy$ = new Subject<void>();
  
  /** References for table pagination and sorting */
  @ViewChild('traderPaginator') traderPaginator!: MatPaginator;
  @ViewChild('traderSort') traderSort!: MatSort;

  constructor(
    private traderService: TraderService,
    private notificationService: NotificationService,
    private dialog: MatDialog
  ) { }

  /**
   * Initialize component
   */
  ngOnInit(): void {
    this.loadTraders();
  }

  /**
   * Clean up resources when component is destroyed
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * After view is initialized, set up table pagination and sorting
   */
  ngAfterViewInit(): void {
    this.setupTraderTable();
  }

  /**
   * Load traders data
   */
  loadTraders(): void {
    if (this.hasSettings) {
      this.tradersDataSource = this.traderService.getTradersDataSource();
      
      // Ensure paginator is applied immediately if already initialized
      if (this.traderPaginator) {
        this.tradersDataSource.paginator = this.traderPaginator;
        // Force first page with 5 items
        this.traderPaginator.pageSize = 5;
        this.traderPaginator.firstPage();
      }
    } else {
      this.tradersDataSource = new MatTableDataSource<TraderNpc>([]);
    }
  }

  /**
   * Format the position coordinates for display
   * @param position - The position array [x, y, z]
   * @returns Formatted position string
   */
  formatPosition(position: number[]): string {
    if (!position || position.length !== 3) return 'Invalid position';
    return `X: ${position[0].toFixed(1)}, Y: ${position[1].toFixed(1)}, Z: ${position[2].toFixed(1)}`;
  }

  /**
   * Open dialog to add a new trader
   */
  openAddTraderDialog(): void {
    const dialogRef = this.dialog.open(TraderModalComponent, {
      data: { trader: null }
    });

    dialogRef.afterClosed().subscribe((result: {trader: TraderNpc, traderType: string} | undefined) => {
      if (result?.trader) {
        if (this.traderService.addTraderToSettings(result.trader)) {
          this.tradersDataSource = this.traderService.getTradersDataSource();
          this.notificationService.success('Trader added successfully');
          
          // Update general settings reference
          this.updateGeneralSettingsReference();
        } else {
          this.notificationService.error('Failed to add trader');
        }
      }
    });
  }

  /**
   * Open dialog to edit an existing trader
   * @param trader - The trader to edit
   * @param index - The index of the trader in the array
   */
  openEditTraderDialog(trader: TraderNpc, index: number): void {
    const dialogRef = this.dialog.open(TraderModalComponent, {
      data: { trader: {...trader} }
    });

    dialogRef.afterClosed().subscribe((result: {trader: TraderNpc, traderType: string} | undefined) => {
      if (result?.trader) {
        if (this.traderService.updateTrader(index, result.trader)) {
          this.tradersDataSource = this.traderService.getTradersDataSource();
          this.notificationService.success('Trader updated successfully');
          
          // Update general settings reference
          this.updateGeneralSettingsReference();
        } else {
          this.notificationService.error('Failed to update trader');
        }
      }
    });
  }

  /**
   * Delete a trader after confirmation
   * @param index - The index of the trader to delete
   */
  async deleteTrader(index: number): Promise<void> {
    this.tradersDataSource = await this.traderService.deleteTraderWithConfirmation(index);
    
    // Update general settings reference
    this.updateGeneralSettingsReference();
  }

  /**
   * Delete all traders after confirmation
   */
  async deleteAllTraders(): Promise<void> {
    this.tradersDataSource = await this.traderService.deleteAllTradersWithConfirmation();
    
    // Update general settings reference
    this.updateGeneralSettingsReference();
  }

  /**
   * Update the general settings reference to ensure parent component has latest data
   * This is called after each operation that modifies traders
   */
  private updateGeneralSettingsReference(): void {
    // The traders are already updated in the service, but we need to update the reference
    // for change detection in the parent component
    this.generalSettings = this.traderService.generalSettingsService.getGeneralSettings();
    
    // Ensure pagination is properly applied after data changes
    if (this.traderPaginator && this.tradersDataSource) {
      this.tradersDataSource.paginator = this.traderPaginator;
      this.traderPaginator.firstPage();
    }
  }

  /**
   * Apply pagination and sorting to trader table
   */
  setupTraderTable(): void {
    // Use specific timeout value (300ms) to ensure DOM is fully rendered
    setTimeout(() => {
      if (this.tradersDataSource && this.traderPaginator && this.traderSort) {
        this.tradersDataSource.paginator = this.traderPaginator;
        this.tradersDataSource.sort = this.traderSort;
        
        // Explicitly set page size and reset to first page
        this.traderPaginator.pageSize = 5;
        this.traderPaginator.firstPage();
      }
    }, 300);
  }
}

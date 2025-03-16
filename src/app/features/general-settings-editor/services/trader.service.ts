import { Injectable } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';

// Application imports
import { TraderNpc } from '../../../core/models/general-settings.model';
import { GeneralSettingsService } from './general-settings.service';
import { ConfirmDialogComponent } from '../../../shared/components';
import { NotificationService } from '../../../shared/services';

/**
 * Service for managing trader NPCs in TraderPlus general settings
 */
@Injectable({
  providedIn: 'root',
})
export class TraderService {
  // Temporary trader for adding new trader
  private newTrader: TraderNpc | null = null;
  
  // Flag to track if we're adding a new trader vs editing an existing one
  private isAddingNewTrader = false;
  
  // Current trader being edited (UI state)
  private editingTraderIndex: number | null = null;

  constructor(
    public generalSettingsService: GeneralSettingsService,
    private dialog: MatDialog,
    private notificationService: NotificationService
  ) {}
  
  /**
   * Get a data source of all traders
   * @returns MatTableDataSource of traders or empty array if none exist
   */
  getTradersDataSource(): MatTableDataSource<TraderNpc> {
    const settings = this.generalSettingsService.getGeneralSettings();
    let traders = settings?.traders || [];
    
    // Sort traders so that ATMs (ID -2) appear at the bottom
    traders = [...traders].sort((a, b) => {
      // If a is an ATM and b is not, a comes after b
      if (a.npcId === -2 && b.npcId !== -2) return 1;
      // If b is an ATM and a is not, b comes after a
      if (a.npcId !== -2 && b.npcId === -2) return -1;
      // For regular traders (or both are ATMs), sort by ID
      return a.npcId - b.npcId;
    });
    
    return new MatTableDataSource<TraderNpc>(traders);
  }
  
  /**
   * Creates a new empty trader object
   * @returns A new trader object with empty/default values
   */
  createEmptyTrader(): TraderNpc {
    // Create a new trader with default values
    return {
      npcId: this.getNextTraderId(),
      className: '',
      givenName: '',
      role: '',
      position: [0, 0, 0],
      orientation: [0, 0, 0],
      categoriesId: [],
      currenciesAccepted: [],
      loadouts: []
    };
  }
  
  /**
   * Get the next available trader ID
   * @returns The next available trader ID
   */
  getNextTraderId(): number {
    const settings = this.generalSettingsService.getGeneralSettings();
    if (!settings?.traders || settings.traders.length === 0) {
      return 0;
    }
    
    // Find all used IDs to check for gaps
    const usedIds = new Set<number>();
    for (const trader of settings.traders) {
      // Only consider non-ATM traders (positive IDs)
      if (trader.npcId >= 0) {
        usedIds.add(trader.npcId);
      }
    }
    
    // Find the first available ID starting from 0
    let nextId = 0;
    while (usedIds.has(nextId)) {
      nextId++;
    }
    
    return nextId;
  }
  
  /**
   * Add a trader to settings
   * @param trader The trader to add
   * @returns True if added successfully, false otherwise
   */
  addTraderToSettings(trader: TraderNpc): boolean {
    const settings = this.generalSettingsService.getGeneralSettings();
    if (!settings) return false;
    
    // Initialize the traders array if it doesn't exist
    if (!settings.traders) {
      settings.traders = [];
    }
    
    // Ensure trader has a valid npcId
    if (trader.npcId === undefined || trader.npcId === null) {
      // For ATMs, always use -2; for others, get next available
      trader.npcId = trader.className === 'TraderPlus_BANK_ATM' ? -2 : this.getNextTraderId();
    }
    
    // Add the trader to the array
    settings.traders.push(trader);
    
    // Save the updated settings
    this.generalSettingsService.saveGeneralSettings(settings);
    
    return true;
  }
  
  /**
   * Update an existing trader
   * @param traderIndex The index of the trader to update
   * @param updatedTrader The updated trader data
   * @returns True if updated successfully, false otherwise
   */
  updateTrader(traderIndex: number, updatedTrader: TraderNpc): boolean {
    const settings = this.generalSettingsService.getGeneralSettings();
    if (!settings || !settings.traders || traderIndex < 0 || traderIndex >= settings.traders.length) {
      return false;
    }
    
    // Update the trader
    settings.traders[traderIndex] = updatedTrader;
    
    // Save the updated settings
    this.generalSettingsService.saveGeneralSettings(settings);
    
    return true;
  }
  
  /**
   * Delete a trader
   * @param index The index of the trader to delete
   * @returns True if deleted successfully, false otherwise
   */
  deleteTrader(index: number): boolean {
    const settings = this.generalSettingsService.getGeneralSettings();
    if (!settings || !settings.traders || index < 0 || index >= settings.traders.length) {
      return false;
    }
    
    // Get the deleted trader's ID to check if re-indexing is needed
    const deletedTraderId = settings.traders[index].npcId;
    
    // Remove the trader
    settings.traders.splice(index, 1);
    
    // Re-index remaining traders to ensure sequential IDs without gaps
    if (deletedTraderId >= 0) {
      this.reindexTraderIds(settings.traders);
    }
    
    // Save the updated settings
    this.generalSettingsService.saveGeneralSettings(settings);
    
    return true;
  }
  
  /**
   * Re-index trader IDs to ensure they are sequential without gaps
   * @param traders The array of traders to re-index
   */
  private reindexTraderIds(traders: TraderNpc[]): void {
    // Skip if traders array is empty
    if (!traders || traders.length === 0) return;
    
    // First, collect all regular traders (non-ATMs) with positive IDs
    const regularTraders = traders.filter(trader => trader.npcId >= 0);
    
    // Sort them by ID for sequential reassignment
    regularTraders.sort((a, b) => a.npcId - b.npcId);
    
    // Assign sequential IDs starting from 0
    for (let i = 0; i < regularTraders.length; i++) {
      regularTraders[i].npcId = i;
    }
  }

  /**
   * Delete all traders
   * @returns True if deleted successfully, false otherwise
   */
  deleteAllTraders(): boolean {
    const settings = this.generalSettingsService.getGeneralSettings();
    if (!settings) return false;
    
    // Clear all traders
    settings.traders = [];
    
    // Save the updated settings
    this.generalSettingsService.saveGeneralSettings(settings);
    
    return true;
  }

  /**
   * Add a new trader for editing (but don't save it yet)
   * @returns Object with the updated datasource and trader editing state
   */
  addTrader(): {
    dataSource: MatTableDataSource<TraderNpc>;
    editingIndex: number;
    isAdding: boolean;
  } {
    // Create a new trader but don't save it to settings yet
    this.newTrader = this.createEmptyTrader();
    this.isAddingNewTrader = true;
    
    // Update the temporary data for editing
    this.editingTraderIndex = 0;
    
    // Get current traders (already sorted by getTradersDataSource)
    const currentTraders = [...this.getTradersDataSource().data];
    // Insert the new trader at the beginning
    currentTraders.unshift(this.newTrader);
    
    return {
      dataSource: new MatTableDataSource<TraderNpc>(currentTraders),
      editingIndex: this.editingTraderIndex,
      isAdding: this.isAddingNewTrader
    };
  }

  /**
   * Cancel editing a trader
   * @returns The updated datasource after cancellation
   */
  cancelEditTrader(): MatTableDataSource<TraderNpc> {
    if (this.isAddingNewTrader) {
      // If we're adding a new trader, just remove it from the UI
      this.isAddingNewTrader = false;
      this.newTrader = null;
    }
    
    this.editingTraderIndex = null;
    
    // Return the updated datasource
    return this.getTradersDataSource();
  }

  /**
   * Start editing a trader
   * @param trader - The trader to edit
   * @param index - The index of the trader in the array
   * @returns Object with the editing state information
   */
  startEditTrader(trader: TraderNpc, index: number): {
    dataSource: MatTableDataSource<TraderNpc>;
    editingIndex: number;
    isAdding: boolean;
  } {
    // If we were adding a new trader and now want to edit something else,
    // discard the new trader
    if (this.isAddingNewTrader) {
      this.isAddingNewTrader = false;
      this.newTrader = null;
    }
    
    this.editingTraderIndex = index;
    
    return {
      dataSource: this.getTradersDataSource(),
      editingIndex: this.editingTraderIndex,
      isAdding: this.isAddingNewTrader
    };
  }

  /**
   * Save the currently edited trader
   * @param editingIndex - The index of the trader being edited
   * @param trader - The trader data being saved
   * @returns Object with the result of the operation and updated datasource
   */
  saveTrader(
    editingIndex: number | null,
    trader: TraderNpc
  ): {
    success: boolean;
    error?: string;
    dataSource: MatTableDataSource<TraderNpc>;
  } {
    if (editingIndex === null) {
      return {
        success: false,
        error: 'No trader is being edited',
        dataSource: this.getTradersDataSource()
      };
    }
    
    // Validate the trader data
    const validationError = this.validateTrader(trader);
    if (validationError) {
      return {
        success: false,
        error: validationError,
        dataSource: this.getTradersDataSource()
      };
    }
    
    // Check if we're adding a new trader
    if (this.isAddingNewTrader && this.newTrader) {
      // Add the trader to the settings
      if (this.addTraderToSettings(trader)) {
        // Reset state
        this.isAddingNewTrader = false;
        this.newTrader = null;
        this.editingTraderIndex = null;
        
        return {
          success: true,
          dataSource: this.getTradersDataSource()
        };
      } else {
        return {
          success: false,
          error: 'Failed to save trader',
          dataSource: this.getTradersDataSource()
        };
      }
    } else {
      // We're editing an existing trader
      if (this.updateTrader(editingIndex, trader)) {
        // Reset editing state
        this.editingTraderIndex = null;
        
        return {
          success: true,
          dataSource: this.getTradersDataSource()
        };
      } else {
        return {
          success: false,
          error: 'Failed to update trader',
          dataSource: this.getTradersDataSource()
        };
      }
    }
  }

  /**
   * Validate trader data
   * @param trader - The trader data to validate
   * @returns Error message or null if valid
   */
  validateTrader(trader: TraderNpc): string | null {
    if (!trader.className?.trim()) {
      return 'Trader class name is required';
    }
    
    if (!trader.givenName?.trim()) {
      return 'Trader name is required';
    }
    
    // Validate position and orientation
    if (!trader.position || trader.position.length !== 3) {
      return 'Trader position must have X, Y, and Z coordinates';
    }
    
    if (!trader.orientation || trader.orientation.length !== 3) {
      return 'Trader orientation must have X, Y, and Z values';
    }
    
    return null;
  }

  /**
   * Delete a trader after confirmation
   * @param index - The index of the trader to delete
   * @returns Promise resolving to the updated trader datasource
   */
  deleteTraderWithConfirmation(index: number): Promise<MatTableDataSource<TraderNpc>> {
    return new Promise((resolve) => {
      // Get the trader to display its name in the confirmation message
      const trader = this.generalSettingsService.getGeneralSettings()?.traders?.[index];
      const traderName = trader ? `${trader.givenName} (ID: ${trader.npcId})` : 'this trader';
      
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Delete Trader',
          message: `Are you sure you want to delete ${traderName}?\n\nTrader IDs will be re-indexed to ensure they remain sequential.\n\nThis action cannot be undone. `,
          confirmText: 'Delete',
          cancelText: 'Cancel',
          type: 'danger'
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          if (this.deleteTrader(index)) {
            this.notificationService.success(`Trader deleted successfully. Remaining trader IDs have been re-indexed.`);
          } else {
            this.notificationService.error('Failed to delete trader');
          }
        }
        resolve(this.getTradersDataSource());
      });
    });
  }

  /**
   * Delete all traders after confirmation
   * @returns Promise resolving to the updated trader datasource
   */
  deleteAllTradersWithConfirmation(): Promise<MatTableDataSource<TraderNpc>> {
    return new Promise((resolve) => {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Delete All Traders',
          message: 'Are you sure you want to delete all traders? \n\nThis action cannot be undone.',
          confirmText: 'Delete All',
          cancelText: 'Cancel',
          type: 'danger'
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          if (this.deleteAllTraders()) {
            this.notificationService.success('All traders deleted successfully');
            resolve(new MatTableDataSource<TraderNpc>([]));
          } else {
            this.notificationService.error('Failed to delete traders');
            resolve(this.getTradersDataSource());
          }
        } else {
          resolve(this.getTradersDataSource());
        }
      });
    });
  }
  
  /**
   * Get the current trader editing state
   * @returns Object with the current trader editing state
   */
  getTraderEditingState(): {
    editingIndex: number | null;
    isAdding: boolean;
  } {
    return {
      editingIndex: this.editingTraderIndex,
      isAdding: this.isAddingNewTrader
    };
  }

  /**
   * Clear trader edit state
   */
  clearTraderEditState(): void {
    this.editingTraderIndex = null;
    this.isAddingNewTrader = false;
    this.newTrader = null;
  }
}

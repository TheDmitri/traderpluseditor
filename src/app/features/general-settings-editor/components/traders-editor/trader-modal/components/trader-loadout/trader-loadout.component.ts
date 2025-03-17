import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';

import { LoadoutItem } from '../../../../../../../core/models/general-settings.model';
import { TraderLoadoutService } from '../../../../../services/trader-loadout.service';
import { NotificationService } from '../../../../../../../shared/services';
import { LoadoutModalComponent, LoadoutModalData } from '../../components/loadout-modal/loadout-modal.component';

/**
 * Component for managing trader loadout items and their attachments
 */
@Component({
  selector: 'app-trader-loadout',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
    MatExpansionModule,
    MatDividerModule,
    MatCardModule,
    MatChipsModule
  ],
  templateUrl: './trader-loadout.component.html',
  styleUrls: ['./trader-loadout.component.scss']
})
export class TraderLoadoutComponent implements OnInit {
  /** The loadout items to display and edit */
  @Input() loadoutItems: LoadoutItem[] = [];
  
  /** Event emitted when loadout items are changed */
  @Output() loadoutItemsChange = new EventEmitter<LoadoutItem[]>();

  /** Available slots for loadout items */
  availableSlots: string[] = [];
  
  /** Slots that are already filled with items */
  filledSlots: Set<string> = new Set<string>();

  constructor(
    private traderLoadoutService: TraderLoadoutService,
    private notificationService: NotificationService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Get available slots from the service
    this.availableSlots = this.traderLoadoutService.getAvailableSlots();
    
    // Update the set of filled slots
    this.updateFilledSlots();
  }

  /**
   * Update the set of filled slots based on current loadout items
   */
  updateFilledSlots(): void {
    this.filledSlots = new Set<string>();
    this.loadoutItems.forEach(item => {
      if (item.slotName) {
        this.filledSlots.add(item.slotName);
      }
    });
  }

  /**
   * Check if a slot is filled
   * @param slot The slot name to check
   * @returns Boolean indicating if the slot is filled
   */
  isSlotFilled(slot: string): boolean {
    return this.filledSlots.has(slot);
  }

  /**
   * Get available slots for the dropdown, filtering out filled slots
   */
  getAvailableSlots(): string[] {
    return this.availableSlots;
  }
  
  /**
   * Get slots that are not yet filled
   * @returns Array of slot names that are not yet filled
   */
  getAvailableSlotsForNewItems(): string[] {
    // Filter out slots that are already filled
    return this.availableSlots.filter(slot => !this.filledSlots.has(slot));
  }

  /**
   * Open modal to add a new loadout item
   */
  addLoadoutItem(): void {
    const availableSlots = this.getAvailableSlotsForNewItems();
    
    if (availableSlots.length === 0) {
      this.notificationService.warning('All slots are already filled. Remove items to add new ones.');
      return;
    }
    
    const dialogRef = this.dialog.open(LoadoutModalComponent, {
      width: '500px',
      data: {
        availableSlots: this.availableSlots,
        usedSlotNames: Array.from(this.filledSlots),
        editMode: false
      } as LoadoutModalData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Add the new item to the loadouts array
        const updatedLoadouts = [...this.loadoutItems, result];
        this.loadoutItems = updatedLoadouts;
        this.loadoutItemsChange.emit(updatedLoadouts);
        
        // Update the filled slots
        this.updateFilledSlots();
        
        this.notificationService.success(`Item added to ${result.slotName} slot`);
      }
    });
  }

  /**
   * Open modal to edit an existing loadout item
   * @param item The item to edit
   * @param index The index of the item in the array
   */
  editLoadoutItem(item: LoadoutItem, index: number): void {
    const dialogRef = this.dialog.open(LoadoutModalComponent, {
      width: '500px',
      data: {
        item: {...item},
        availableSlots: this.availableSlots,
        editMode: true
      } as LoadoutModalData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Update the item in the loadouts array
        const updatedLoadouts = [...this.loadoutItems];
        updatedLoadouts[index] = result;
        
        // Update the loadout items
        this.loadoutItems = updatedLoadouts;
        this.loadoutItemsChange.emit(updatedLoadouts);
        
        this.notificationService.success(`Item in ${result.slotName} slot updated`);
      }
    });
  }

  /**
   * Remove a loadout item
   * @param slot The slot name to remove the item from
   */
  removeLoadoutItem(slot: string): void {
    const updatedLoadouts = this.traderLoadoutService.removeLoadoutItem([...this.loadoutItems], slot);
    
    // Update the loadout items
    this.loadoutItems = updatedLoadouts;
    this.loadoutItemsChange.emit(updatedLoadouts);
    
    // Update the filled slots
    this.updateFilledSlots();
    
    this.notificationService.success(`Item removed from ${slot} slot`);
  }
}

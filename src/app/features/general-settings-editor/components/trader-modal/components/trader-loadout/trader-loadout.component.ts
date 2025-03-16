import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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

import { LoadoutItem, LoadoutAttachments } from '../../../../../../core/models/general-settings.model';
import { TraderLoadoutService } from '../../../../services/trader-loadout.service';
import { NotificationService } from '../../../../../../shared/services';

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
  
  /** Item form group for adding/editing items */
  itemForm: FormGroup;
  
  /** Currently selected slot */
  selectedSlot: string | null = null;
  
  /** Currently editing item */
  editingItem: LoadoutItem | null = null;
  
  /** Index of the item being edited */
  editingItemIndex: number = -1;
  
  /** Attachment form for adding/editing attachments */
  attachmentForm: FormGroup;
  
  /** Flag to indicate if we are editing an attachment */
  isEditingAttachment: boolean = false;
  
  /** Index of the attachment being edited */
  editingAttachmentIndex: number = -1;

  constructor(
    private fb: FormBuilder,
    private traderLoadoutService: TraderLoadoutService,
    private notificationService: NotificationService
  ) {
    // Initialize the item form
    this.itemForm = this.fb.group({
      className: ['', [Validators.required, this.noSpacesValidator()]],
      quantity: [1, [Validators.required, this.validQuantityValidator()]]
    });

    // Initialize the attachment form
    this.attachmentForm = this.fb.group({
      className: ['', [Validators.required, this.noSpacesValidator()]],
      quantity: [1, [Validators.required, this.validQuantityValidator()]]
    });
  }

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
   * Get the item for a specific slot
   * @param slot The slot name to get the item for
   * @returns The loadout item for the slot or null if not found
   */
  getItemForSlot(slot: string): LoadoutItem | null {
    return this.loadoutItems.find(item => item.slotName === slot) || null;
  }

  /**
   * Select a slot to add or edit an item
   * @param slot The slot name to select
   */
  selectSlot(slot: string): void {
    this.selectedSlot = slot;
    
    // Check if the slot already has an item
    const existingItem = this.getItemForSlot(slot);
    if (existingItem) {
      // We're editing an existing item
      this.editingItem = { ...existingItem };
      this.editingItemIndex = this.loadoutItems.findIndex(item => item.slotName === slot);
      
      // Populate the form
      this.itemForm.patchValue({
        className: existingItem.className,
        quantity: existingItem.quantity
      });
    } else {
      // We're adding a new item
      this.editingItem = this.traderLoadoutService.createEmptyLoadoutItem(slot);
      this.editingItemIndex = -1;
      
      // Reset the form
      this.itemForm.reset({
        className: '',
        quantity: 1
      });
    }
    
    // Reset attachment editing state
    this.resetAttachmentForm();
  }

  /**
   * Remove an item from a slot
   * @param slot The slot name to remove the item from
   */
  removeItemFromSlot(slot: string): void {
    // Get the updated loadouts without this item
    const updatedLoadouts = this.traderLoadoutService.removeLoadoutItem([...this.loadoutItems], slot);
    
    // Update the loadout items
    this.loadoutItems = updatedLoadouts;
    this.loadoutItemsChange.emit(updatedLoadouts);
    
    // Update the filled slots
    this.updateFilledSlots();
    
    // Clear the selected slot if it was this one
    if (this.selectedSlot === slot) {
      this.selectedSlot = null;
      this.editingItem = null;
      this.editingItemIndex = -1;
      this.itemForm.reset();
    }
    
    this.notificationService.success(`Item removed from ${slot} slot`);
  }

  /**
   * Save the current item
   */
  saveItem(): void {
    if (this.itemForm.invalid || !this.selectedSlot || !this.editingItem) {
      return;
    }
    
    // Get the form values
    const formValues = this.itemForm.value;
    
    // Update the editing item with form values
    const updatedItem: LoadoutItem = {
      ...this.editingItem,
      className: formValues.className,
      quantity: formValues.quantity,
      slotName: this.selectedSlot
    };
    
    // Validate the item
    if (!this.traderLoadoutService.validateLoadoutItem(updatedItem)) {
      this.notificationService.error('Invalid item. Please check class name and quantity.');
      return;
    }
    
    // Add or update the item
    const updatedLoadouts = this.traderLoadoutService.addOrUpdateLoadoutItem(
      [...this.loadoutItems],
      updatedItem
    );
    
    // Update the loadout items
    this.loadoutItems = updatedLoadouts;
    this.loadoutItemsChange.emit(updatedLoadouts);
    
    // Update the filled slots
    this.updateFilledSlots();
    
    // Show success message
    this.notificationService.success(`Item ${this.editingItemIndex >= 0 ? 'updated' : 'added'} for ${this.selectedSlot} slot`);
    
    // Reset the form and editing state
    this.resetItemForm();
  }

  /**
   * Reset the item form and editing state
   */
  resetItemForm(): void {
    this.selectedSlot = null;
    this.editingItem = null;
    this.editingItemIndex = -1;
    this.itemForm.reset();
    this.resetAttachmentForm();
  }

  /**
   * Cancel editing an item
   */
  cancelEditItem(): void {
    this.resetItemForm();
  }

  /**
   * Start adding a new attachment to the current item
   */
  addAttachment(): void {
    if (!this.editingItem) {
      return;
    }
    
    // Reset the attachment form for a new attachment
    this.attachmentForm.reset({
      className: '',
      quantity: 1
    });
    
    this.isEditingAttachment = true;
    this.editingAttachmentIndex = -1;
  }

  /**
   * Start editing an existing attachment
   * @param attachment The attachment to edit
   * @param index The index of the attachment in the array
   */
  editAttachment(attachment: LoadoutAttachments, index: number): void {
    if (!this.editingItem) {
      return;
    }
    
    // Populate the attachment form
    this.attachmentForm.patchValue({
      className: attachment.className,
      quantity: attachment.quantity
    });
    
    this.isEditingAttachment = true;
    this.editingAttachmentIndex = index;
  }

  /**
   * Save the current attachment
   */
  saveAttachment(): void {
    if (this.attachmentForm.invalid || !this.editingItem) {
      return;
    }
    
    // Get the form values
    const formValues = this.attachmentForm.value;
    
    // Create the attachment object
    const attachment: LoadoutAttachments = {
      className: formValues.className,
      quantity: formValues.quantity
    };
    
    // Check if we're adding a new attachment or updating an existing one
    if (this.editingAttachmentIndex >= 0) {
      // Update existing attachment
      this.editingItem = this.traderLoadoutService.updateAttachment(
        this.editingItem,
        this.editingAttachmentIndex,
        attachment
      );
    } else {
      // Add new attachment
      this.editingItem = this.traderLoadoutService.addAttachment(
        this.editingItem,
        attachment
      );
    }
    
    // If we're editing an existing item, update it in the loadout
    if (this.editingItemIndex >= 0) {
      const updatedLoadouts = [...this.loadoutItems];
      updatedLoadouts[this.editingItemIndex] = this.editingItem;
      
      // Update the loadout items
      this.loadoutItems = updatedLoadouts;
      this.loadoutItemsChange.emit(updatedLoadouts);
    }
    
    // Reset the attachment form
    this.resetAttachmentForm();
    
    this.notificationService.success(
      `Attachment ${this.editingAttachmentIndex >= 0 ? 'updated' : 'added'} successfully`
    );
  }

  /**
   * Cancel editing an attachment
   */
  cancelEditAttachment(): void {
    this.resetAttachmentForm();
  }

  /**
   * Reset the attachment form and editing state
   */
  resetAttachmentForm(): void {
    this.isEditingAttachment = false;
    this.editingAttachmentIndex = -1;
    this.attachmentForm.reset();
  }

  /**
   * Remove an attachment from the current item
   * @param index The index of the attachment to remove
   */
  removeAttachment(index: number): void {
    if (!this.editingItem) {
      return;
    }
    
    // Remove the attachment
    this.editingItem = this.traderLoadoutService.removeAttachment(
      this.editingItem,
      index
    );
    
    // If we're editing an existing item, update it in the loadout
    if (this.editingItemIndex >= 0) {
      const updatedLoadouts = [...this.loadoutItems];
      updatedLoadouts[this.editingItemIndex] = this.editingItem;
      
      // Update the loadout items
      this.loadoutItems = updatedLoadouts;
      this.loadoutItemsChange.emit(updatedLoadouts);
    }
    
    this.notificationService.success('Attachment removed successfully');
  }

  /**
   * Validator that ensures value has no spaces
   */
  noSpacesValidator() {
    return (control: { value: string }) => {
      const hasSpaces = control.value && control.value.includes(' ');
      return hasSpaces ? { hasSpaces: true } : null;
    };
  }

  /**
   * Validator that ensures quantity is valid (-1 or > 0)
   */
  validQuantityValidator() {
    return (control: { value: number }) => {
      const value = control.value;
      const isValid = value === -1 || value > 0;
      return isValid ? null : { invalidQuantity: true };
    };
  }
}

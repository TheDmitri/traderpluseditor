import { Injectable } from '@angular/core';
import { LoadoutItem, LoadoutAttachments } from '../../../core/models/general-settings.model';
import { NotificationService } from '../../../shared/services';

/**
 * Service for managing trader NPC loadout items and their attachments
 */
@Injectable({
  providedIn: 'root',
})
export class TraderLoadoutService {
  // Predefined slots available in the game
  private readonly availableSlots = [
    "Head",
    "Shoulder",
    "Melee",
    "Headgear",
    "Mask",
    "Eyewear",
    "Hands",
    "LeftHand",
    "Gloves",
    "Armband",
    "Vest",
    "Body",
    "Back",
    "Hips",
    "Legs",
    "Feet",
    "Splint_Right"
  ];

  constructor(private notificationService: NotificationService) {}

  /**
   * Get all available slots
   * @returns Array of available slot names
   */
  getAvailableSlots(): string[] {
    return [...this.availableSlots];
  }

  /**
   * Get loadout item for a specific slot
   * @param loadouts Array of loadout items
   * @param slot The slot name to search for
   * @returns LoadoutItem for the specified slot or null if not found
   */
  getLoadoutItemForSlot(loadouts: LoadoutItem[], slot: string): LoadoutItem | null {
    return loadouts.find(item => item.slotName === slot) || null;
  }

  /**
   * Check if a slot is already filled
   * @param loadouts Array of loadout items
   * @param slot The slot name to check
   * @returns Boolean indicating if slot is filled
   */
  isSlotFilled(loadouts: LoadoutItem[], slot: string): boolean {
    return loadouts.some(item => item.slotName === slot);
  }

  /**
   * Add or update a loadout item
   * @param loadouts Current array of loadout items
   * @param item The loadout item to add or update
   * @returns New array with the added/updated item
   */
  addOrUpdateLoadoutItem(loadouts: LoadoutItem[], item: LoadoutItem): LoadoutItem[] {
    try {
      // Validate the item
      if (!this.validateLoadoutItem(item)) {
        this.notificationService.error('Invalid loadout item. Please check className and quantity.');
        return loadouts;
      }

      // Check if the slot is already filled
      const existingItemIndex = loadouts.findIndex(i => i.slotName === item.slotName);

      if (existingItemIndex >= 0) {
        // Update existing item
        const updatedLoadouts = [...loadouts];
        updatedLoadouts[existingItemIndex] = item;
        return updatedLoadouts;
      } else {
        // Add new item
        return [...loadouts, item];
      }
    } catch (error) {
      this.notificationService.error('Failed to add/update loadout item');
      return loadouts;
    }
  }

  /**
   * Remove a loadout item
   * @param loadouts Current array of loadout items
   * @param slotName The slot name to remove
   * @returns New array without the removed item
   */
  removeLoadoutItem(loadouts: LoadoutItem[], slotName: string): LoadoutItem[] {
    return loadouts.filter(item => item.slotName !== slotName);
  }

  /**
   * Add attachment to loadout item
   * @param item The loadout item to add an attachment to
   * @param attachment The attachment to add
   * @returns Updated loadout item with new attachment
   */
  addAttachment(item: LoadoutItem, attachment: LoadoutAttachments): LoadoutItem {
    try {
      if (!this.validateAttachment(attachment)) {
        this.notificationService.error('Invalid attachment. Please check className and quantity.');
        return item;
      }

      return {
        ...item,
        attachments: [...(item.attachments || []), attachment]
      };
    } catch (error) {
      this.notificationService.error('Failed to add attachment');
      return item;
    }
  }

  /**
   * Update an existing attachment
   * @param item The loadout item containing the attachment
   * @param attachmentIndex The index of the attachment to update
   * @param updatedAttachment The updated attachment data
   * @returns Updated loadout item with modified attachment
   */
  updateAttachment(
    item: LoadoutItem, 
    attachmentIndex: number, 
    updatedAttachment: LoadoutAttachments
  ): LoadoutItem {
    try {
      if (!this.validateAttachment(updatedAttachment)) {
        this.notificationService.error('Invalid attachment. Please check className and quantity.');
        return item;
      }

      const newAttachments = [...(item.attachments || [])];
      if (attachmentIndex >= 0 && attachmentIndex < newAttachments.length) {
        newAttachments[attachmentIndex] = updatedAttachment;
      }

      return {
        ...item,
        attachments: newAttachments
      };
    } catch (error) {
      this.notificationService.error('Failed to update attachment');
      return item;
    }
  }

  /**
   * Remove attachment from loadout item
   * @param item The loadout item to remove an attachment from
   * @param attachmentIndex The index of the attachment to remove
   * @returns Updated loadout item without the removed attachment
   */
  removeAttachment(item: LoadoutItem, attachmentIndex: number): LoadoutItem {
    try {
      const newAttachments = [...(item.attachments || [])];
      if (attachmentIndex >= 0 && attachmentIndex < newAttachments.length) {
        newAttachments.splice(attachmentIndex, 1);
      }

      return {
        ...item,
        attachments: newAttachments
      };
    } catch (error) {
      this.notificationService.error('Failed to remove attachment');
      return item;
    }
  }

  /**
   * Validate loadout item
   * @param item The loadout item to validate
   * @returns Boolean indicating if the item is valid
   */
  validateLoadoutItem(item: LoadoutItem): boolean {
    // Check if className is valid (no spaces)
    if (!item.className || item.className.includes(' ')) {
      return false;
    }

    // Check if quantity is valid (either -1 or > 0, not 0)
    if (item.quantity === 0 || (item.quantity !== -1 && item.quantity < 1)) {
      return false;
    }

    // Check if slotName is valid
    if (!item.slotName || !this.availableSlots.includes(item.slotName)) {
      return false;
    }

    return true;
  }

  /**
   * Validate attachment
   * @param attachment The attachment to validate
   * @returns Boolean indicating if the attachment is valid
   */
  validateAttachment(attachment: LoadoutAttachments): boolean {
    // Check if className is valid (no spaces)
    if (!attachment.className || attachment.className.includes(' ')) {
      return false;
    }

    // Check if quantity is valid (either -1 or > 0, not 0)
    if (attachment.quantity === 0 || (attachment.quantity !== -1 && attachment.quantity < 1)) {
      return false;
    }

    return true;
  }

  /**
   * Create empty loadout item for a specific slot
   * @param slotName The slot name for the new item
   * @returns New empty loadout item
   */
  createEmptyLoadoutItem(slotName: string): LoadoutItem {
    return {
      className: '',
      quantity: 1,
      slotName: slotName,
      attachments: []
    };
  }

  /**
   * Create empty attachment
   * @returns New empty attachment
   */
  createEmptyAttachment(): LoadoutAttachments {
    return {
      className: '',
      quantity: 1
    };
  }
}

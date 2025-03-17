import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';

import {
  LoadoutItem,
  LoadoutAttachments,
} from '../../../../../../../core/models/general-settings.model';
import { TraderLoadoutService } from '../../../../../services/trader-loadout.service';
import { NotificationService } from '../../../../../../../shared/services';

/**
 * Dialog data interface for LoadoutModalComponent
 */
export interface LoadoutModalData {
  item?: LoadoutItem; // Item to edit (null for new items)
  availableSlots: string[]; // List of all available slots
  usedSlotNames?: string[]; // List of slot names already in use (for validation)
  editMode: boolean; // Whether we're editing an existing item
}

/**
 * Component for adding/editing trader loadout items in a modal
 */
@Component({
  selector: 'app-loadout-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
    MatDividerModule,
    MatChipsModule,
  ],
  templateUrl: './loadout-modal.component.html',
  styleUrls: ['./loadout-modal.component.scss'],
})
export class LoadoutModalComponent implements OnInit {
  /** Form for loadout item */
  itemForm: FormGroup;

  /** Form for attachments */
  attachmentForm: FormGroup;

  /** Flag to track showing attachment form */
  showAttachmentForm = false;

  /** Current item being edited - this is a working copy */
  currentItem: LoadoutItem;

  /** Dialog title */
  dialogTitle: string;

  /** Flag to track editing attachment */
  isEditingAttachment = false;

  /** Index of attachment being edited */
  editingAttachmentIndex = -1;
  
  /** Temporary copy of attachments for editing */
  private workingAttachments: LoadoutAttachments[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<LoadoutModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LoadoutModalData,
    private traderLoadoutService: TraderLoadoutService,
    private notificationService: NotificationService
  ) {
    // Set the dialog width
    this.dialogRef.addPanelClass('loadout-modal-dialog');
    
    // Initialize forms
    this.itemForm = this.fb.group({
      slotName: [{ value: '', disabled: data.editMode }, Validators.required],
      className: ['', [Validators.required, this.noSpacesValidator()]],
      quantity: [1, [Validators.required, this.validQuantityValidator()]],
    });

    this.attachmentForm = this.fb.group({
      className: ['', [Validators.required, this.noSpacesValidator()]],
      quantity: [1, [Validators.required, this.validQuantityValidator()]],
    });

    // Initialize current item with a deep copy to avoid modifying the original
    if (data.item) {
      // Create a deep copy of the item to avoid modifying the original
      this.currentItem = {
        className: data.item.className,
        quantity: data.item.quantity,
        slotName: data.item.slotName,
        attachments: []
      };
      
      // Deep copy any attachments
      if (data.item.attachments && data.item.attachments.length > 0) {
        this.workingAttachments = data.item.attachments.map(attachment => ({
          className: attachment.className,
          quantity: attachment.quantity
        }));
      }
    } else {
      // Initialize with empty values
      this.currentItem = {
        className: '',
        quantity: 1,
        slotName: '',
        attachments: []
      };
    }
    
    // Set the working attachments to the current item
    this.currentItem.attachments = this.workingAttachments;

    // Set dialog title
    this.dialogTitle = data.editMode ? 'Edit Loadout Item' : 'Add Loadout Item';
  }

  ngOnInit(): void {
    // If editing, prefill the form
    if (this.data.editMode && this.data.item) {
      this.itemForm.patchValue({
        slotName: this.data.item.slotName,
        className: this.data.item.className,
        quantity: this.data.item.quantity,
      });
    }
  }

  /**
   * Save the item and close the dialog
   */
  saveItem(): void {
    if (this.itemForm.invalid) {
      return;
    }

    // Get form values
    const formValues = this.itemForm.getRawValue(); // Use getRawValue to get disabled controls too

    // Create a new item object to return (avoid modifying the original)
    const savedItem: LoadoutItem = {
      className: formValues.className,
      quantity: formValues.quantity,
      slotName: formValues.slotName,
      // Create a deep copy of attachments to avoid reference issues
      attachments: this.workingAttachments.map(attachment => ({
        className: attachment.className,
        quantity: attachment.quantity
      }))
    };

    // Return the new item via dialog close
    this.dialogRef.close(savedItem);
  }

  /**
   * Cancel and close the dialog
   */
  cancel(): void {
    this.dialogRef.close(null);
  }

  /**
   * Toggle the attachment form visibility
   */
  toggleAttachmentForm(): void {
    this.showAttachmentForm = !this.showAttachmentForm;

    if (this.showAttachmentForm) {
      // Reset attachment form
      this.attachmentForm.reset({
        className: '',
        quantity: 1,
      });
      this.isEditingAttachment = false;
      this.editingAttachmentIndex = -1;
    }
  }

  /**
   * Add new attachment
   */
  addAttachment(): void {
    if (this.attachmentForm.invalid) {
      return;
    }

    // Get form values
    const formValues = this.attachmentForm.value;

    // Create attachment
    const attachment: LoadoutAttachments = {
      className: formValues.className,
      quantity: formValues.quantity,
    };

    // Add to working attachments
    if (!this.workingAttachments) {
      this.workingAttachments = [];
    }

    // If editing attachment, update it
    if (this.isEditingAttachment && this.editingAttachmentIndex >= 0) {
      this.workingAttachments[this.editingAttachmentIndex] = attachment;
    } else {
      // Otherwise add new attachment
      this.workingAttachments.push(attachment);
    }
    
    // Update the current item's attachments reference to show in the UI
    this.currentItem.attachments = this.workingAttachments;

    // Reset form and state
    this.attachmentForm.reset({
      className: '',
      quantity: 1,
    });

    this.isEditingAttachment = false;
    this.editingAttachmentIndex = -1;

    this.notificationService.success(
      `Attachment ${
        this.isEditingAttachment ? 'updated' : 'added'
      } successfully`
    );
  }

  /**
   * Edit an attachment
   */
  editAttachment(attachment: LoadoutAttachments, index: number): void {
    this.isEditingAttachment = true;
    this.editingAttachmentIndex = index;
    this.showAttachmentForm = true;

    // Populate form
    this.attachmentForm.patchValue({
      className: attachment.className,
      quantity: attachment.quantity,
    });
  }

  /**
   * Remove an attachment
   */
  removeAttachment(index: number): void {
    if (index >= 0 && index < this.workingAttachments.length) {
      this.workingAttachments.splice(index, 1);
      // Update the current item's attachments reference to show in the UI
      this.currentItem.attachments = this.workingAttachments;
      this.notificationService.success('Attachment removed');
    }
  }

  /**
   * Get available slots for dropdown
   */
  getAvailableSlots(): string[] {
    if (this.data.editMode) {
      // When editing, show all slots
      return this.data.availableSlots;
    }

    // When creating, filter out used slots
    return this.data.availableSlots.filter(
      (slot) =>
        !this.data.usedSlotNames?.includes(slot) ||
        slot === this.currentItem.slotName
    );
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

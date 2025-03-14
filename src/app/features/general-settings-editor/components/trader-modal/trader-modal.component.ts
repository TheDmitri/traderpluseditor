import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRadioModule } from '@angular/material/radio';
import { MatExpansionModule } from '@angular/material/expansion'; // Add this import

// Application imports
import { TraderNpc } from '../../../../core/models/general-settings.model';
import { TraderService } from '../../services/trader.service';

/**
 * Enum for trader types
 */
export enum TraderType {
  NPC = 'NPC',
  ATM = 'ATM',
  OBJECT = 'OBJECT'
}

/**
 * Component for adding/editing trader NPCs in a modal dialog
 */
@Component({
  selector: 'app-trader-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatRadioModule,
    MatExpansionModule // Add this module
  ],
  templateUrl: './trader-modal.component.html',
  styleUrls: ['./trader-modal.component.scss']
})
export class TraderModalComponent implements OnInit {
  /** Form group for trader data */
  traderForm: FormGroup;
  
  /** Title for the dialog */
  dialogTitle: string;
  
  /** Flag to track if this is a new trader */
  isNewTrader: boolean;

  /** Available trader types enum for template */
  traderTypes = TraderType;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TraderModalComponent>,
    private traderService: TraderService,
    @Inject(MAT_DIALOG_DATA) public data: { trader: TraderNpc | null }
  ) {
    this.isNewTrader = !data.trader || !data.trader.className;
    this.dialogTitle = this.isNewTrader ? 'Add New Trader' : 'Edit Trader';
    
    // Initialize form with empty values
    this.traderForm = this.fb.group({
      type: [TraderType.NPC, Validators.required],
      npcId: [{ value: 0, disabled: true }],
      className: ['', Validators.required],
      givenName: ['', Validators.required],
      role: [''],
      positionX: [0, Validators.required],
      positionY: [0, Validators.required],
      positionZ: [0, Validators.required],
      orientationX: [0, Validators.required],
      orientationY: [0, Validators.required],
      orientationZ: [0, Validators.required]
    });

    // React to type changes
    this.traderForm.get('type')?.valueChanges.subscribe((type: TraderType) => {
      this.handleTraderTypeChange(type);
    });
  }

  ngOnInit(): void {
    // If we have existing trader data, populate the form and determine type
    if (this.data.trader) {
      const trader = this.data.trader;
      
      // Determine trader type based on data
      let traderType = TraderType.NPC;
      if (trader.npcId === -2 && trader.className === 'TraderPlus_BANK_ATM') {
        traderType = TraderType.ATM;
      } else if (trader.className && !trader.loadouts?.length) {
        // If it has a className but no loadouts, assume it's an object
        // This is a simple heuristic, might need refinement
        traderType = TraderType.OBJECT;
      }
      
      this.traderForm.patchValue({
        type: traderType,
        npcId: trader.npcId,
        className: trader.className,
        givenName: trader.givenName,
        role: trader.role || '',
        positionX: trader.position?.[0] || 0,
        positionY: trader.position?.[1] || 0,
        positionZ: trader.position?.[2] || 0,
        orientationX: trader.orientation?.[0] || 0,
        orientationY: trader.orientation?.[1] || 0,
        orientationZ: trader.orientation?.[2] || 0
      });

      // Lock fields if it's an ATM
      if (traderType === TraderType.ATM) {
        this.traderForm.get('givenName')?.disable();
        this.traderForm.get('role')?.disable();
        this.traderForm.get('className')?.disable();
      }
    } else {
      // For new traders, determine and set the next available ID
      this.setNextAvailableId();
    }
  }

  /**
   * Handle changes to the trader type
   */
  handleTraderTypeChange(type: TraderType): void {
    const classnameControl = this.traderForm.get('className');
    const givenNameControl = this.traderForm.get('givenName');
    const roleControl = this.traderForm.get('role');
    const idControl = this.traderForm.get('npcId');

    // Reset to enabled state
    classnameControl?.enable();
    givenNameControl?.enable();
    roleControl?.enable();

    switch (type) {
      case TraderType.ATM:
        // Set fixed values for ATM
        idControl?.setValue(-2);
        classnameControl?.setValue('TraderPlus_BANK_ATM');
        givenNameControl?.setValue('ATM');
        roleControl?.setValue('ATM');
        
        // Disable fields that shouldn't be changed for ATM
        classnameControl?.disable();
        givenNameControl?.disable();
        roleControl?.disable();
        break;

      case TraderType.NPC:
      case TraderType.OBJECT:
        // If switching from ATM, reset these values only if they match ATM defaults
        if (this.isNewTrader || givenNameControl?.value === 'ATM') {
          givenNameControl?.setValue('');
        }
        if (this.isNewTrader || roleControl?.value === 'ATM') {
          roleControl?.setValue('');
        }
        if (this.isNewTrader || classnameControl?.value === 'TraderPlus_BANK_ATM') {
          classnameControl?.setValue('');
        }

        // Set next available ID
        this.setNextAvailableId();
        break;
    }
  }

  /**
   * Set the next available ID for the trader
   */
  setNextAvailableId(): void {
    const type = this.traderForm.get('type')?.value;
    if (type !== TraderType.ATM) {
      const nextId = this.traderService.getNextTraderId();
      this.traderForm.get('npcId')?.setValue(nextId);
    }
  }

  /**
   * Submit the form data and close the dialog
   */
  onSubmit(): void {
    if (this.traderForm.invalid) {
      return;
    }
    
    // Get raw value to include disabled controls
    const formValue = this.traderForm.getRawValue();
    const traderType = formValue.type;
    
    // Build the trader object
    const trader: TraderNpc = {
      npcId: formValue.npcId,
      className: formValue.className.trim(),
      givenName: formValue.givenName.trim(),
      role: formValue.role.trim(),
      position: [formValue.positionX, formValue.positionY, formValue.positionZ],
      orientation: [formValue.orientationX, formValue.orientationY, formValue.orientationZ],
      categoriesId: this.data.trader?.categoriesId || [],
      currenciesAccepted: this.data.trader?.currenciesAccepted || [],
      // Only include loadouts for NPC type
      loadouts: traderType === TraderType.NPC ? (this.data.trader?.loadouts || []) : []
    };
    
    this.dialogRef.close({ trader, traderType });
  }

  /**
   * Close the dialog without saving
   */
  onCancel(): void {
    this.dialogRef.close();
  }
}

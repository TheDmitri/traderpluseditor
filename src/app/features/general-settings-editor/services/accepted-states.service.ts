import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

// Application imports
import { GeneralSettingsService } from './general-settings.service';

/**
 * Service for managing accepted states in TraderPlus general settings
 */
@Injectable({
  providedIn: 'root',
})
export class AcceptedStatesService {
  constructor(
    private generalSettingsService: GeneralSettingsService,
    private formBuilder: FormBuilder
  ) {}
  
  /**
   * Create a form group for accepted states
   * @returns Form group for accepted states
   */
  createAcceptedStatesForm(): FormGroup {
    return this.formBuilder.group({
      worn: [false],
      damaged: [false],
      badly_damaged: [false],
      coefficientWorn: [0.0, [Validators.min(0), Validators.max(1)]],
      coefficientDamaged: [0.0, [Validators.min(0), Validators.max(1)]],
      coefficientBadlyDamaged: [0.0, [Validators.min(0), Validators.max(1)]]
    });
  }
  
  /**
   * Initialize a form group with values from settings
   * @param form The form group to initialize
   */
  initFormFromSettings(form: FormGroup): void {
    const settings = this.generalSettingsService.getGeneralSettings();
    if (!settings || !settings.acceptedStates) return;
    
    form.patchValue({
      worn: settings.acceptedStates.worn,
      damaged: settings.acceptedStates.damaged,
      badly_damaged: settings.acceptedStates.badly_damaged,
      coefficientWorn: settings.acceptedStates.coefficientWorn || 0.0,
      coefficientDamaged: settings.acceptedStates.coefficientDamaged || 0.0,
      coefficientBadlyDamaged: settings.acceptedStates.coefficientBadlyDamaged || 0.0
    });
  }
  
  /**
   * Save accepted states from form to settings
   * @param form The form with accepted states values
   * @returns True if saved successfully, false otherwise
   */
  saveAcceptedStates(form: FormGroup): boolean {
    if (!form.valid) return false;
    
    const settings = this.generalSettingsService.getGeneralSettings();
    if (!settings) return false;
    
    const formValue = form.value;
    
    // Set coefficients to 0 for inactive states
    settings.acceptedStates = {
      worn: formValue.worn,
      damaged: formValue.damaged,
      badly_damaged: formValue.badly_damaged,
      coefficientWorn: formValue.worn ? parseFloat(formValue.coefficientWorn) : 0.0,
      coefficientDamaged: formValue.damaged ? parseFloat(formValue.coefficientDamaged) : 0.0,
      coefficientBadlyDamaged: formValue.badly_damaged ? parseFloat(formValue.coefficientBadlyDamaged) : 0.0
    };
    
    // Save the updated settings
    this.generalSettingsService.saveGeneralSettings(settings);
    
    return true;
  }
  
  /**
   * Set up state toggle listeners to reset coefficients when states are disabled
   * @param form The form group to set up listeners for
   * @param onStateToggle Optional callback for when a state is toggled
   */
  setupStateToggleListeners(form: FormGroup, onStateToggle?: () => void): void {
    if (!form) return;
    
    // Reset coefficient when worn state is toggled off
    form.get('worn')?.valueChanges.subscribe(isActive => {
      if (!isActive) {
        form.get('coefficientWorn')?.setValue(0.0);
        if (onStateToggle) onStateToggle();
      }
    });

    // Reset coefficient when damaged state is toggled off
    form.get('damaged')?.valueChanges.subscribe(isActive => {
      if (!isActive) {
        form.get('coefficientDamaged')?.setValue(0.0);
        if (onStateToggle) onStateToggle();
      }
    });

    // Reset coefficient when badly_damaged state is toggled off
    form.get('badly_damaged')?.valueChanges.subscribe(isActive => {
      if (!isActive) {
        form.get('coefficientBadlyDamaged')?.setValue(0.0);
        if (onStateToggle) onStateToggle();
      }
    });
  }
}
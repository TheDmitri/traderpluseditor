import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

// Application imports
import { TraderObject } from '../../../../../core/models';

@Component({
  selector: 'app-object-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  templateUrl: './object-modal.component.html',
  styleUrls: ['./object-modal.component.scss']
})
export class ObjectModalComponent implements OnInit {
  objectForm!: FormGroup;
  isEditMode = false;
  
  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ObjectModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { object: TraderObject | null }
  ) {}

  ngOnInit(): void {
    this.isEditMode = !!this.data.object;
    this.initializeForm();
  }

  /**
   * Initialize the form with validation
   */
  initializeForm(): void {
    const object = this.data.object;
    const position = object?.position || [0, 0, 0];
    const orientation = object?.orientation || [0, 0, 0];

    this.objectForm = this.fb.group({
      className: [object?.className || '', [Validators.required]],
      positionX: [position[0] || 0, [Validators.required]],
      positionY: [position[1] || 0, [Validators.required]],
      positionZ: [position[2] || 0, [Validators.required]],
      orientationX: [orientation[0] || 0, [Validators.required]],
      orientationY: [orientation[1] || 0, [Validators.required]],
      orientationZ: [orientation[2] || 0, [Validators.required]]
    });
  }

  /**
   * Save the trader object
   */
  saveObject(): void {
    if (this.objectForm.valid) {
      const formValues = this.objectForm.value;
      
      const traderObject: TraderObject = {
        className: formValues.className,
        position: [
          Number(formValues.positionX),
          Number(formValues.positionY),
          Number(formValues.positionZ)
        ],
        orientation: [
          Number(formValues.orientationX),
          Number(formValues.orientationY),
          Number(formValues.orientationZ)
        ]
      };
      
      this.dialogRef.close(traderObject);
    }
  }

  /**
   * Close the dialog without saving
   */
  cancel(): void {
    this.dialogRef.close();
  }
}

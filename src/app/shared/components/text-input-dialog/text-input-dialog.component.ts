import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface TextInputDialogData {
  title: string;
  label: string;
  placeholder: string;
  initialValue: string;
  confirmText: string;
}

@Component({
  selector: 'app-text-input-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <h1 mat-dialog-title>{{ data.title }}</h1>
    <div mat-dialog-content>
      <mat-form-field appearance="fill" style="width: 100%">
        <mat-label>{{ data.label }}</mat-label>
        <input matInput [(ngModel)]="value" placeholder="{{ data.placeholder }}">
      </mat-form-field>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-button color="primary" [disabled]="!value.trim()" (click)="onConfirm()">
        {{ data.confirmText }}
      </button>
    </div>
  `,
  styles: [`
    mat-form-field {
      width: 100%;
    }
  `]
})
export class TextInputDialogComponent {
  value: string;

  constructor(
    public dialogRef: MatDialogRef<TextInputDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TextInputDialogData
  ) {
    this.value = data.initialValue || '';
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.value.trim()) {
      this.dialogRef.close(this.value);
    }
  }
}

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="confirm-dialog" [class]="data.type || 'info'">
      <div class="dialog-header">
        <mat-icon>{{ getIcon() }}</mat-icon>
        <h2 mat-dialog-title>{{ data.title }}</h2>
      </div>

      <mat-dialog-content>
        <p>{{ data.message }}</p>
      </mat-dialog-content>

      <mat-dialog-actions>
        <button mat-button (click)="onCancel()">
          {{ data.cancelText || 'Cancel' }}
        </button>
        <button mat-raised-button 
                [color]="getButtonColor()" 
                (click)="onConfirm()">
          {{ data.confirmText || 'Confirm' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      padding: 24px;
      min-width: 320px;

      &.warning .dialog-header mat-icon {
        color: #ffa726;
      }

      &.danger .dialog-header mat-icon {
        color: #f44336;
      }

      &.info .dialog-header mat-icon {
        color: #2196f3;
      }

      .dialog-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;

        mat-icon {
          font-size: 24px;
          width: 24px;
          height: 24px;
        }

        h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 500;
        }
      }

      mat-dialog-content {
        margin: 0;
        padding: 0;
        color: rgba(255, 255, 255, 0.7);
        font-size: 16px;
        line-height: 1.5;
      }

      mat-dialog-actions {
        margin: 24px -24px -24px;
        padding: 16px 24px;
        border-top: 1px solid rgba(255, 255, 255, 0.12);
        justify-content: flex-end;
        gap: 8px;
      }
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {
    this.dialogRef.disableClose = true;
  }

  getIcon(): string {
    switch (this.data.type) {
      case 'warning': return 'warning';
      case 'danger': return 'error';
      default: return 'info';
    }
  }

  getButtonColor(): string {
    switch (this.data.type) {
      case 'warning': return 'warn';
      case 'danger': return 'warn';
      default: return 'primary';
    }
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
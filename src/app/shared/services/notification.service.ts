import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private defaultConfig: MatSnackBarConfig = {
    duration: 5000,
    horizontalPosition: 'right',
    verticalPosition: 'top',
    panelClass: ['custom-snackbar'],
  };

  constructor(private snackBar: MatSnackBar) {}

  success(message: string): void {
    this.snackBar.open(message, 'Close', {
      ...this.defaultConfig,
      panelClass: ['custom-snackbar', 'success-snackbar'],
    });
  }

  warning(message: string): void {
    this.snackBar.open(message, 'Close', {
      ...this.defaultConfig,
      panelClass: ['custom-snackbar', 'warning-snackbar'],
    });
  }

  error(message: string): void {
    this.snackBar.open(message, 'Close', {
      ...this.defaultConfig,
      duration: 5000,
      panelClass: ['custom-snackbar', 'error-snackbar'],
    });
  }
}

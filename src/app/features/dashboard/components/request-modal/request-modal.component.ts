import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';

export interface RequestFormData {
  type: 'bug' | 'enhancement';
  title: string;
  description: string;
  attachments: File[];
}

@Component({
  selector: 'app-request-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule,
    MatTooltipModule,
    MatProgressBarModule
  ],
  templateUrl: './request-modal.component.html',
  styleUrl: './request-modal.component.scss'
})
export class RequestModalComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<RequestModalComponent>);
  
  requestForm: FormGroup;
  files: File[] = [];
  
  previewMode = false;
  isSubmitting = false;
  
  constructor() {
    this.requestForm = this.fb.group({
      type: ['enhancement', Validators.required],
      title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(20)]]
    });
  }
  
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const newFiles = Array.from(input.files);
      
      // Check file types
      const validFiles = newFiles.filter(file => {
        const fileType = file.type.toLowerCase();
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        
        return fileType.includes('image/') || 
               extension === 'json' || 
               extension === 'txt';
      });
      
      this.files = [...this.files, ...validFiles];
      input.value = ''; // Reset input
    }
  }
  
  removeFile(index: number): void {
    const updatedFiles = [...this.files];
    updatedFiles.splice(index, 1);
    this.files = updatedFiles;
  }
  
  togglePreview(): void {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }
    this.previewMode = !this.previewMode;
  }
  
  getFileIcon(file: File): string {
    if (file.type.includes('image/')) {
      return 'image';
    } else if (file.name.endsWith('.json')) {
      return 'data_object';
    } else if (file.name.endsWith('.txt')) {
      return 'description';
    }
    return 'attach_file';
  }
  
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  getRequestTypeLabel(): string {
    return this.requestForm.get('type')?.value === 'bug' ? 'Bug Report' : 'Feature Request';
  }
  
  onCancel(): void {
    this.dialogRef.close();
  }
  
  onSubmit(): void {
    if (this.requestForm.invalid) {
      this.requestForm.markAllAsTouched();
      return;
    }
    
    const formData: RequestFormData = {
      ...this.requestForm.value,
      attachments: this.files
    };
    
    // In the future, this will call the GitHub issue service
    console.log('Form data to submit:', formData);
    
    // Simulate API call
    this.isSubmitting = true;
    setTimeout(() => {
      this.isSubmitting = false;
      this.dialogRef.close(formData);
    }, 1500);
  }
}

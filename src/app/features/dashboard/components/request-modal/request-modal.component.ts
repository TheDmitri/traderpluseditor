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
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../../environments/environment';

import { GithubIssueService, IssueRequest } from '../../services/github-issue.service';
import { NotificationService } from '../../../../shared/services';
import { catchError, finalize, of } from 'rxjs';

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
    MatProgressBarModule,
    MatSnackBarModule
  ],
  templateUrl: './request-modal.component.html',
  styleUrl: './request-modal.component.scss'
})
export class RequestModalComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<RequestModalComponent>);
  private githubIssueService = inject(GithubIssueService);
  private notificationService = inject(NotificationService);
  
  requestForm: FormGroup;
  files: File[] = [];
  
  previewMode = false;
  isSubmitting = false;
  
  // Preview for images (data URLs)
  imageDataUrls: {[key: string]: string} = {};
  
  // Expose environment and navigator for use in the template
  environment = environment;
  navigator = navigator;
  
  constructor() {
    this.requestForm = this.fb.group({
      type: ['enhancement', Validators.required],
      title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(20)]]
    });
    
    // Initialize description with template text based on type
    this.updateDescriptionTemplate('enhancement');
    
    // Update description template when type changes
    this.requestForm.get('type')?.valueChanges.subscribe(type => {
      this.updateDescriptionTemplate(type);
    });
  }
  
  private updateDescriptionTemplate(type: 'bug' | 'enhancement'): void {
    let template = '';
    
    // Only update if description is empty or matches a previous template
    const currentDescription = this.requestForm.get('description')?.value || '';
    const isDescriptionEmpty = !currentDescription || 
                               currentDescription.includes('## Detailed Description') ||
                               currentDescription.includes('## Steps to Reproduce');
    
    if (isDescriptionEmpty) {
      if (type === 'bug') {
        template = 
`## Detailed Description
Describe the bug in detail here...

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
A clear description of what you expected to happen.`;
      } else {
        template = 
`## Detailed Description
Describe the feature you'd like to see added...

## Use Case
Explain why this feature would be useful and how it would be used.

## Suggested Implementation
If you have ideas about how this could be implemented, share them here.`;
      }
      
      this.requestForm.get('description')?.setValue(template);
    }
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
      
      // Generate previews for images
      validFiles.forEach(file => {
        if (file.type.includes('image/')) {
          this.githubIssueService.processImageFile(file)
            .then(dataUrl => {
              this.imageDataUrls[file.name] = dataUrl;
            })
            .catch(error => console.error('Error creating image preview:', error));
        }
      });
      
      this.files = [...this.files, ...validFiles];
      input.value = ''; // Reset input
    }
  }
  
  removeFile(index: number): void {
    const removedFile = this.files[index];
    
    // Remove image preview if it exists
    if (this.imageDataUrls[removedFile.name]) {
      delete this.imageDataUrls[removedFile.name];
    }
    
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
  
  hasImagePreview(file: File): boolean {
    return file.type.includes('image/') && !!this.imageDataUrls[file.name];
  }
  
  getImagePreview(file: File): string {
    return this.imageDataUrls[file.name] || '';
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
    
    // Prepare the request data
    const issueRequest: IssueRequest = {
      type: this.requestForm.get('type')?.value,
      title: this.requestForm.get('title')?.value,
      description: this.requestForm.get('description')?.value,
      attachments: this.files
    };
    
    // Get the GitHub issue URL
    const githubIssueUrl = this.githubIssueService.generateIssueUrl(issueRequest);
    
    // Show a success message using the notification service
    this.notificationService.success(`Your ${this.getRequestTypeLabel().toLowerCase()} has been prepared. Check the GitHub Tab to submit.`);
    
    // Open the GitHub issue page in a new tab
    window.open(githubIssueUrl, '_blank');
    
    // Close the dialog
    this.dialogRef.close({
      type: issueRequest.type,
      title: issueRequest.title
    });
  }
  
  // Handle API call errors if needed
  private handleError(error: any): void {
    this.notificationService.error(`Error submitting your request: ${error.message}`);
  }
}

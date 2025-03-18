import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

// Services
import {
  FileConverterService,
  TraderPlusConverterService,
  ExpansionConverterService,
  JonesConverterService,
} from '../services';
// Pipe for file size formatting
import { FileSizePipe } from '../../../shared/pipes/filesize.pipe';

interface ConvertedFile {
  name: string;
  content: string;
  type: string;
  size: number;
}

// Define proper interfaces for conversion status and progress
interface ConversionStatus {
  traderPlus: string;
  expansion: string;
  jones: string;
  [key: string]: string; // Add index signature to allow string indexing
}

interface ConversionProgress {
  traderPlus: number;
  expansion: number;
  jones: number;
  [key: string]: number; // Add index signature to allow string indexing
}

@Component({
  selector: 'app-file-converter',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatMenuModule,
    MatChipsModule,
    MatListModule,
    FileSizePipe,
  ],
  templateUrl: './file-converter.component.html',
  styleUrl: './file-converter.component.scss',
})
export class FileConverterComponent {
  // Files arrays for each trader mod
  traderPlusFiles: File[] = [];
  expansionFiles: File[] = [];
  jonesFiles: File[] = [];
  
  // Conversion status and progress tracking with proper interfaces
  conversionStatus: ConversionStatus = {
    traderPlus: '',
    expansion: '',
    jones: ''
  };
  
  conversionProgress: ConversionProgress = {
    traderPlus: 0,
    expansion: 0,
    jones: 0
  };
  
  // Array to store converted files
  convertedFiles: ConvertedFile[] = [];

  constructor(
    private fileConverterService: FileConverterService,
    private traderPlusConverterService: TraderPlusConverterService,
    private expansionConverterService: ExpansionConverterService,
    private jonesConverterService: JonesConverterService
  ) {}

  /**
   * Opens the file selector dialog
   */
  openFileSelector(): void {
    // This would trigger a dialog to select which converter to use
    // For now, we'll just open the default file selector
    this.selectFiles('traderplus');
  }

  /**
   * Handles file selection for specific trader mod
   */
  selectFiles(converterType: string): void {
    // Creates and clicks a hidden file input to trigger file selection
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = '.json,.txt,.xml';

    fileInput.addEventListener('change', (event: Event) => {
      const files = (event.target as HTMLInputElement).files;
      if (files) {
        this.handleSelectedFiles(files, converterType);
      }
    });

    fileInput.click();
  }

  /**
   * Processes the selected files
   */
  private handleSelectedFiles(fileList: FileList, converterType: string): void {
    const files = Array.from(fileList);

    switch (converterType) {
      case 'traderplus':
        this.traderPlusFiles = [...this.traderPlusFiles, ...files];
        break;
      case 'expansion':
        this.expansionFiles = [...this.expansionFiles, ...files];
        break;
      case 'jones':
        this.jonesFiles = [...this.jonesFiles, ...files];
        break;
    }
  }

  /**
   * Removes a file from the selected files
   */
  removeFile(file: File, converterType: string): void {
    switch (converterType) {
      case 'traderplus':
        this.traderPlusFiles = this.traderPlusFiles.filter((f) => f !== file);
        break;
      case 'expansion':
        this.expansionFiles = this.expansionFiles.filter((f) => f !== file);
        break;
      case 'jones':
        this.jonesFiles = this.jonesFiles.filter((f) => f !== file);
        break;
    }
  }

  /**
   * Starts the conversion process for the selected files
   */
  convert(converterType: string): void {
    // Validate converter type to ensure type safety
    if (converterType !== 'traderplus' && converterType !== 'expansion' && converterType !== 'jones') {
      console.error('Invalid converter type:', converterType);
      return;
    }
    
    // Reset status and progress
    this.conversionProgress[converterType] = 0;
    this.conversionStatus[converterType] = 'Starting conversion...';

    // Select the appropriate files and converter service
    let files: File[] = [];
    let service: any;

    switch (converterType) {
      case 'traderplus':
        files = this.traderPlusFiles;
        service = this.traderPlusConverterService;
        break;
      case 'expansion':
        files = this.expansionFiles;
        service = this.expansionConverterService;
        break;
      case 'jones':
        files = this.jonesFiles;
        service = this.jonesConverterService;
        break;
    }

    // Use the FileConverterService to handle the conversion
    this.fileConverterService.readFiles(files).subscribe({
      next: (result) => {
        // Update progress
        this.conversionProgress[converterType] = 50;
        this.conversionStatus[converterType] = 'Processing files...';

        // Mock conversion result (in a real app, this would call the actual converter)
        setTimeout(() => {
          this.conversionProgress[converterType] = 100;
          this.conversionStatus[converterType] = 'Conversion complete!';

          // Add mock converted files
          files.forEach((file) => {
            this.convertedFiles.push({
              name: `${file.name.split('.')[0]}_converted.json`,
              content: '{"converted": true}',
              type: 'TraderPlus v2',
              size: file.size,
            });
          });
        }, 1500);
      },
      error: (error) => {
        this.conversionStatus[converterType] = `Error: ${error.message}`;
      },
    });
  }

  /**
   * Downloads a converted file
   */
  downloadFile(file: ConvertedFile): void {
    const blob = new Blob([file.content], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Downloads all converted files as a zip
   */
  downloadAllFiles(): void {
    // In a real app, this would use a zip library to create a zip file
    alert(
      'Download all files as zip - functionality would be implemented here'
    );
  }

  /**
   * Saves converted files to the current project
   */
  saveToProject(): void {
    // In a real app, this would save the files to the current project
    alert('Save to project - functionality would be implemented here');
  }
}

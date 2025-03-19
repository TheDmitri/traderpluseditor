import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTreeModule } from '@angular/material/tree';

// Services
import {
  FileConverterService,
  TraderPlusConverterService,
  ExpansionConverterService,
  JonesConverterService,
} from '../services';

// Pipe for file size formatting
import { FileSizePipe } from '../../../shared/pipes/filesize.pipe';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { FileNode } from '../models/file-explorer.model';
import { SavedFileSet } from '../../../shared/models/saved-file-set.model';
import { StorageManagerService } from '../../../shared/services/storage-manager.service';
import {
  createStructuredZip,
  downloadBlob,
  FileEntry,
} from '../../../shared/utils/zip.utils';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

// Define a type for converter types to ensure type safety
type ConverterType = 'traderplus' | 'expansion' | 'jones';

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

// Define interface for converted file objects
interface ConvertedFile {
  name: string;
  content: string;
  type: string;
  size: number;
}

@Component({
  selector: 'app-file-converter',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
    MatTreeModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    FileSizePipe,
    LoaderComponent,
  ],
  templateUrl: './file-converter.component.html',
  styleUrls: ['./file-converter.component.scss'],
})
export class FileConverterComponent implements OnInit, OnDestroy {
  // Files arrays for each trader mod
  traderPlusFiles: File[] = [];
  expansionFiles: File[] = [];
  jonesFiles: File[] = [];

  // Conversion status and progress tracking with proper interfaces
  conversionStatus: ConversionStatus = {
    traderPlus: '',
    expansion: '',
    jones: '',
  };

  conversionProgress: ConversionProgress = {
    traderPlus: 0,
    expansion: 0,
    jones: 0,
  };

  // Array to store converted files
  convertedFiles: ConvertedFile[] = [];

  // New property for file structure
  fileStructure: FileNode = {
    name: 'TraderPlusConfig',
    type: 'folder',
    path: 'TraderPlusConfig',
    children: [],
    expanded: true,
  };

  // New properties to track conversion state
  isTraderPlusConverted = false;
  isExpansionConverted = false;
  isJonesConverted = false;
  convertingStatus: { [key in ConverterType]: boolean } = {
    traderplus: false,
    expansion: false,
    jones: false,
  };

  // New properties for saved file sets
  newFileSetName: string = '';
  showSaveDialog: boolean = false;
  private subscriptions: Subscription = new Subscription();

  constructor(
    private fileConverterService: FileConverterService,
    private traderPlusConverterService: TraderPlusConverterService,
    private expansionConverterService: ExpansionConverterService,
    private jonesConverterService: JonesConverterService,
    private storageManagerService: StorageManagerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check if we should load a file set from sessionStorage
    const fileSetId = sessionStorage.getItem('loadFileSetId');
    if (fileSetId) {
      // Clear the sessionStorage item to avoid reloading on page refresh
      sessionStorage.removeItem('loadFileSetId');
      
      // Load the file set
      this.loadSavedFileSetById(fileSetId);
    }
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.unsubscribe();
  }

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
  selectFiles(converterType: ConverterType): void {
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

    // Reset conversion state when new files are selected
    if (converterType === 'traderplus') {
      this.isTraderPlusConverted = false;
    } else if (converterType === 'expansion') {
      this.isExpansionConverted = false;
    } else if (converterType === 'jones') {
      this.isJonesConverted = false;
    }
  }

  /**
   * Processes the selected files
   */
  private handleSelectedFiles(
    fileList: FileList,
    converterType: ConverterType
  ): void {
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
  removeFile(file: File, converterType: ConverterType): void {
    switch (converterType) {
      case 'traderplus':
        this.traderPlusFiles = this.traderPlusFiles.filter((f) => f !== file);
        if (this.traderPlusFiles.length === 0) {
          this.isTraderPlusConverted = false;
        }
        break;
      case 'expansion':
        this.expansionFiles = this.expansionFiles.filter((f) => f !== file);
        if (this.expansionFiles.length === 0) {
          this.isExpansionConverted = false;
        }
        break;
      case 'jones':
        this.jonesFiles = this.jonesFiles.filter((f) => f !== file);
        if (this.jonesFiles.length === 0) {
          this.isJonesConverted = false;
        }
        break;
    }
  }

  /**
   * Starts the conversion process for the selected files
   */
  convert(converterType: ConverterType): void {
    this.convertingStatus[converterType] = true;
    this.conversionStatus[converterType] = 'Converting files...';

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

    this.conversionProgress[converterType] = 25;
    this.conversionStatus[converterType] = 'Reading files...';

    // Use the FileConverterService to handle the conversion
    this.fileConverterService.readFiles(files).subscribe({
      next: (filesContent) => {
        // Update progress
        this.conversionProgress[converterType] = 50;
        this.conversionStatus[converterType] = 'Processing files...';

        // Process the files based on the converter type
        try {
          // Process each file
          filesContent.forEach((fileContent) => {
            service.convertToTraderPlusV2(fileContent.content).subscribe({
              next: (convertedFiles: { [key: string]: string }) => {
                this.conversionProgress[converterType] = 75;
                this.conversionStatus[converterType] =
                  'Finalizing conversion...';

                // Add the converted files to the list
                Object.keys(convertedFiles).forEach((fileName) => {
                  const content = convertedFiles[fileName];
                  this.convertedFiles.push({
                    name: fileName,
                    content: content,
                    type: 'TraderPlus v2',
                    size: new Blob([content]).size,
                  });
                });

                this.conversionProgress[converterType] = 100;
                this.conversionStatus[converterType] = 'Conversion complete!';
                this.convertingStatus[converterType] = false;

                // Set the appropriate conversion flag based on the converter type
                this.updateConversionState(converterType);
              },
              error: (error: any) => {
                this.conversionStatus[
                  converterType
                ] = `Error: ${error.message}`;
                console.error(`Error in ${converterType} conversion:`, error);
                this.convertingStatus[converterType] = false;
              },
            });
          });
        } catch (error: any) {
          this.conversionStatus[converterType] = `Error: ${error.message}`;
          console.error(`Error in ${converterType} conversion:`, error);
          this.convertingStatus[converterType] = false;
        }
      },
      error: (error) => {
        this.conversionStatus[converterType] = `Error: ${error.message}`;
        this.convertingStatus[converterType] = false;
      },
    });
  }

  /**
   * Updates the conversion state based on the converter type
   */
  private updateConversionState(converterType: ConverterType): void {
    switch (converterType) {
      case 'traderplus':
        this.isTraderPlusConverted = true;
        break;
      case 'expansion':
        this.isExpansionConverted = true;
        break;
      case 'jones':
        this.isJonesConverted = true;
        break;
    }

    // Update file structure after conversion
    this.updateFileStructure();
  }

  /**
   * Updates the file structure based on converted files
   */
  private updateFileStructure(): void {
    // Reset the file structure
    this.fileStructure = {
      name: 'TraderPlusConfig',
      type: 'folder',
      path: 'TraderPlusConfig',
      children: [],
      expanded: true,
    };

    // Add each file to the structure
    this.convertedFiles.forEach((file) => {
      this.addFileToStructure(file);
    });
  }

  /**
   * Adds a file to the file structure
   */
  private addFileToStructure(file: ConvertedFile): void {
    // Normalize the path - ensure it doesn't already start with the root folder name
    let normalizedPath = file.name;
    if (normalizedPath.startsWith('TraderPlusConfig/')) {
      normalizedPath = normalizedPath.substring('TraderPlusConfig/'.length);
    }

    const path = normalizedPath.split('/');
    let currentLevel = this.fileStructure;

    // Process each part of the path except the last one (filename)
    for (let i = 0; i < path.length - 1; i++) {
      const part = path[i];
      // Skip empty parts
      if (!part) continue;

      // Check if this folder already exists at the current level
      let found = false;
      if (currentLevel.children) {
        for (const child of currentLevel.children) {
          if (child.name === part && child.type === 'folder') {
            currentLevel = child;
            found = true;
            break;
          }
        }
      }

      // If not found, create a new folder
      if (!found) {
        const newFolder: FileNode = {
          name: part,
          type: 'folder',
          path: `${currentLevel.path}/${part}`,
          children: [],
          expanded: true,
        };

        if (!currentLevel.children) {
          currentLevel.children = [];
        }

        currentLevel.children.push(newFolder);
        currentLevel = newFolder;
      }
    }

    // Add the actual file
    const fileName = path[path.length - 1];
    if (!currentLevel.children) {
      currentLevel.children = [];
    }

    currentLevel.children.push({
      name: fileName,
      type: 'file',
      path: `${currentLevel.path}/${fileName}`,
      content: file.content,
      size: file.size,
    });
  }

  /**
   * Downloads a converted file
   */
  downloadFile(node: FileNode): void {
    if (node.type !== 'file' || !node.content) return;

    const blob = new Blob([node.content], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = node.name;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Creates file entries for a folder and its children
   */
  private createFileEntries(node: FileNode): FileEntry[] {
    const entries: FileEntry[] = [];

    if (node.type === 'file' && node.content) {
      // Create a path relative to the root folder
      const relativePath = node.path.replace(/^TraderPlusConfig\/?/, '');
      entries.push({
        path: relativePath,
        content: node.content,
      });
    } else if (node.type === 'folder' && node.children) {
      // Process each child
      for (const child of node.children) {
        entries.push(...this.createFileEntries(child));
      }
    }

    return entries;
  }

  /**
   * Downloads a folder and all its contents as a zip
   */
  downloadFolder(node: FileNode): void {
    if (node.type !== 'folder') return;

    const entries = this.createFileEntries(node);

    // Show loading indicator if needed
    // this.isDownloading = true;

    // Use the async createStructuredZip function with proper error handling
    createStructuredZip(entries)
      .then((zipBlob) => {
        downloadBlob(zipBlob, `${node.name}.zip`);
      })
      .catch((error) => {
        console.error('Error creating ZIP file:', error);
        alert('There was an error creating the ZIP file. Please try again.');
      });
    // .finally(() => {
    //   this.isDownloading = false;
    // });
  }

  /**
   * Downloads all converted files as a zip
   */
  downloadAllFiles(): void {
    this.downloadFolder(this.fileStructure);
  }

  /**
   * Saves a specific file to the current project
   */
  saveFileToProject(node: FileNode): void {
    if (node.type !== 'file' || !node.content) return;
    // In a real app, this would save the file to the current project
    alert(
      `Save file "${node.name}" to project - functionality would be implemented here`
    );
  }

  /**
   * Saves a folder to the current project
   */
  saveFolderToProject(node: FileNode): void {
    if (node.type !== 'folder') return;
    // In a real app, this would save all files in the folder to the current project
    alert(
      `Save folder "${node.name}" to project - functionality would be implemented here`
    );
  }

  /**
   * Saves all files to the current project
   */
  saveToProject(): void {
    this.saveFolderToProject(this.fileStructure);
  }

  /**
   * Toggles expansion state of a folder
   */
  toggleFolder(node: FileNode): void {
    if (node.type === 'folder') {
      node.expanded = !node.expanded;
    }
  }

  // Helper method to check if conversion is in progress
  isConverting(type: ConverterType): boolean {
    return this.convertingStatus[type] === true;
  }

  // Method to determine icon based on file extension
  getFileIcon(fileName: string): string {
    if (fileName.endsWith('.json')) {
      return 'data_object';
    } else if (fileName.endsWith('.txt')) {
      return 'description';
    } else if (fileName.endsWith('.xml')) {
      return 'code';
    } else {
      return 'insert_drive_file';
    }
  }

  /**
   * Opens dialog to save current converted files to localStorage
   */
  openSaveDialog(): void {
    if (this.convertedFiles.length === 0) {
      alert('No files to save. Please convert files first.');
      return;
    }

    // Set a default name based on the conversion source
    let source = '';
    if (this.isTraderPlusConverted) source = 'TraderPlus';
    if (this.isExpansionConverted) source = 'Expansion';
    if (this.isJonesConverted) source = 'Jones';

    this.newFileSetName = `${source} Conversion ${new Date().toLocaleDateString()}`;
    this.showSaveDialog = true;
  }

  /**
   * Cancels the save dialog
   */
  cancelSaveDialog(): void {
    this.showSaveDialog = false;
    this.newFileSetName = '';
  }

  /**
   * Saves the current converted files to localStorage
   */
  saveConvertedFilesToStorage(): void {
    if (!this.newFileSetName.trim()) {
      alert('Please enter a name for this file set.');
      return;
    }

    // Create a map of files
    const fileMap: { [path: string]: string } = {};
    this.convertedFiles.forEach((file) => {
      fileMap[file.name] = file.content;
    });

    // Determine the source
    let source = 'unknown';
    if (this.isTraderPlusConverted) source = 'traderplus';
    if (this.isExpansionConverted) source = 'expansion';
    if (this.isJonesConverted) source = 'jones';

    // Save to service
    this.storageManagerService
      .saveFileSet(this.newFileSetName, source, fileMap)
      .subscribe(
        (result) => {
          this.showSaveDialog = false;
          this.newFileSetName = '';
          
          // Show confirmation
          const confirmed = confirm('File set saved successfully. Would you like to view your saved file sets?');
          if (confirmed) {
            this.router.navigate(['/storage-manager']);
          }
        },
        (error) => {
          console.error('Error saving file set:', error);
          alert('Error saving file set. Please try again.');
        }
      );
  }

  /**
   * Downloads a saved file set
   */
  downloadSavedFileSet(set: SavedFileSet): void {
    this.storageManagerService
      .downloadFileSet(set.id)
      .then((success) => {
        if (!success) {
          alert('Error downloading file set. Please try again.');
        }
      })
      .catch((error) => {
        console.error('Error downloading file set:', error);
        alert('Error downloading file set. Please try again.');
      });
  }

  /**
   * Deletes a saved file set
   */
  deleteSavedFileSet(set: SavedFileSet, event: Event): void {
    // Prevent event bubbling
    event.stopPropagation();

    if (
      confirm(
        `Are you sure you want to delete "${set.name}"? This cannot be undone.`
      )
    ) {
      this.storageManagerService.deleteFileSet(set.id).subscribe(
        (success) => {
          if (!success) {
            alert('Error deleting file set. Please try again.');
          }
        },
        (error) => {
          console.error('Error deleting file set:', error);
          alert('Error deleting file set. Please try again.');
        }
      );
    }
  }

  /**
   * Loads a saved file set into the current view
   */
  loadSavedFileSet(set: SavedFileSet): void {
    // First clear the current files
    this.convertedFiles = [];

    // Convert the file map to convertedFiles array
    Object.entries(set.files).forEach(([path, content]) => {
      this.convertedFiles.push({
        name: path,
        content: content,
        type: 'TraderPlus v2',
        size: new Blob([content]).size,
      });
    });

    // Update file structure
    this.updateFileStructure();

    // Set appropriate conversion flags based on source
    this.isTraderPlusConverted = set.source === 'traderplus';
    this.isExpansionConverted = set.source === 'expansion';
    this.isJonesConverted = set.source === 'jones';
  }

  /**
   * Loads a saved file set by ID
   */
  private loadSavedFileSetById(id: string): void {
    this.subscriptions.add(
      this.storageManagerService.getSetById(id).subscribe(fileSet => {
        if (fileSet) {
          this.loadSavedFileSet(fileSet);
        } else {
          console.error('File set not found:', id);
        }
      })
    );
  }

  /**
   * Formats a date for display
   */
  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  /**
   * Clear all saved file sets
   */
  clearAllSavedFileSets(): void {
    if (
      confirm(
        'Are you sure you want to delete ALL saved file sets? This cannot be undone.'
      )
    ) {
      this.storageManagerService.clearAllSets().subscribe();
    }
  }
}

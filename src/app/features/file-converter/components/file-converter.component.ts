import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Material imports
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
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
import { FileConverterStorageService } from '../services/file-converter-storage.service';

// Components and utilities
import { FileSizePipe } from '../../../shared/pipes/filesize.pipe';
import { LoaderComponent } from '../../../shared/components/loader/loader.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { FileNode } from '../models/file-explorer.model';
import { SavedFileSet } from '../../../shared/models/saved-file-set.model';
import { StorageManagerService } from '../../../shared/services/storage-manager.service';
import { NotificationService } from '../../../shared/services/notification.service';
import {
  createStructuredZip,
  downloadBlob,
  FileEntry,
} from '../../../shared/utils/zip.utils';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { Router } from '@angular/router';
import { TextInputDialogComponent } from '../../../shared/components/text-input-dialog/text-input-dialog.component';

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

  // Track converted files by type instead of a single array
  convertedFilesByType: { [key in ConverterType]?: ConvertedFile[] } = {
    traderplus: [],
    expansion: [],
    jones: [],
  };

  // Track file structure by type
  fileStructureByType: { [key in ConverterType]?: FileNode } = {};

  // Keep activeTab to track which tab is currently visible
  activeTab: ConverterType = 'traderplus';

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

  // Flag to track if data is being loaded from storage
  private isLoadingFromStorage = false;

  // Add new property to control file explorer visibility
  showFileExplorer = false;

  constructor(
    private fileConverterService: FileConverterService,
    private traderPlusConverterService: TraderPlusConverterService,
    private expansionConverterService: ExpansionConverterService,
    private jonesConverterService: JonesConverterService,
    private storageManagerService: StorageManagerService,
    private fileConverterStorageService: FileConverterStorageService,
    private router: Router,
    private dialog: MatDialog,
    private notificationService: NotificationService
  ) {
    // Initialize empty file structures
    this.fileStructureByType = {
      traderplus: this.createEmptyFileStructure(),
      expansion: this.createEmptyFileStructure(),
      jones: this.createEmptyFileStructure(),
    };
  }

  /**
   * Creates an empty file structure
   */
  private createEmptyFileStructure(): FileNode {
    return {
      name: 'TraderPlusConfig',
      type: 'folder',
      path: 'TraderPlusConfig',
      children: [],
      expanded: true,
    };
  }

  /**
   * Get the converted files for the currently active tab
   */
  get convertedFiles(): ConvertedFile[] {
    return this.convertedFilesByType[this.activeTab] || [];
  }

  /**
   * Get the file structure for the currently active tab
   */
  get fileStructure(): FileNode {
    return (
      this.fileStructureByType[this.activeTab] ||
      this.createEmptyFileStructure()
    );
  }

  async ngOnInit(): Promise<void> {
    // Load data from localStorage
    await this.loadDataFromStorage();

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
   * Handle tab change events
   */
  onTabChange(tabIndex: number): void {
    // Convert tab index to converter type
    if (tabIndex === 0) {
      this.activeTab = 'traderplus';
    } else if (tabIndex === 1) {
      this.activeTab = 'expansion';
    } else if (tabIndex === 2) {
      this.activeTab = 'jones';
    }
  }

  /**
   * Loads data from localStorage
   */
  private async loadDataFromStorage(): Promise<void> {
    this.isLoadingFromStorage = true;

    try {
      // Load converted files by type
      const convertedFilesByType =
        await this.fileConverterStorageService.getConvertedFilesByType();
      if (convertedFilesByType) {
        this.convertedFilesByType = convertedFilesByType;
      }

      // Load file structures by type
      const fileStructureByType =
        await this.fileConverterStorageService.getFileStructureByType();
      if (fileStructureByType) {
        this.fileStructureByType = fileStructureByType;
      } else {
        // Initialize empty structures if none exist
        this.fileStructureByType = {
          traderplus: this.createEmptyFileStructure(),
          expansion: this.createEmptyFileStructure(),
          jones: this.createEmptyFileStructure(),
        };
      }

      // Load conversion state
      const conversionState =
        await this.fileConverterStorageService.getConversionState();
      if (conversionState) {
        this.isTraderPlusConverted = conversionState.isTraderPlusConverted;
        this.isExpansionConverted = conversionState.isExpansionConverted;
        this.isJonesConverted = conversionState.isJonesConverted;
      }

      // Load TraderPlus files
      this.traderPlusFiles =
        await this.fileConverterStorageService.getTraderPlusFiles();

      // Load Expansion files
      this.expansionFiles =
        await this.fileConverterStorageService.getExpansionFiles();

      // Load Jones files
      this.jonesFiles = await this.fileConverterStorageService.getJonesFiles();
    } catch (error) {
      console.error('Error loading data from storage:', error);
      this.notificationService.error(
        'Error loading previously converted files. Starting fresh.'
      );

      // Reset everything if there's an error
      this.resetConverter();
    } finally {
      this.isLoadingFromStorage = false;
    }
  }

  /**
   * Saves current state to localStorage
   */
  private async saveDataToStorage(): Promise<void> {
    // Don't save if we're still loading from storage
    if (this.isLoadingFromStorage) return;

    try {
      // Save files
      await this.fileConverterStorageService.saveTraderPlusFiles(
        this.traderPlusFiles
      );
      await this.fileConverterStorageService.saveExpansionFiles(
        this.expansionFiles
      );
      await this.fileConverterStorageService.saveJonesFiles(this.jonesFiles);

      // Save converted files by type
      await this.fileConverterStorageService.saveConvertedFilesByType(
        this.convertedFilesByType
      );

      // Save file structure by type
      await this.fileConverterStorageService.saveFileStructureByType(
        this.fileStructureByType
      );

      // Save conversion state
      await this.fileConverterStorageService.saveConversionState({
        isTraderPlusConverted: this.isTraderPlusConverted,
        isExpansionConverted: this.isExpansionConverted,
        isJonesConverted: this.isJonesConverted,
      });
    } catch (error) {
      console.error('Error saving data to storage:', error);
      this.notificationService.error(
        'Failed to save converter state to storage'
      );
    }
  }

  /**
   * Resets the file converter and clears localStorage
   */
  resetConverter(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Reset File Converter',
        message:
          'Are you sure you want to reset the file converter? \n\nThis will remove all uploaded and converted files.',
        confirmText: 'Reset',
        cancelText: 'Cancel',
        type: 'warning',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((result) => {
        if (result) {
          // Clear arrays
          this.traderPlusFiles = [];
          this.expansionFiles = [];
          this.jonesFiles = [];

          // Clear converted files by type
          this.convertedFilesByType = {
            traderplus: [],
            expansion: [],
            jones: [],
          };

          // Reset file structures
          this.fileStructureByType = {
            traderplus: this.createEmptyFileStructure(),
            expansion: this.createEmptyFileStructure(),
            jones: this.createEmptyFileStructure(),
          };

          // Reset conversion state
          this.isTraderPlusConverted = false;
          this.isExpansionConverted = false;
          this.isJonesConverted = false;

          // Reset conversion status
          this.conversionStatus = {
            traderPlus: '',
            expansion: '',
            jones: '',
          };

          // Reset conversion progress
          this.conversionProgress = {
            traderPlus: 0,
            expansion: 0,
            jones: 0,
          };

          // Clear localStorage
          this.fileConverterStorageService.resetStorage();

          // Notify user
          this.notificationService.success('File converter has been reset.');
        }
      });
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
  async selectFiles(converterType: ConverterType): Promise<void> {
    // Creates and clicks a hidden file input to trigger file selection
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;

    // Set specific accept filters based on converter type
    if (converterType === 'traderplus') {
      // Only allow TraderPlus v1 specific JSON files
      // The accept attribute will be used as a file filter in the file selection dialog
      fileInput.accept = '.json';
    } else if (converterType === 'jones') {
      // Only allow TraderConfig.txt for Jones converter
      fileInput.accept = '.txt';
    } else {
      // Default fallback, used for expansion or other future converters
      fileInput.accept = '.json,.txt,.xml';
    }

    fileInput.addEventListener('change', async (event: Event) => {
      const files = (event.target as HTMLInputElement).files;
      if (files) {
        await this.handleSelectedFiles(files, converterType);
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

    // Save state to localStorage
    await this.saveDataToStorage();
  }

  /**
   * Processes the selected files
   */
  private async handleSelectedFiles(
    fileList: FileList,
    converterType: ConverterType
  ): Promise<void> {
    const files = Array.from(fileList);
    const filteredFiles: File[] = [];

    // Apply additional validation based on converter type
    switch (converterType) {
      case 'traderplus':
        // Only allow specific TraderPlus v1 files
        const validTraderPlusFiles = [
          'TraderPlusGeneralSettings.json',
          'TraderPlusIDsConfig.json',
          'TraderPlusPriceConfig.json',
        ];

        files.forEach((file) => {
          if (validTraderPlusFiles.includes(file.name)) {
            filteredFiles.push(file);
          } else {
            this.notificationService.warning(
              `Skipped file "${file.name}". Only TraderPlusGeneralSettings.json, TraderPlusIDsConfig.json and TraderPlusPriceConfig.json are allowed.`
            );
          }
        });

        this.traderPlusFiles = [...this.traderPlusFiles, ...filteredFiles];
        break;

      case 'jones':
        // Only allow TraderConfig.txt for Jones converter
        files.forEach((file) => {
          if (file.name === 'TraderConfig.txt') {
            filteredFiles.push(file);
          } else {
            this.notificationService.warning(
              `Skipped file "${file.name}". Only TraderConfig.txt is allowed.`
            );
          }
        });

        this.jonesFiles = [...this.jonesFiles, ...filteredFiles];
        break;

      case 'expansion':
        // No specific filtering for expansion yet as it's not implemented
        this.expansionFiles = [...this.expansionFiles, ...files];
        break;
    }

    // Save state to localStorage
    await this.saveDataToStorage();
  }

  /**
   * Removes a file from the selected files
   */
  async removeFile(file: File, converterType: ConverterType): Promise<void> {
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

    // Save state to localStorage
    await this.saveDataToStorage();
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

                // Clear previous files for this converter type to avoid duplicates
                this.convertedFilesByType[converterType] = [];

                // Add the converted files to the list for this converter type
                Object.keys(convertedFiles).forEach((fileName) => {
                  const content = convertedFiles[fileName];
                  this.convertedFilesByType[converterType]!.push({
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

                // Save to localStorage
                this.saveDataToStorage();
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
  private async updateConversionState(
    converterType: ConverterType
  ): Promise<void> {
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

    // Update file structure for this converter type
    this.updateFileStructure(converterType);

    // Save to localStorage
    await this.saveDataToStorage();
  }

  /**
   * Updates the file structure based on converted files
   */
  private async updateFileStructure(
    converterType: ConverterType
  ): Promise<void> {
    // Reset the file structure for this converter type
    this.fileStructureByType[converterType] = this.createEmptyFileStructure();

    // Add each file to the structure
    const files = this.convertedFilesByType[converterType] || [];
    files.forEach((file) => {
      this.addFileToStructure(file, converterType);
    });

    // When updating file structure, make sure the explorer starts collapsed
    this.showFileExplorer = false;

    // Collapse all folders by default (except root)
    if (this.fileStructureByType[converterType]) {
      this.collapseAllFolders(this.fileStructureByType[converterType]!);

      // Keep the root folder expanded
      this.fileStructureByType[converterType]!.expanded = true;
    }

    // Save to localStorage after updating file structure
    await this.saveDataToStorage();
  }

  /**
   * Helper function to collapse all folders in the file structure
   */
  private collapseAllFolders(node: FileNode): void {
    if (node.type === 'folder' && node.children) {
      // Don't collapse root folder
      if (node.path !== 'TraderPlusConfig') {
        node.expanded = false;
      }

      // Recursively collapse all child folders
      node.children.forEach((child) => {
        if (child.type === 'folder') {
          this.collapseAllFolders(child);
        }
      });
    }
  }

  /**
   * Adds a file to the file structure
   */
  private addFileToStructure(
    file: ConvertedFile,
    converterType: ConverterType
  ): void {
    // Normalize the path - ensure it doesn't already start with the root folder name
    let normalizedPath = file.name;
    if (normalizedPath.startsWith('TraderPlusConfig/')) {
      normalizedPath = normalizedPath.substring('TraderPlusConfig/'.length);
    }

    const path = normalizedPath.split('/');
    let currentLevel =
      this.fileStructureByType[converterType] ||
      this.createEmptyFileStructure();

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
    const currentFiles = this.convertedFiles;

    if (currentFiles.length === 0) {
      this.notificationService.error(
        'No files to save. Please convert files first.'
      );
      return;
    }

    // Set a default name based on the conversion source
    let source = '';
    if (this.activeTab === 'traderplus') source = 'TraderPlus';
    if (this.activeTab === 'expansion') source = 'Expansion';
    if (this.activeTab === 'jones') source = 'Jones';

    // First check if we're near the storage limit
    this.storageManagerService
      .isStorageNearLimit()
      .pipe(take(1))
      .subscribe((isNearLimit) => {
        if (isNearLimit) {
          this.notificationService.warning(
            'Storage is nearly full (>90%). Please delete some saved file sets before saving new ones.'
          );
          return;
        }

        // If not near limit, proceed with showing the dialog
        const dialogRef = this.dialog.open(TextInputDialogComponent, {
          width: '350px',
          data: {
            title: 'Save Converted Files',
            label: 'File Set Name',
            placeholder: 'Enter a name for this file set',
            initialValue: `${source} Conversion ${new Date().toLocaleDateString()}`,
            confirmText: 'Save',
          },
        });

        dialogRef
          .afterClosed()
          .pipe(take(1))
          .subscribe((result) => {
            if (result) {
              // Create a map of files
              const fileMap: { [path: string]: string } = {};
              currentFiles.forEach((file) => {
                fileMap[file.name] = file.content;
              });

              // Determine the source type for storage
              const sourceType = this.activeTab;

              // Save the file set
              this.storageManagerService
                .saveFileSet(result, sourceType, fileMap)
                .pipe(take(1))
                .subscribe({
                  next: (fileSet) => {
                    this.notificationService.success(
                      `File set '${fileSet.name}' saved successfully`
                    );

                    const confirmDialogRef = this.dialog.open(
                      ConfirmDialogComponent,
                      {
                        data: {
                          title: 'File Set Saved',
                          message:
                            'Would you like to view your saved file sets?',
                          confirmText: 'View File Sets',
                          cancelText: 'Stay Here',
                          type: 'info',
                        },
                      }
                    );

                    confirmDialogRef
                      .afterClosed()
                      .pipe(take(1))
                      .subscribe((navigateToSets) => {
                        if (navigateToSets) {
                          this.router.navigate(['/storage-manager']);
                        }
                      });
                  },
                  error: (error) => {
                    console.error('Error saving file set:', error);
                    this.notificationService.error(
                      `Error saving file set: ${error.message}`
                    );
                  },
                });
            }
          });
      });
  }

  /**
   * Cancels the save dialog - can be removed as we no longer need it
   */
  cancelSaveDialog(): void {
    this.showSaveDialog = false;
    this.newFileSetName = '';
  }

  /**
   * Saves the current converted files to localStorage - can be removed as we've merged its functionality
   */
  saveConvertedFilesToStorage(): void {
    // This method's functionality has been merged into openSaveDialog()
    // It can be removed or deprecated
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

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete File Set',
        message: `Are you sure you want to delete "${set.name}"?\n\nThis action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((result) => {
        if (result) {
          this.storageManagerService
            .deleteFileSet(set.id)
            .pipe(take(1))
            .subscribe(
              (success) => {
                if (!success) {
                  this.notificationService.error(
                    'Error deleting file set. Please try again.'
                  );
                } else {
                  this.notificationService.success(
                    'File set deleted successfully.'
                  );
                }
              },
              (error) => {
                console.error('Error deleting file set:', error);
                this.notificationService.error(
                  'Error deleting file set. Please try again.'
                );
              }
            );
        }
      });
  }

  /**
   * Loads a saved file set into the current view
   */
  loadSavedFileSet(set: SavedFileSet): void {
    // Determine the appropriate converter type
    const converterType = set.source as ConverterType;
    this.activeTab = converterType;

    // Clear converted files for this converter type
    this.convertedFilesByType[converterType] = [];

    // Convert the file map to convertedFiles array
    Object.entries(set.files).forEach(([path, content]) => {
      this.convertedFilesByType[converterType]!.push({
        name: path,
        content: content,
        type: 'TraderPlus v2',
        size: new Blob([content]).size,
      });
    });

    // Update file structure for this converter type
    this.updateFileStructure(converterType);

    // Set appropriate conversion flags based on source
    this.isTraderPlusConverted = converterType === 'traderplus';
    this.isExpansionConverted = converterType === 'expansion';
    this.isJonesConverted = converterType === 'jones';

    // Save to localStorage
    this.saveDataToStorage();
  }

  /**
   * Loads a saved file set by ID
   */
  private loadSavedFileSetById(id: string): void {
    this.subscriptions.add(
      this.storageManagerService.getSetById(id).subscribe((fileSet) => {
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
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete All File Sets',
        message:
          'Are you sure you want to delete ALL saved file sets?\n\nThis action cannot be undone.',
        confirmText: 'Delete All',
        cancelText: 'Cancel',
        type: 'danger',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((result) => {
        if (result) {
          this.storageManagerService
            .clearAllSets()
            .pipe(take(1))
            .subscribe(() => {
              this.notificationService.success(
                'All file sets deleted successfully.'
              );
            });
        }
      });
  }

  /**
   * Toggles the visibility of the file explorer
   */
  toggleFileExplorer(): void {
    this.showFileExplorer = !this.showFileExplorer;
  }

  /**
   * Get a summary of the converted files (categories, products, etc.)
   */
  getFilesSummary(): {
    totalFiles: number;
    categories: number;
    products: number;
    misc: number;
  } {
    const files = this.convertedFiles;
    let categories = 0;
    let products = 0;
    let misc = 0;

    files.forEach((file) => {
      if (file.name.includes('/Categories/')) {
        categories++;
      } else if (file.name.includes('/Products/')) {
        products++;
      } else {
        misc++;
      }
    });

    return {
      totalFiles: files.length,
      categories,
      products,
      misc,
    };
  }

  /**
   * Clears the converted files for the specified converter type
   */
  clearConvertedFiles(converterType: ConverterType): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Clear Converted Files',
        message: `Are you sure you want to clear all converted files for this ${this.getConverterDisplayName(
          converterType
        )} conversion?`,
        confirmText: 'Clear',
        cancelText: 'Cancel',
        type: 'warning',
      },
    });

    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe((result) => {
        if (result) {
          // Clear converted files
          this.convertedFilesByType[converterType] = [];

          // Reset file structure
          this.fileStructureByType[converterType] =
            this.createEmptyFileStructure();

          // Reset conversion state flag
          switch (converterType) {
            case 'traderplus':
              this.isTraderPlusConverted = false;
              break;
            case 'expansion':
              this.isExpansionConverted = false;
              break;
            case 'jones':
              this.isJonesConverted = false;
              break;
          }

          // Save updated state to storage
          this.saveDataToStorage();

          // Notify user
          this.notificationService.success(
            `${this.getConverterDisplayName(
              converterType
            )} converted files cleared successfully.`
          );
        }
      });
  }

  /**
   * Helper method to get display name for converter type
   * Now public so it can be used in the template
   */
  getConverterDisplayName(converterType: ConverterType): string {
    switch (converterType) {
      case 'traderplus':
        return 'TraderPlus';
      case 'expansion':
        return 'Expansion';
      case 'jones':
        return 'Jones';
      default:
        return converterType;
    }
  }

  /**
   * Checks if the active tab has files that can be converted
   */
  hasFilesToConvert(): boolean {
    switch (this.activeTab) {
      case 'traderplus':
        return this.traderPlusFiles.length > 0;
      case 'expansion':
        return this.expansionFiles.length > 0;
      case 'jones':
        return this.jonesFiles.length > 0;
      default:
        return false;
    }
  }

  /**
   * Checks if the active tab's files are already converted
   */
  isActiveTabConverted(): boolean {
    switch (this.activeTab) {
      case 'traderplus':
        return this.isTraderPlusConverted;
      case 'expansion':
        return this.isExpansionConverted;
      case 'jones':
        return this.isJonesConverted;
      default:
        return false;
    }
  }
}

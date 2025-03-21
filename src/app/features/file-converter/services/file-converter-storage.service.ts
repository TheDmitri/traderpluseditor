import { Injectable } from '@angular/core';
import { FileNode } from '../models/file-explorer.model';

// Storage keys for localStorage
enum FileConverterStorageKey {
  TRADER_PLUS_FILES = 'file_converter_trader_plus_files',
  EXPANSION_FILES = 'file_converter_expansion_files',
  JONES_FILES = 'file_converter_jones_files',
  CONVERTED_FILES = 'file_converter_converted_files',
  CONVERTED_FILES_BY_TYPE = 'file_converter_converted_files_by_type',
  FILE_STRUCTURE = 'file_converter_file_structure',
  FILE_STRUCTURE_BY_TYPE = 'file_converter_file_structure_by_type',
  CONVERSION_STATE = 'file_converter_conversion_state'
}

// Type for converter types
export type ConverterType = 'traderplus' | 'expansion' | 'jones';

// Interface for serialized File object
interface SerializedFile {
  name: string;
  type: string;
  size: number;
  lastModified: number;
  content: string; // Base64 encoded content
}

// Interface for converted file objects
export interface ConvertedFile {
  name: string;
  content: string;
  type: string;
  size: number;
}

// Interface for conversion state
export interface ConversionState {
  isTraderPlusConverted: boolean;
  isExpansionConverted: boolean;
  isJonesConverted: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FileConverterStorageService {

  constructor() { }

  /**
   * Save TraderPlus files to localStorage
   */
  saveTraderPlusFiles(files: File[]): void {
    this.saveFiles(FileConverterStorageKey.TRADER_PLUS_FILES, files);
  }

  /**
   * Get TraderPlus files from localStorage
   */
  getTraderPlusFiles(): Promise<File[]> {
    return this.getFiles(FileConverterStorageKey.TRADER_PLUS_FILES);
  }

  /**
   * Save Expansion files to localStorage
   */
  saveExpansionFiles(files: File[]): void {
    this.saveFiles(FileConverterStorageKey.EXPANSION_FILES, files);
  }

  /**
   * Get Expansion files from localStorage
   */
  getExpansionFiles(): Promise<File[]> {
    return this.getFiles(FileConverterStorageKey.EXPANSION_FILES);
  }

  /**
   * Save Jones files to localStorage
   */
  saveJonesFiles(files: File[]): void {
    this.saveFiles(FileConverterStorageKey.JONES_FILES, files);
  }

  /**
   * Get Jones files from localStorage
   */
  getJonesFiles(): Promise<File[]> {
    return this.getFiles(FileConverterStorageKey.JONES_FILES);
  }

  /**
   * Save converted files by type to localStorage
   */
  saveConvertedFilesByType(filesByType: { [key in ConverterType]?: ConvertedFile[] }): void {
    localStorage.setItem(FileConverterStorageKey.CONVERTED_FILES_BY_TYPE, JSON.stringify(filesByType));
  }

  /**
   * Get converted files by type from localStorage
   */
  getConvertedFilesByType(): { [key in ConverterType]?: ConvertedFile[] } {
    const data = localStorage.getItem(FileConverterStorageKey.CONVERTED_FILES_BY_TYPE);
    if (!data) return {
      traderplus: [],
      expansion: [],
      jones: []
    };
    return JSON.parse(data);
  }

  /**
   * Save file structure by type to localStorage
   */
  saveFileStructureByType(fileStructureByType: { [key in ConverterType]?: FileNode }): void {
    localStorage.setItem(FileConverterStorageKey.FILE_STRUCTURE_BY_TYPE, JSON.stringify(fileStructureByType));
  }

  /**
   * Get file structure by type from localStorage
   */
  getFileStructureByType(): { [key in ConverterType]?: FileNode } | null {
    const data = localStorage.getItem(FileConverterStorageKey.FILE_STRUCTURE_BY_TYPE);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Save converted files to localStorage (legacy method)
   */
  saveConvertedFiles(files: ConvertedFile[]): void {
    // For backward compatibility, also save to the old storage key
    localStorage.setItem(FileConverterStorageKey.CONVERTED_FILES, JSON.stringify(files));
    
    // Also save to the new format
    const filesByType = this.getConvertedFilesByType();
    filesByType.traderplus = files;
    this.saveConvertedFilesByType(filesByType);
  }

  /**
   * Get converted files from localStorage (legacy method)
   */
  getConvertedFiles(): ConvertedFile[] {
    // Check if we have the new format first
    const newData = localStorage.getItem(FileConverterStorageKey.CONVERTED_FILES_BY_TYPE);
    if (newData) {
      const filesByType = JSON.parse(newData) as { [key in ConverterType]?: ConvertedFile[] };
      return filesByType.traderplus || [];
    }
    
    // Fall back to old format if new doesn't exist
    const oldData = localStorage.getItem(FileConverterStorageKey.CONVERTED_FILES);
    return oldData ? JSON.parse(oldData) : [];
  }

  /**
   * Save file structure to localStorage (legacy method)
   */
  saveFileStructure(fileStructure: FileNode): void {
    // For backward compatibility, also save to the old storage key
    localStorage.setItem(FileConverterStorageKey.FILE_STRUCTURE, JSON.stringify(fileStructure));
    
    // Also save to the new format
    const fileStructureByType = this.getFileStructureByType() || {
      traderplus: fileStructure,
      expansion: undefined,
      jones: undefined
    };
    fileStructureByType.traderplus = fileStructure;
    this.saveFileStructureByType(fileStructureByType);
  }

  /**
   * Get file structure from localStorage (legacy method)
   */
  getFileStructure(): FileNode | null {
    // Check if we have the new format first
    const newData = localStorage.getItem(FileConverterStorageKey.FILE_STRUCTURE_BY_TYPE);
    if (newData) {
      const fileStructureByType = JSON.parse(newData) as { [key in ConverterType]?: FileNode };
      return fileStructureByType.traderplus || null;
    }
    
    // Fall back to old format if new doesn't exist
    const oldData = localStorage.getItem(FileConverterStorageKey.FILE_STRUCTURE);
    return oldData ? JSON.parse(oldData) : null;
  }

  /**
   * Save conversion state to localStorage
   */
  saveConversionState(state: ConversionState): void {
    localStorage.setItem(FileConverterStorageKey.CONVERSION_STATE, JSON.stringify(state));
  }

  /**
   * Get conversion state from localStorage
   */
  getConversionState(): ConversionState | null {
    const data = localStorage.getItem(FileConverterStorageKey.CONVERSION_STATE);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Reset all file converter storage
   */
  resetStorage(): void {
    localStorage.removeItem(FileConverterStorageKey.TRADER_PLUS_FILES);
    localStorage.removeItem(FileConverterStorageKey.EXPANSION_FILES);
    localStorage.removeItem(FileConverterStorageKey.JONES_FILES);
    localStorage.removeItem(FileConverterStorageKey.CONVERTED_FILES);
    localStorage.removeItem(FileConverterStorageKey.CONVERTED_FILES_BY_TYPE);
    localStorage.removeItem(FileConverterStorageKey.FILE_STRUCTURE);
    localStorage.removeItem(FileConverterStorageKey.FILE_STRUCTURE_BY_TYPE);
    localStorage.removeItem(FileConverterStorageKey.CONVERSION_STATE);
  }

  /**
   * Helper method to save files to localStorage with serialization
   */
  private async saveFiles(key: FileConverterStorageKey, files: File[]): Promise<void> {
    const serializedFiles: SerializedFile[] = [];
    
    for (const file of files) {
      // Read file content as base64
      const content = await this.readFileAsBase64(file);
      
      serializedFiles.push({
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        content: content
      });
    }
    
    localStorage.setItem(key, JSON.stringify(serializedFiles));
  }

  /**
   * Helper method to get files from localStorage with deserialization
   */
  private async getFiles(key: FileConverterStorageKey): Promise<File[]> {
    const data = localStorage.getItem(key);
    if (!data) return [];
    
    const serializedFiles: SerializedFile[] = JSON.parse(data);
    const files: File[] = [];
    
    for (const serializedFile of serializedFiles) {
      // Convert base64 to blob
      const blob = await this.base64ToBlob(serializedFile.content, serializedFile.type || 'application/octet-stream');
      
      // Create File object from blob
      const file = new File([blob], serializedFile.name, {
        type: serializedFile.type || 'application/octet-stream',
        lastModified: serializedFile.lastModified
      });
      
      files.push(file);
    }
    
    return files;
  }

  /**
   * Helper method to read file as base64
   */
  private readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        // Get the result as base64 string
        const base64String = reader.result as string;
        // If the result is a Data URL, extract the base64 part
        const base64Content = base64String.split(',')[1];
        resolve(base64Content);
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Helper method to convert base64 to blob
   */
  private base64ToBlob(base64: string, type: string): Promise<Blob> {
    return new Promise((resolve) => {
      const byteCharacters = atob(base64);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      const blob = new Blob(byteArrays, { type });
      resolve(blob);
    });
  }
}

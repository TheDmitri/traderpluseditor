import { Injectable } from '@angular/core';
import { FileNode } from '../models/file-explorer.model';
import { compressObject, decompressObject } from '../../../shared/utils/zip.utils';

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
   * Save TraderPlus files to localStorage with compression
   */
  async saveTraderPlusFiles(files: File[]): Promise<void> {
    await this.saveFiles(FileConverterStorageKey.TRADER_PLUS_FILES, files);
  }

  /**
   * Get TraderPlus files from localStorage with decompression
   */
  getTraderPlusFiles(): Promise<File[]> {
    return this.getFiles(FileConverterStorageKey.TRADER_PLUS_FILES);
  }

  /**
   * Save Expansion files to localStorage with compression
   */
  async saveExpansionFiles(files: File[]): Promise<void> {
    await this.saveFiles(FileConverterStorageKey.EXPANSION_FILES, files);
  }

  /**
   * Get Expansion files from localStorage with decompression
   */
  getExpansionFiles(): Promise<File[]> {
    return this.getFiles(FileConverterStorageKey.EXPANSION_FILES);
  }

  /**
   * Save Jones files to localStorage with compression
   */
  async saveJonesFiles(files: File[]): Promise<void> {
    await this.saveFiles(FileConverterStorageKey.JONES_FILES, files);
  }

  /**
   * Get Jones files from localStorage with decompression
   */
  getJonesFiles(): Promise<File[]> {
    return this.getFiles(FileConverterStorageKey.JONES_FILES);
  }

  /**
   * Save converted files by type to localStorage with compression
   */
  async saveConvertedFilesByType(filesByType: { [key in ConverterType]?: ConvertedFile[] }): Promise<void> {
    const compressed = await compressObject(filesByType);
    localStorage.setItem(FileConverterStorageKey.CONVERTED_FILES_BY_TYPE, compressed);
  }

  /**
   * Get converted files by type from localStorage with decompression
   */
  async getConvertedFilesByType(): Promise<{ [key in ConverterType]?: ConvertedFile[] }> {
    const data = localStorage.getItem(FileConverterStorageKey.CONVERTED_FILES_BY_TYPE);
    if (!data) return {
      traderplus: [],
      expansion: [],
      jones: []
    };
    
    try {
      return await decompressObject<{ [key in ConverterType]?: ConvertedFile[] }>(data);
    } catch (error) {
      console.error('Error decompressing converted files:', error);
      // If decompression fails, return default empty structure
      return {
        traderplus: [],
        expansion: [],
        jones: []
      };
    }
  }

  /**
   * Save file structure by type to localStorage with compression
   */
  async saveFileStructureByType(fileStructureByType: { [key in ConverterType]?: FileNode }): Promise<void> {
    const compressed = await compressObject(fileStructureByType);
    localStorage.setItem(FileConverterStorageKey.FILE_STRUCTURE_BY_TYPE, compressed);
  }

  /**
   * Get file structure by type from localStorage with decompression
   */
  async getFileStructureByType(): Promise<{ [key in ConverterType]?: FileNode } | null> {
    const data = localStorage.getItem(FileConverterStorageKey.FILE_STRUCTURE_BY_TYPE);
    if (!data) return null;
    
    try {
      return await decompressObject<{ [key in ConverterType]?: FileNode }>(data);
    } catch (error) {
      console.error('Error decompressing file structure:', error);
      return null;
    }
  }

  /**
   * Save converted files to localStorage (legacy method) with compression
   */
  async saveConvertedFiles(files: ConvertedFile[]): Promise<void> {
    // For backward compatibility, also save to the old storage key
    const compressed = await compressObject(files);
    localStorage.setItem(FileConverterStorageKey.CONVERTED_FILES, compressed);
    
    // Also save to the new format
    const filesByType = await this.getConvertedFilesByType();
    filesByType.traderplus = files;
    await this.saveConvertedFilesByType(filesByType);
  }

  /**
   * Get converted files from localStorage (legacy method) with decompression
   */
  async getConvertedFiles(): Promise<ConvertedFile[]> {
    // Check if we have the new format first
    const newData = localStorage.getItem(FileConverterStorageKey.CONVERTED_FILES_BY_TYPE);
    if (newData) {
      try {
        const filesByType = await decompressObject<{ [key in ConverterType]?: ConvertedFile[] }>(newData);
        return filesByType.traderplus || [];
      } catch (error) {
        console.error('Error decompressing new format converted files:', error);
      }
    }
    
    // Fall back to old format if new doesn't exist or decompression failed
    const oldData = localStorage.getItem(FileConverterStorageKey.CONVERTED_FILES);
    if (!oldData) return [];
    
    try {
      return await decompressObject<ConvertedFile[]>(oldData);
    } catch (error) {
      console.error('Error decompressing old format converted files:', error);
      // If both decompression attempts fail, try parsing without decompression
      // (for backward compatibility with uncompressed data)
      try {
        return JSON.parse(oldData);
      } catch (jsonError) {
        console.error('Error parsing uncompressed data:', jsonError);
        return [];
      }
    }
  }

  /**
   * Save file structure to localStorage (legacy method) with compression
   */
  async saveFileStructure(fileStructure: FileNode): Promise<void> {
    // For backward compatibility, also save to the old storage key
    const compressed = await compressObject(fileStructure);
    localStorage.setItem(FileConverterStorageKey.FILE_STRUCTURE, compressed);
    
    // Also save to the new format
    const fileStructureByType = await this.getFileStructureByType() || {
      traderplus: fileStructure,
      expansion: undefined,
      jones: undefined
    };
    fileStructureByType.traderplus = fileStructure;
    await this.saveFileStructureByType(fileStructureByType);
  }

  /**
   * Get file structure from localStorage (legacy method) with decompression
   */
  async getFileStructure(): Promise<FileNode | null> {
    // Check if we have the new format first
    const newData = localStorage.getItem(FileConverterStorageKey.FILE_STRUCTURE_BY_TYPE);
    if (newData) {
      try {
        const fileStructureByType = await decompressObject<{ [key in ConverterType]?: FileNode }>(newData);
        return fileStructureByType.traderplus || null;
      } catch (error) {
        console.error('Error decompressing new format file structure:', error);
      }
    }
    
    // Fall back to old format if new doesn't exist or decompression failed
    const oldData = localStorage.getItem(FileConverterStorageKey.FILE_STRUCTURE);
    if (!oldData) return null;
    
    try {
      return await decompressObject<FileNode>(oldData);
    } catch (error) {
      console.error('Error decompressing old format file structure:', error);
      // Try parsing as uncompressed JSON for backward compatibility
      try {
        return JSON.parse(oldData);
      } catch (jsonError) {
        console.error('Error parsing uncompressed data:', jsonError);
        return null;
      }
    }
  }

  /**
   * Save conversion state to localStorage with compression
   */
  async saveConversionState(state: ConversionState): Promise<void> {
    const compressed = await compressObject(state);
    localStorage.setItem(FileConverterStorageKey.CONVERSION_STATE, compressed);
  }

  /**
   * Get conversion state from localStorage with decompression
   */
  async getConversionState(): Promise<ConversionState | null> {
    const data = localStorage.getItem(FileConverterStorageKey.CONVERSION_STATE);
    if (!data) return null;
    
    try {
      return await decompressObject<ConversionState>(data);
    } catch (error) {
      console.error('Error decompressing conversion state:', error);
      // Try parsing as uncompressed JSON for backward compatibility
      try {
        return JSON.parse(data);
      } catch (jsonError) {
        console.error('Error parsing uncompressed data:', jsonError);
        return null;
      }
    }
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
   * Helper method to save files to localStorage with serialization and compression
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
    
    // Compress serialized files before storing
    const compressed = await compressObject(serializedFiles);
    localStorage.setItem(key, compressed);
  }

  /**
   * Helper method to get files from localStorage with deserialization and decompression
   */
  private async getFiles(key: FileConverterStorageKey): Promise<File[]> {
    const data = localStorage.getItem(key);
    if (!data) return [];
    
    let serializedFiles: SerializedFile[];
    
    try {
      // Try to decompress the data
      serializedFiles = await decompressObject<SerializedFile[]>(data);
    } catch (error) {
      console.error(`Error decompressing data for key ${key}:`, error);
      // Try parsing as uncompressed JSON for backward compatibility
      try {
        serializedFiles = JSON.parse(data);
      } catch (jsonError) {
        console.error('Error parsing uncompressed data:', jsonError);
        return [];
      }
    }
    
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

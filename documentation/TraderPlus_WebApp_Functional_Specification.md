# TraderPlus Configuration Web Application - Functional Specification

## 1. Introduction

### 1.1 Purpose
This document outlines the functional requirements for developing an Angular 18 web application that allows users to upload, configure, and manage JSON configuration files for the TraderPlus mod in DayZ.

### 1.2 Scope
The application will provide a user-friendly interface for managing TraderPlus configurations, including categories, products, currencies, and general settings. The application will use local storage to save and manage configuration files.

### 1.3 Target Audience
- DayZ server administrators
- TraderPlus mod users
- Game configuration managers

## 2. System Overview

### 2.1 Technology Stack
- **Frontend Framework**: Angular 18
- **UI Components**: Angular Material (dark theme)
- **Data Storage**: Browser LocalStorage
- **File Handling**: File API for uploading/downloading JSON files

### 2.2 Key Features
1. Upload and parse TraderPlus JSON configuration files
2. Edit and manage trader categories
3. Configure products with pricing, stock, and attachments
4. Set up currency types and exchange rates
5. Configure general trader settings
6. Export configurations as JSON files compatible with TraderPlus

## 3. Functional Requirements

### 3.1 User Interface

#### 3.1.1 General UI Requirements
- Dark theme using Angular Material components
- Responsive design for desktop use
- Sidebar navigation for different configuration sections
- Consistent styling throughout the application
- Loading indicators for asynchronous operations
- Error messages for invalid operations

#### 3.1.2 Dashboard
- Overview of loaded configurations
- Quick access to main configuration sections
- Statistics on number of categories, products, and traders

### 3.2 Configuration Management

#### 3.2.1 File Operations
- **Upload Configuration**: Allow users to upload existing TraderPlus JSON files
- **Download Configuration**: Export configurations as JSON files
- **Reset Configuration**: Reset to default or clear current configurations
- **Auto-save**: Automatically save changes to LocalStorage

#### 3.2.2 Category Management
Based on `TraderPlusCategory.c`:
- Create, edit, and delete categories
- Set category properties:
  - Category name
  - Category icon
  - Visibility settings
  - Required licenses
- Manage products within categories
- Sort and filter categories

#### 3.2.3 Product Management
Based on `TraderPlusProduct.c`:
- Create, edit, and delete products
- Configure product properties:
  - Class name
  - Buy/sell prices
  - Coefficient
  - Maximum stock
  - Trade quantity
  - Stock settings (destock coefficient and behavior at restart)
- Manage product attachments and variants
- Batch operations for multiple products

#### 3.2.4 Currency Configuration
Based on `TraderPlusCurrencySettings.c` and `TraderPlusCurrencyType.c`:
- Create and manage currency types (EUR, USD, etc.)
- Configure currency denominations and values
- Set up exchange rates between currencies

#### 3.2.5 General Settings
Based on `TraderPlusGeneralSettings.c`:
- Configure trader NPCs and their locations
- Set up licenses and their descriptions
- Configure accepted item states
- Manage trader objects and their positions

### 3.3 Data Validation

#### 3.3.1 Input Validation
- Validate all user inputs for correct format and values
- Prevent duplicate entries (categories, products, etc.)
- Ensure required fields are completed

#### 3.3.2 Configuration Integrity
- Verify relationships between entities (products in categories, etc.)
- Check for orphaned items or invalid references
- Validate JSON structure before export

### 3.4 LocalStorage Management

#### 3.4.1 Storage Structure
- Organize data in LocalStorage with clear namespacing
- Store configurations in separate keys for categories, products, currencies, etc.
- Implement versioning for configuration data

#### 3.4.2 Storage Operations
- Save configurations to LocalStorage automatically
- Load configurations from LocalStorage on startup
- Clear specific configurations or all data
- Handle storage limits and provide warnings

## 4. User Workflows

### 4.1 Initial Setup
1. User opens the application
2. Application checks for existing configurations in LocalStorage
3. If found, loads the configurations
4. If not found, presents options to:
   - Start with default configurations
   - Upload existing configuration files
   - Start from scratch

### 4.2 Category Configuration
1. User navigates to the Categories section
2. Views list of existing categories
3. Can add a new category or edit existing ones
4. For each category, can set:
   - Name, icon, and visibility
   - Required licenses
   - Associated products
5. Changes are automatically saved to LocalStorage

### 4.3 Product Configuration
1. User navigates to the Products section
2. Views list of existing products, filterable by category
3. Can add new products or edit existing ones
4. For each product, can set:
   - Class name and display properties
   - Pricing (buy/sell)
   - Stock settings
   - Attachments and variants
5. Changes are automatically saved to LocalStorage

### 4.4 Currency Configuration
1. User navigates to the Currencies section
2. Views list of existing currency types
3. Can add new currency types or edit existing ones
4. For each currency type, can set:
   - Currency name
   - Denominations and their values
5. Changes are automatically saved to LocalStorage

### 4.5 Export Configuration
1. User navigates to the Export section
2. Selects which configurations to export
3. Application validates the configurations
4. User can download the configurations as JSON files
5. Files are formatted to be compatible with TraderPlus mod

## 5. Component Specifications

### 5.1 Navigation Component
- Sidebar with links to different configuration sections
- Collapsible for more screen space
- Visual indicators for the current section

### 5.2 Category Editor Component
- Form for editing category properties
- Table/list view of all categories
- Drag-and-drop for reordering categories
- Search and filter functionality

### 5.3 Product Editor Component
- Form for editing product properties
- Table view with sorting and filtering
- Batch editing capabilities
- Attachment and variant management

### 5.4 Currency Editor Component
- Form for editing currency types and denominations
- Visual representation of currency hierarchy
- Exchange rate configuration

### 5.5 File Management Component
- File upload interface with drag-and-drop support
- File export options with format selection
- Configuration backup and restore functionality

### 5.6 Settings Component
- General application settings
- Default values configuration
- UI preferences (compact view, etc.)

## 6. Data Models

### 6.1 Category Model
Based on `TraderPlusCategory.c`:
```typescript
interface Category {
  categoryId: string;  // Format: "cat_[lowercase_name]_[counter]" (e.g., "cat_weapons_001")
  categoryName: string;
  icon: string;
  isVisible: boolean;
  licensesRequired: string[];
  productIds: string[];
  categoryType?: number;
}
```

### 6.2 Product Model
Based on `TraderPlusProduct.c`:
```typescript
interface Product {
  productId: string;  // Format: "prod_[lowercase_name]_[counter]" (e.g., "prod_m4a1_001")
  className: string;
  coefficient: number;
  maxStock: number;
  tradeQuantity: number;
  buyPrice: number;
  sellPrice: number;
  stockSettings: number; // Combined destock coefficient and behavior
  attachments: string[];
  variants: string[];
}
```

### 6.3 Currency Model
Based on `TraderPlusCurrency.c` and `TraderPlusCurrencyType.c`:
```typescript
interface Currency {
  className: string;
  value: number;
}

interface CurrencyType {
  currencyName: string;
  currencies: Currency[];
}

interface CurrencySettings {
  version: string;
  currencyTypes: CurrencyType[];
}
```

### 6.4 General Settings Model
Based on `TraderPlusGeneralSettings.c`:
```typescript
interface License {
  name: string;
  description: string;
}

interface TraderNpc {
  npcId: number;
  // Other NPC properties
}

interface TraderObject {
  objectName: string;
  position: Vector;
  orientation: Vector;
}

interface GeneralSettings {
  version: string;
  serverID: string;
  licenses: License[];
  acceptedStates: {
    worn: boolean;
    damaged: boolean;
    badly_damaged: boolean;
  };
  traders: TraderNpc[];
  traderObjects: TraderObject[];
}
```

### 6.5 Stock Settings Bit Structure
The `stockSettings` property in the Product model combines two separate values into a single integer using bitwise operations:

1. **Destock Coefficient** (0-100%): Stored in the lower 7 bits (0-127)
   - Represents the percentage by which stock decreases over time
   - Range: 0 (no destock) to 100 (complete destock)
   - Calculated as: `destockInt = Math.Round(deStockCoefficient * 100)`

2. **Behavior at Restart** (0-3): Stored in bits 7-8 (values 0-3)
   - Controls how stock is handled when the server restarts
   - Possible values:
     - 0: No change to stock on restart
     - 1: Reset to maximum stock on restart
     - 2: Set to random value between 0 and maximum stock
     - 3: Reserved for future use

3. **Combined Storage Format**:
   ```
   stockSettings = (destockInt & 0x7F) | ((behaviorAtRestart & 0x03) << 7)
   ```

4. **Extracting Values**:
   - Get Destock Coefficient: `(stockSettings & 0x7F) * 0.01`
   - Get Behavior at Restart: `(stockSettings >> 7) & 0x03`
   - Check if Destock is Enabled: `(stockSettings & 0x7F) > 0`

The web application must provide a user-friendly interface to configure these values separately while storing them in the combined format for compatibility with the TraderPlus mod.

## 7. UUID Format Specifications

### 7.1 Category ID Format
Categories use a specific UUID format:
- Format: `cat_[lowercase_name]_[counter]`
- Example: `cat_weapons_001`

The generation process:
1. Convert category name to lowercase
2. Replace spaces, hyphens, and periods with underscores
3. Generate a counter (padded to 3 digits)
4. Combine with prefix "cat_" and counter suffix
5. Validate uniqueness in the system

### 7.2 Product ID Format
Products use a similar UUID format:
- Format: `prod_[lowercase_name]_[counter]`
- Example: `prod_m4a1_001`

The generation process:
1. Convert class name to lowercase
2. Replace spaces, hyphens, and periods with underscores
3. Generate a counter (padded to 3 digits)
4. Combine with prefix "prod_" and counter suffix
5. Validate uniqueness in the system

### 7.3 UUID Management in Web App
The web application must:
- Maintain the same UUID format when creating new categories and products
- Preserve existing UUIDs when importing configurations
- Ensure UUID uniqueness across the system
- Handle UUID conflicts during import/merge operations

## 8. Technical Considerations

### 8.1 LocalStorage Limitations
- LocalStorage has a size limit (typically 5-10MB)
- Implement compression for larger configurations
- Provide warnings when approaching storage limits
- Offer alternative storage options for very large configurations

### 8.2 File Handling
- Support for large JSON files
- Validation before import/export
- Error handling for malformed JSON
- Progress indicators for file operations

### 8.3 Performance Optimization
- Lazy loading of components
- Virtual scrolling for large lists
- Debounced auto-save to prevent excessive writes
- Efficient data structures for quick lookups

### 8.4 Compatibility
- Ensure compatibility with TraderPlus mod version
- Validate JSON structure against expected format
- Provide version information in exported files

## 9. User Experience Guidelines

### 9.1 Interface Design
- Dark theme with high contrast for readability
- Consistent use of Angular Material components
- Intuitive layout with logical grouping of related functions
- Responsive design with appropriate breakpoints

### 9.2 Feedback and Guidance
- Clear success/error messages for all operations
- Tooltips for explaining complex options
- Inline validation with helpful error messages
- Confirmation dialogs for destructive actions

### 9.3 Accessibility
- Keyboard navigation support
- ARIA attributes for screen readers
- Sufficient color contrast
- Focus indicators for interactive elements

## 10. Implementation Phases

### 10.1 Phase 1: Core Framework
- [x] Setup Angular 18 project with Angular Material
- [x] Implement basic navigation and layout
- [x] Create LocalStorage service for data management
- [x] Develop file import/export functionality

### 10.2 Phase 2: Category and Product Management
- Implement category editor component
- Develop product editor component
- Create relationship management between categories and products
- Add validation and error handling

### 10.3 Phase 3: Currency and Settings
- Implement currency type editor
- Develop general settings configuration
- Add validation for currency relationships
- Integrate with existing components

### 10.4 Phase 4: Advanced Features
- Add batch operations for products
- Implement search and filtering
- Add data visualization for statistics
- Optimize performance for large datasets

### 10.5 Phase 5: Testing and Refinement
- User testing and feedback collection
- Performance optimization
- Bug fixes and refinements
- Documentation and help resources

## 11. Conclusion

This functional specification outlines the requirements for developing an Angular 18 web application for managing TraderPlus mod configurations. The application will provide a user-friendly interface for editing and managing all aspects of the TraderPlus configuration, with a focus on usability, performance, and compatibility with the mod.

The dark-themed Angular Material UI will ensure a modern and consistent user experience, while the LocalStorage-based data management will provide convenient access to configurations without requiring server-side storage.

By following this specification, developers can create a powerful tool that simplifies the configuration process for TraderPlus mod users, enhancing the overall experience of managing trading systems in DayZ servers.

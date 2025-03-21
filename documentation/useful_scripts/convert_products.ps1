# Define paths
$productsPath = "documentation\profiles\TraderPlus\TraderPlusConfig\TraderPlusData\Products"
$targetFile = "src\app\core\data\default-products.ts"

# Get all JSON files in the products directory
$jsonFiles = Get-ChildItem -Path $productsPath -Filter "*.json"

# Create array to store converted TypeScript objects
$productObjects = @()

# Process each JSON entry
foreach ($file in $jsonFiles) {
    # Filename without extension (will be used as productId)
    $productId = $file.BaseName
    
    # Read and parse JSON content
    $jsonContent = Get-Content -Path $file.FullName | ConvertFrom-Json
    
    # Create TypeScript object
    $tsObject = @"
  {
    productId: '$productId',
    className: '$($jsonContent.className)',
    coefficient: $($jsonContent.coefficient),
    maxStock: $($jsonContent.maxStock),
    tradeQuantity: $($jsonContent.tradeQuantity),
    buyPrice: $($jsonContent.buyPrice),
    sellPrice: $($jsonContent.sellPrice),
    stockSettings: $($jsonContent.stockSettings),
    attachments: [$([string]::Join(", ", $jsonContent.attachments))],
    variants: [$([string]::Join(", ", $jsonContent.variants))]
  }
"@
    
    # Add to array
    $productObjects += $tsObject
}

# Create TypeScript file header
$tsFileContent = @"
import { Product } from '../models';

/**
 * Default products for TraderPlus
 * 
 * These products are imported from the actual TraderPlus JSON configuration files.
 * Each product represents a tradable item with its properties.
 */
export const DEFAULT_PRODUCTS: Product[] = [
$([string]::Join(",`n", $productObjects))
];

/**
 * Returns a deep copy of the default products
 * to prevent accidental mutation of the original array
 */
export function getDefaultProducts(): Product[] {
  return JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
}
"@

# Write to target file
$tsFileContent | Out-File -FilePath $targetFile -Encoding utf8

Write-Host "The file has been successfully created with $(($productObjects).Count) products."
# Define paths
$settingsPath = "documentation\profiles\TraderPlus\TraderPlusConfig\TraderPlusGeneralSettings.json"
$targetFile = "src\app\core\data\default-general-settings.ts"

# Read and parse JSON content
$jsonContent = Get-Content -Path $settingsPath | ConvertFrom-Json

# Format licenses array
$licenseObjects = @()
foreach ($license in $jsonContent.licenses) {
    $licenseObj = @"
  {
    licenseId: '$($license.licenseId)',
    licenseName: '$($license.licenseName)',
    description: '$($license.description)'
  }
"@
    $licenseObjects += $licenseObj
}
$licensesTs = [string]::Join(",`n", $licenseObjects)

# Format traders array
$traderObjects = @()
foreach ($trader in $jsonContent.traders) {
    # Format categoriesId array
    $categoriesIdFormatted = if ($trader.categoriesId -and $trader.categoriesId.Count -gt 0) {
        "'$([string]::Join("', '", $trader.categoriesId))'"
    } else { "" }
    
    # Format loadouts array with nested attachments
    $loadoutItems = @()
    foreach ($loadout in $trader.loadouts) {
        $loadoutItem = @"
      {
        className: '$($loadout.className)',
        quantity: $($loadout.quantity),
        slotName: '$($loadout.slotName)',
        attachments: []
      }
"@
        $loadoutItems += $loadoutItem
    }
    $loadoutsFormatted = if ($loadoutItems.Count -gt 0) {
        [string]::Join(",`n", $loadoutItems)
    } else { "" }
    
    $traderObj = @"
  {
    npcId: $($trader.npcId),
    className: '$($trader.className)',
    givenName: '$($trader.givenName)',
    role: '$($trader.role)',
    position: [$(if($trader.position){[string]::Join(", ", $trader.position)}else{"0, 0, 0"})],
    orientation: [$(if($trader.orientation){[string]::Join(", ", $trader.orientation)}else{"0, 0, 0"})],
    categoriesId: [$categoriesIdFormatted],
    currenciesAccepted: [],
    loadouts: [
$loadoutsFormatted
    ]
  }
"@
    $traderObjects += $traderObj
}
$tradersTs = [string]::Join(",`n", $traderObjects)

# Format trader objects array
$tObjectsArr = @()
foreach ($obj in $jsonContent.traderObjects) {
    $tObject = @"
  {
    className: '$($obj.className)',
    position: [$(if($obj.position){[string]::Join(", ", $obj.position)}else{"0, 0, 0"})],
    orientation: [$(if($obj.orientation){[string]::Join(", ", $obj.orientation)}else{"0, 0, 0"})]
  }
"@
    $tObjectsArr += $tObject
}
$tObjectsTs = [string]::Join(",`n", $tObjectsArr)

# Create TypeScript file content
$tsFileContent = @"
import { GeneralSettings, License } from '../models';

/**
 * Default licenses for TraderPlus
 * Common licenses that can be assigned to categories
 */
export const DEFAULT_LICENSES: License[] = [
$licensesTs
];

/**
 * Default settings template for TraderPlus general configuration
 * (without serverID which needs to be generated)
 */
export const DEFAULT_GENERAL_SETTINGS_TEMPLATE = {
  version: '$($jsonContent.version)',
  licenses: DEFAULT_LICENSES,
  acceptedStates: {
    acceptWorn: $($jsonContent.acceptedStates.acceptWorn -eq 1 ? "true" : "false"),
    acceptDamaged: $($jsonContent.acceptedStates.acceptDamaged -eq 1 ? "true" : "false"),
    acceptBadlyDamaged: $($jsonContent.acceptedStates.acceptBadlyDamaged -eq 1 ? "true" : "false"),
    coefficientWorn: $($jsonContent.acceptedStates.coefficientWorn),
    coefficientDamaged: $($jsonContent.acceptedStates.coefficientDamaged),
    coefficientBadlyDamaged: $($jsonContent.acceptedStates.coefficientBadlyDamaged)
  },
  traders: [
$tradersTs
  ],
  traderObjects: [
$tObjectsTs
  ]
};

/**
 * Creates and returns a new GeneralSettings object with default values
 * and a freshly generated serverID
 * 
 * @param generateGUID Function to generate a unique server ID
 * @returns A new GeneralSettings object with default values
 */
export function getDefaultGeneralSettings(generateGUID: () => string): GeneralSettings {
  return {
    ...JSON.parse(JSON.stringify(DEFAULT_GENERAL_SETTINGS_TEMPLATE)),
    serverID: generateGUID()
  };
}
"@

# Write to target file
$tsFileContent | Out-File -FilePath $targetFile -Encoding utf8

Write-Host "The file has been successfully created with general settings data."
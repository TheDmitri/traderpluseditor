/**
 * General settings models based on TraderXGeneralSettings.c
 */
export interface License {
  licenseId?: string;  // The unique identifier for the license
  licenseName: string; // The display name of the license
  description: string; // Description of the license
}

export interface Vector {
  x: number;
  y: number;
  z: number;
}

/**
 * Represents an item in a trader's loadout, including any attachments
 */
export interface LoadoutItem {
  className: string;   // The class name of the item
  quantity: number;    // Quantity of the item (-1 for unlimited)
  slotName: string;    // Slot where the item should be placed
  attachments: LoadoutAttachments[];  // Any attachments to this item (recursive)
}

export interface LoadoutAttachments {
  className: string;   // The class name of the attachment
  quantity: number;    // Quantity of the attachment (-1 for unlimited)
}

/**
 * Represents a trader NPC with all their properties
 */
export interface TraderNpc {
  npcId: number;             // Auto-incremented ID starting from 0
  className: string;         // Class name of the item representing the trader in-game
  givenName: string;         // Name given to the trader by the user
  role: string;              // Role of the trader
  position: number[];        // [x, y, z] coordinates where the trader is placed
  orientation: number[];     // [x, y, z] orientation of the trader object
  categoriesId: string[];    // Categories offered by this trader
  currenciesAccepted: any[]; // Currencies accepted by this trader
  loadouts: LoadoutItem[];   // Items the trader should carry when placed
}

/**
 * Represents an object placed in the trader zone
 */
export interface TraderObject {
  className: string;     // Class name of the object
  position: number[];    // [x, y, z] coordinates of the object
  orientation: number[]; // [x, y, z] orientation of the object
}

/**
 * Internal accepted states interface used by the application (with boolean values)
 */
export interface AcceptedStatesInternal {
  acceptWorn: boolean;
  acceptDamaged: boolean;
  acceptBadlyDamaged: boolean;
  coefficientWorn?: number;
  coefficientDamaged?: number;
  coefficientBadlyDamaged?: number;
}

/**
 * Export accepted states interface used for JSON export (with numeric values)
 */
export interface AcceptedStatesExport {
  acceptWorn: number;
  acceptDamaged: number;
  acceptBadlyDamaged: number;
  coefficientWorn?: number;
  coefficientDamaged?: number;
  coefficientBadlyDamaged?: number;
}

/**
 * Internal general settings interface used by the application
 */
export interface GeneralSettings {
  version: string;
  serverID: string;
  licenses: License[];
  acceptedStates: AcceptedStatesInternal;
  traders: TraderNpc[];
  traderObjects: TraderObject[];
}

/**
 * Export general settings interface used for JSON export
 */
export interface GeneralSettingsExport {
  version: string;
  serverID: string;
  licenses: License[];
  acceptedStates: AcceptedStatesExport;
  traders: TraderNpc[];
  traderObjects: TraderObject[];
}

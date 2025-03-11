/**
 * General settings models based on TraderPlusGeneralSettings.c
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

export interface TraderNpc {
  npcId: number;
  // Other NPC properties as needed
}

export interface TraderObject {
  objectName: string;
  position: Vector;
  orientation: Vector;
}

export interface GeneralSettings {
  version: string;
  serverID: string;
  licenses: License[];
  acceptedStates: {
    worn: boolean;
    damaged: boolean;
    badly_damaged: boolean;
    coefficientWorn?: number;
    coefficientDamaged?: number;
    coefficientBadlyDamaged?: number;
  };
  traders: TraderNpc[];
  traderObjects: TraderObject[];
}

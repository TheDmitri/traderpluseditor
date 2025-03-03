/**
 * General settings models based on TraderPlusGeneralSettings.c
 */
export interface License {
  name: string;
  description: string;
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
  };
  traders: TraderNpc[];
  traderObjects: TraderObject[];
}

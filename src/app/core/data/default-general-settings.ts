import { GeneralSettings, License } from '../models';

/**
 * Default licenses for TraderPlus
 * Common licenses that can be assigned to categories
 */
export const DEFAULT_LICENSES: License[] = [
  {
    licenseId: 'license_car_licence_001',
    licenseName: 'Car Licence',
    description: ''
  },
  {
    licenseId: 'license_admin_license_001',
    licenseName: 'Admin Licence',
    description: ''
  }
];

/**
 * Default settings template for TraderPlus general configuration
 * (without serverID which needs to be generated)
 */
export const DEFAULT_GENERAL_SETTINGS_TEMPLATE = {
  version: '2.0.0',
  licenses: DEFAULT_LICENSES,
  acceptedStates: {
    worn: true,
    damaged: false,
    badly_damaged: false,
    coefficientWorn: 0.8,
    coefficientDamaged: 0.0,
    coefficientBadlyDamaged: 0.0
  },
  traders: [],
  traderObjects: []
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

/**
 * Interfaces for TraderPlus v1 format configuration
 */

/**
 * TraderPlus v1 General Config format
 */
export interface TraderPlusV1GeneralConfig {
  Version: string;
  ConvertTraderConfigToTraderPlus?: number;
  ConvertTraderConfigToTraderPlusWithStockBasedOnCE?: number;
  UseGarageToTradeCar?: number;
  DisableHeightFailSafeForReceiptDeployment?: number;
  HideInsuranceBtn?: number;
  HideGarageBtn?: number;
  HideLicenceBtn?: number;
  EnableShowAllPrices?: number;
  EnableShowAllCheckBox?: number;
  IsReceiptTraderOnly?: number;
  IsReceiptSaveLock?: number;
  IsReceiptSaveAttachment?: number;
  IsReceiptSaveCargo?: number;
  LockPickChance?: number;
  LicenceKeyWord?: string;
  Licences?: string[];
  AcceptedStates: {
    AcceptWorn: number;
    AcceptDamaged: number;
    AcceptBadlyDamaged: number;
    CoefficientWorn?: number;
    CoefficientDamaged?: number;
    CoefficientBadlyDamaged?: number;
  };
  StoreOnlyToPristineState?: number;
  Currencies: TraderPlusV1Currency[];
  Traders: TraderPlusV1Trader[];
  TraderObjects: TraderPlusV1Object[];
}

/**
 * Currency structure in TraderPlus v1
 */
export interface TraderPlusV1Currency {
  ClassName: string;
  Value: number;
}

/**
 * Trader structure in TraderPlus v1
 */
export interface TraderPlusV1Trader {
  Id: number;
  Name: string;
  GivenName: string;
  Role: string;
  Position: number[];
  Orientation: number[];
  Clothes?: string[];
}

/**
 * Object in TraderPlus v1
 */
export interface TraderPlusV1Object {
  ClassName?: string;
  Position?: number[];
  Orientation?: number[];
}

/**
 * TraderPlus v1 IDs Config format
 */
export interface TraderPlusV1IDsConfig {
  Version: string;
  IDs: TraderPlusV1ID[];
}

/**
 * ID entry in TraderPlus v1 IDs config
 */
export interface TraderPlusV1ID {
  Id: number;
  Categories: string[];
  LicencesRequired: string[];
  CurrenciesAccepted: string[];
}

/**
 * TraderPlus v1 Price Config format
 */
export interface TraderPlusV1PriceConfig {
  Version: string;
  EnableAutoCalculation?: number;
  EnableAutoDestockAtRestart?: number;
  EnableDefaultTraderStock?: number;
  TraderCategories: TraderPlusV1Category[];
}

/**
 * Category in TraderPlus v1 Price config
 */
export interface TraderPlusV1Category {
  CategoryName: string;
  Products: string[];
}

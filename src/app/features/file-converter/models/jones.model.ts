export interface JonesCurrency {
  className: string;
  value: number;
}

export interface JonesTrader {
  name: string;
  categories: JonesCategory[];
}

export interface JonesCategory {
  name: string;
  products: JonesProduct[];
}

export interface JonesProduct {
  className: string;
  quantity: string;
  buyPrice: number;
  sellPrice: number;
}

export interface JonesConfig {
  currencyName: string;
  currencies: JonesCurrency[];
  traders: JonesTrader[];
}

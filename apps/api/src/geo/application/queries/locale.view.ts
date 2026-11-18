// Response shapes; ids are strings (BigInt has no JSON form)

export interface CurrencyView {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  // Decimal text: 1 base currency = rate of this one
  rate: string;
  rateAt: string;
  active: boolean;
  position: number;
  isBase: boolean;
}

export interface CurrenciesView {
  // config shop.currency; prices are stored in it
  base: string;
  items: CurrencyView[];
}

export interface LocaleView {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  rtl: boolean;
  active: boolean;
  isDefault: boolean;
  position: number;
}

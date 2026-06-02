export type CurrencyOption = { code: string; name: string; symbol?: string };

// Common ISO 4217 currencies. We keep this list explicit so the UI is stable and predictable.
// You can add more currencies as needed.
export const CURRENCIES: CurrencyOption[] = [
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "AED", name: "UAE Dirham" },
  { code: "QAR", name: "Qatari Riyal" },
  { code: "KWD", name: "Kuwaiti Dinar" },
  { code: "BHD", name: "Bahraini Dinar" },
  { code: "OMR", name: "Omani Rial" },
  { code: "JOD", name: "Jordanian Dinar" },
  { code: "EGP", name: "Egyptian Pound" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "PKR", name: "Pakistani Rupee" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "CAD", name: "Canadian Dollar", symbol: "$" },
  { code: "AUD", name: "Australian Dollar", symbol: "$" },
  { code: "SGD", name: "Singapore Dollar", symbol: "$" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "IDR", name: "Indonesian Rupiah" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱" },
  { code: "BDT", name: "Bangladeshi Taka" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "ETB", name: "Ethiopian Birr" },
  { code: "MAD", name: "Moroccan Dirham" },
  { code: "TND", name: "Tunisian Dinar" },
  { code: "DZD", name: "Algerian Dinar" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "$" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "MXN", name: "Mexican Peso", symbol: "$" },
];

export function formatCurrencyLabel(c: CurrencyOption): string {
  const sym = c.symbol ? ` ${c.symbol}` : "";
  return `${c.code}${sym} — ${c.name}`;
}


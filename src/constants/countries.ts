/**
 * Country data for phone number input
 * Includes dialing codes and flag emojis
 */
export interface Country {
  code: string; // ISO 3166-1 alpha-2 code
  name: string;
  dialingCode: string;
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: "US", name: "United States", dialingCode: "+1", flag: "🇺🇸" },
  { code: "IN", name: "India", dialingCode: "+91", flag: "🇮🇳" },
  { code: "GB", name: "United Kingdom", dialingCode: "+44", flag: "🇬🇧" },
  { code: "CA", name: "Canada", dialingCode: "+1", flag: "🇨🇦" },
  { code: "AU", name: "Australia", dialingCode: "+61", flag: "🇦🇺" },
  { code: "DE", name: "Germany", dialingCode: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dialingCode: "+33", flag: "🇫🇷" },
  { code: "JP", name: "Japan", dialingCode: "+81", flag: "🇯🇵" },
  { code: "CN", name: "China", dialingCode: "+86", flag: "🇨🇳" },
  { code: "BR", name: "Brazil", dialingCode: "+55", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", dialingCode: "+52", flag: "🇲🇽" },
  { code: "ES", name: "Spain", dialingCode: "+34", flag: "🇪🇸" },
  { code: "IT", name: "Italy", dialingCode: "+39", flag: "🇮🇹" },
  { code: "NL", name: "Netherlands", dialingCode: "+31", flag: "🇳🇱" },
  { code: "SE", name: "Sweden", dialingCode: "+46", flag: "🇸🇪" },
  { code: "CH", name: "Switzerland", dialingCode: "+41", flag: "🇨🇭" },
  { code: "SG", name: "Singapore", dialingCode: "+65", flag: "🇸🇬" },
  { code: "AE", name: "United Arab Emirates", dialingCode: "+971", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", dialingCode: "+966", flag: "🇸🇦" },
  { code: "ZA", name: "South Africa", dialingCode: "+27", flag: "🇿🇦" },
  { code: "NG", name: "Nigeria", dialingCode: "+234", flag: "🇳🇬" },
  { code: "EG", name: "Egypt", dialingCode: "+20", flag: "🇪🇬" },
  { code: "KR", name: "South Korea", dialingCode: "+82", flag: "🇰🇷" },
  { code: "ID", name: "Indonesia", dialingCode: "+62", flag: "🇮🇩" },
  { code: "TH", name: "Thailand", dialingCode: "+66", flag: "🇹🇭" },
  { code: "MY", name: "Malaysia", dialingCode: "+60", flag: "🇲🇾" },
  { code: "PH", name: "Philippines", dialingCode: "+63", flag: "🇵🇭" },
  { code: "VN", name: "Vietnam", dialingCode: "+84", flag: "🇻🇳" },
  { code: "PK", name: "Pakistan", dialingCode: "+92", flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh", dialingCode: "+880", flag: "🇧🇩" },
  { code: "RU", name: "Russia", dialingCode: "+7", flag: "🇷🇺" },
  { code: "TR", name: "Turkey", dialingCode: "+90", flag: "🇹🇷" },
  { code: "PL", name: "Poland", dialingCode: "+48", flag: "🇵🇱" },
  { code: "UA", name: "Ukraine", dialingCode: "+380", flag: "🇺🇦" },
  { code: "AR", name: "Argentina", dialingCode: "+54", flag: "🇦🇷" },
  { code: "CO", name: "Colombia", dialingCode: "+57", flag: "🇨🇴" },
  { code: "CL", name: "Chile", dialingCode: "+56", flag: "🇨🇱" },
  { code: "NZ", name: "New Zealand", dialingCode: "+64", flag: "🇳🇿" },
  { code: "IE", name: "Ireland", dialingCode: "+353", flag: "🇮🇪" },
  { code: "IL", name: "Israel", dialingCode: "+972", flag: "🇮🇱" },
];

/**
 * Default country (used when no country is selected)
 */
export const DEFAULT_COUNTRY = COUNTRIES.find((c) => c.code === "IN")!;

/**
 * Find a country by its ISO code
 */
export const getCountryByCode = (code: string): Country | undefined => {
  return COUNTRIES.find((c) => c.code === code.toUpperCase());
};

/**
 * Find a country by its dialing code
 */
export const getCountryByDialingCode = (
  dialingCode: string
): Country | undefined => {
  const normalizedCode = dialingCode.startsWith("+")
    ? dialingCode
    : `+${dialingCode}`;
  return COUNTRIES.find((c) => c.dialingCode === normalizedCode);
};

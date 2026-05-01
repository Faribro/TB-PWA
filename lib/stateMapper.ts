/**
 * State Normalization Utility
 * Ensures consistent state names across webhook ingestion, database, and UI
 */

const STATE_MAPPING: Record<string, string> = {
  // Normalize variations to canonical names - ALL INDIAN STATES & UTs
  
  // Andhra Pradesh
  'andhra pradesh': 'Andhra Pradesh',
  'ANDHRA PRADESH': 'Andhra Pradesh',
  'Andhra Pradesh': 'Andhra Pradesh',
  'andhrapradesh': 'Andhra Pradesh',
  'AP': 'Andhra Pradesh',
  'ap': 'Andhra Pradesh',
  
  // Arunachal Pradesh
  'arunachal pradesh': 'Arunachal Pradesh',
  'ARUNACHAL PRADESH': 'Arunachal Pradesh',
  'Arunachal Pradesh': 'Arunachal Pradesh',
  'arunachalpradesh': 'Arunachal Pradesh',
  
  // Assam
  'assam': 'Assam',
  'ASSAM': 'Assam',
  'Assam': 'Assam',
  
  // Bihar
  'bihar': 'Bihar',
  'BIHAR': 'Bihar',
  'Bihar': 'Bihar',
  
  // Chhattisgarh
  'chhattisgarh': 'Chhattisgarh',
  'CHHATTISGARH': 'Chhattisgarh',
  'Chhattisgarh': 'Chhattisgarh',
  'chattisgarh': 'Chhattisgarh',
  'Chattisgarh': 'Chhattisgarh',
  'CG': 'Chhattisgarh',
  'cg': 'Chhattisgarh',
  
  // Goa
  'goa': 'Goa',
  'GOA': 'Goa',
  'Goa': 'Goa',
  
  // Gujarat
  'gujarat': 'Gujarat',
  'GUJARAT': 'Gujarat',
  'Gujarat': 'Gujarat',
  'GJ': 'Gujarat',
  'gj': 'Gujarat',
  
  // Haryana
  'haryana': 'Haryana',
  'HARYANA': 'Haryana',
  'Haryana': 'Haryana',
  'HR': 'Haryana',
  'hr': 'Haryana',
  
  // Himachal Pradesh
  'himachal pradesh': 'Himachal Pradesh',
  'HIMACHAL PRADESH': 'Himachal Pradesh',
  'Himachal Pradesh': 'Himachal Pradesh',
  'himachalpradesh': 'Himachal Pradesh',
  'HP': 'Himachal Pradesh',
  'hp': 'Himachal Pradesh',
  
  // Jharkhand
  'jharkhand': 'Jharkhand',
  'JHARKHAND': 'Jharkhand',
  'Jharkhand': 'Jharkhand',
  'JH': 'Jharkhand',
  'jh': 'Jharkhand',
  
  // Karnataka
  'karnataka': 'Karnataka',
  'KARNATAKA': 'Karnataka',
  'Karnataka': 'Karnataka',
  'KA': 'Karnataka',
  'ka': 'Karnataka',
  
  // Kerala
  'kerala': 'Kerala',
  'KERALA': 'Kerala',
  'Kerala': 'Kerala',
  'KL': 'Kerala',
  'kl': 'Kerala',
  
  // Madhya Pradesh
  'madhya pradesh': 'Madhya Pradesh',
  'MADHYA PRADESH': 'Madhya Pradesh',
  'Madhya Pradesh': 'Madhya Pradesh',
  'madhyapradesh': 'Madhya Pradesh',
  'Madhyapradesh': 'Madhya Pradesh',
  'madhya_pradesh': 'Madhya Pradesh',
  'MP': 'Madhya Pradesh',
  'mp': 'Madhya Pradesh',
  
  // Maharashtra
  'maharashtra': 'Maharashtra',
  'MAHARASHTRA': 'Maharashtra',
  'Maharashtra': 'Maharashtra',
  'MH': 'Maharashtra',
  'mh': 'Maharashtra',
  
  // Mumbai (sometimes listed separately)
  'mumbai': 'Maharashtra',
  'MUMBAI': 'Maharashtra',
  'Mumbai': 'Maharashtra',
  
  // Manipur
  'manipur': 'Manipur',
  'MANIPUR': 'Manipur',
  'Manipur': 'Manipur',
  'MN': 'Manipur',
  'mn': 'Manipur',
  
  // Meghalaya
  'meghalaya': 'Meghalaya',
  'MEGHALAYA': 'Meghalaya',
  'Meghalaya': 'Meghalaya',
  'ML': 'Meghalaya',
  'ml': 'Meghalaya',
  
  // Mizoram
  'mizoram': 'Mizoram',
  'MIZORAM': 'Mizoram',
  'Mizoram': 'Mizoram',
  'MZ': 'Mizoram',
  'mz': 'Mizoram',
  
  // Nagaland
  'nagaland': 'Nagaland',
  'NAGALAND': 'Nagaland',
  'Nagaland': 'Nagaland',
  'NL': 'Nagaland',
  'nl': 'Nagaland',
  
  // Odisha
  'odisha': 'Odisha',
  'ODISHA': 'Odisha',
  'Odisha': 'Odisha',
  'orissa': 'Odisha',
  'Orissa': 'Orissa',
  'ORISSA': 'Odisha',
  'OR': 'Odisha',
  'or': 'Odisha',
  
  // Punjab
  'punjab': 'Punjab',
  'PUNJAB': 'Punjab',
  'Punjab': 'Punjab',
  'PB': 'Punjab',
  'pb': 'Punjab',
  
  // Rajasthan
  'rajasthan': 'Rajasthan',
  'RAJASTHAN': 'Rajasthan',
  'Rajasthan': 'Rajasthan',
  'RJ': 'Rajasthan',
  'rj': 'Rajasthan',
  
  // Sikkim
  'sikkim': 'Sikkim',
  'SIKKIM': 'Sikkim',
  'Sikkim': 'Sikkim',
  'SK': 'Sikkim',
  'sk': 'Sikkim',
  
  // Tamil Nadu
  'tamil nadu': 'Tamil Nadu',
  'TAMIL NADU': 'Tamil Nadu',
  'Tamil Nadu': 'Tamil Nadu',
  'tamilnadu': 'Tamil Nadu',
  'Tamilnadu': 'Tamil Nadu',
  'TN': 'Tamil Nadu',
  'tn': 'Tamil Nadu',
  
  // Telangana
  'telangana': 'Telangana',
  'TELANGANA': 'Telangana',
  'Telangana': 'Telangana',
  'TG': 'Telangana',
  'tg': 'Telangana',
  
  // Tripura
  'tripura': 'Tripura',
  'TRIPURA': 'Tripura',
  'Tripura': 'Tripura',
  'TR': 'Tripura',
  'tr': 'Tripura',
  
  // Uttar Pradesh
  'uttar pradesh': 'Uttar Pradesh',
  'UTTAR PRADESH': 'Uttar Pradesh',
  'Uttar Pradesh': 'Uttar Pradesh',
  'uttarpradesh': 'Uttar Pradesh',
  'UP': 'Uttar Pradesh',
  'up': 'Uttar Pradesh',
  
  // Uttarakhand
  'uttarakhand': 'Uttarakhand',
  'UTTARAKHAND': 'Uttarakhand',
  'Uttarakhand': 'Uttarakhand',
  'uttrakhand': 'Uttarakhand',
  'Uttrakhand': 'Uttarakhand',
  'uttaranchal': 'Uttarakhand',
  'Uttaranchal': 'Uttarakhand',
  'UK': 'Uttarakhand',
  'uk': 'Uttarakhand',
  
  // West Bengal
  'west bengal': 'West Bengal',
  'WEST BENGAL': 'West Bengal',
  'West Bengal': 'West Bengal',
  'westbengal': 'West Bengal',
  'WB': 'West Bengal',
  'wb': 'West Bengal',
  
  // Union Territories
  
  // Andaman and Nicobar Islands
  'andaman and nicobar islands': 'Andaman and Nicobar Islands',
  'ANDAMAN AND NICOBAR ISLANDS': 'Andaman and Nicobar Islands',
  'Andaman and Nicobar Islands': 'Andaman and Nicobar Islands',
  'andaman': 'Andaman and Nicobar Islands',
  'Andaman': 'Andaman and Nicobar Islands',
  'AN': 'Andaman and Nicobar Islands',
  'an': 'Andaman and Nicobar Islands',
  
  // Chandigarh
  'chandigarh': 'Chandigarh',
  'CHANDIGARH': 'Chandigarh',
  'Chandigarh': 'Chandigarh',
  'CH': 'Chandigarh',
  'ch': 'Chandigarh',
  
  // Dadra and Nagar Haveli and Daman and Diu
  'dadra and nagar haveli and daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
  'DADRA AND NAGAR HAVELI AND DAMAN AND DIU': 'Dadra and Nagar Haveli and Daman and Diu',
  'Dadra and Nagar Haveli and Daman and Diu': 'Dadra and Nagar Haveli and Daman and Diu',
  'dadra and nagar haveli': 'Dadra and Nagar Haveli and Daman and Diu',
  'daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
  'DN': 'Dadra and Nagar Haveli and Daman and Diu',
  'dn': 'Dadra and Nagar Haveli and Daman and Diu',
  
  // Delhi
  'delhi': 'Delhi',
  'DELHI': 'Delhi',
  'Delhi': 'Delhi',
  'new delhi': 'Delhi',
  'New Delhi': 'Delhi',
  'NCR': 'Delhi',
  'ncr': 'Delhi',
  'DL': 'Delhi',
  'dl': 'Delhi',
  
  // Jammu and Kashmir
  'jammu and kashmir': 'Jammu and Kashmir',
  'JAMMU AND KASHMIR': 'Jammu and Kashmir',
  'Jammu and Kashmir': 'Jammu and Kashmir',
  'jammu & kashmir': 'Jammu and Kashmir',
  'J&K': 'Jammu and Kashmir',
  'j&k': 'Jammu and Kashmir',
  'JK': 'Jammu and Kashmir',
  'jk': 'Jammu and Kashmir',
  
  // Ladakh
  'ladakh': 'Ladakh',
  'LADAKH': 'Ladakh',
  'Ladakh': 'Ladakh',
  'LA': 'Ladakh',
  'la': 'Ladakh',
  
  // Lakshadweep
  'lakshadweep': 'Lakshadweep',
  'LAKSHADWEEP': 'Lakshadweep',
  'Lakshadweep': 'Lakshadweep',
  'LD': 'Lakshadweep',
  'ld': 'Lakshadweep',
  
  // Puducherry
  'puducherry': 'Puducherry',
  'PUDUCHERRY': 'Puducherry',
  'Puducherry': 'Puducherry',
  'pondicherry': 'Puducherry',
  'Pondicherry': 'Puducherry',
  'PY': 'Puducherry',
  'py': 'Puducherry',
};

/**
 * Normalize state name to canonical form
 * Returns null if state is invalid/unknown
 */
export function normalizeState(state: string | null | undefined): string | null {
  if (!state) return null;
  
  const trimmed = state.trim();
  if (!trimmed) return null;
  
  // Direct lookup
  const normalized = STATE_MAPPING[trimmed];
  if (normalized) return normalized;
  
  // Case-insensitive fallback
  const lowerKey = Object.keys(STATE_MAPPING).find(
    k => k.toLowerCase() === trimmed.toLowerCase()
  );
  
  if (lowerKey) return STATE_MAPPING[lowerKey];
  
  // Return original if no mapping found (log warning in production)
  console.warn(`[stateMapper] Unknown state: "${state}" - using as-is`);
  return trimmed;
}

/**
 * Normalize district name
 */
export function normalizeDistrict(district: string | null | undefined): string | null {
  if (!district) return null;
  const trimmed = district.trim();
  return trimmed || null;
}

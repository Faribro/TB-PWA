export type SonicLanguage = 
  | 'en' | 'hi' | 'mr' | 'ta' | 'te' 
  | 'kn' | 'gu' | 'bn' | 'pa' | 'ml' | 'ur';

export const SONIC_LANGUAGES: Record<SonicLanguage, {
  label: string;
  nativeLabel: string;
  voiceLang: string;
  voiceName?: string;
}> = {
  en: { label: 'English',    nativeLabel: 'English',    voiceLang: 'en-IN', voiceName: 'Google UK English Male' },
  hi: { label: 'Hindi',      nativeLabel: 'हिंदी',       voiceLang: 'hi-IN', voiceName: 'Google हिन्दी' },
  mr: { label: 'Marathi',    nativeLabel: 'मराठी',       voiceLang: 'mr-IN', voiceName: 'Google मराठी' },
  ta: { label: 'Tamil',      nativeLabel: 'தமிழ்',       voiceLang: 'ta-IN', voiceName: 'Google தமிழ்' },
  te: { label: 'Telugu',     nativeLabel: 'తెలుగు',      voiceLang: 'te-IN', voiceName: 'Google తెలుగు' },
  kn: { label: 'Kannada',    nativeLabel: 'ಕನ್ನಡ',       voiceLang: 'kn-IN', voiceName: 'Google ಕನ್ನಡ' },
  gu: { label: 'Gujarati',   nativeLabel: 'ગુજરાતી',     voiceLang: 'gu-IN', voiceName: 'Google ગુજરાતી' },
  bn: { label: 'Bengali',    nativeLabel: 'বাংলা',       voiceLang: 'bn-IN', voiceName: 'Google বাংলা' },
  pa: { label: 'Punjabi',    nativeLabel: 'ਪੰਜਾਬੀ',      voiceLang: 'pa-IN', voiceName: 'Google ਪੰਜਾਬੀ' },
  ml: { label: 'Malayalam',  nativeLabel: 'മലയാളം',     voiceLang: 'ml-IN', voiceName: 'Google മലയാളം' },
  ur: { label: 'Urdu',       nativeLabel: 'اردو',        voiceLang: 'ur-IN', voiceName: 'Google اردو' },
};

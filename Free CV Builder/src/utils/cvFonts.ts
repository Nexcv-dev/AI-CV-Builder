export type CvFontOption = {
  name: string;
  description: string;
  className: string;
  cssFamily: string;
  googleFamilyQuery: string;
};

export const CV_FONT_OPTIONS: CvFontOption[] = [
  { name: 'Inter', description: 'Modern, Clean', className: 'font-sans', cssFamily: "'Inter', sans-serif", googleFamilyQuery: 'Inter:wght@400;500;600;700' },
  { name: 'Poppins', description: 'Rounded, Modern', className: 'font-poppins', cssFamily: "'Poppins', sans-serif", googleFamilyQuery: 'Poppins:wght@400;500;600;700;800' },
  { name: 'Source Sans 3', description: 'Readable, Professional', className: 'font-source-sans', cssFamily: "'Source Sans 3', sans-serif", googleFamilyQuery: 'Source+Sans+3:wght@400;500;600;700;800' },
  { name: 'Work Sans', description: 'Corporate, Precise', className: 'font-work-sans', cssFamily: "'Work Sans', sans-serif", googleFamilyQuery: 'Work+Sans:wght@400;500;600;700;800' },
  { name: 'Manrope', description: 'Clean, Contemporary', className: 'font-manrope', cssFamily: "'Manrope', sans-serif", googleFamilyQuery: 'Manrope:wght@400;500;600;700;800' },
  { name: 'Lora', description: 'Serif, Classic', className: 'font-serif', cssFamily: "'Lora', serif", googleFamilyQuery: 'Lora:ital,wght@0,400;0,500;0,600;0,700;1,400' },
  { name: 'Roboto', description: 'Structured, Technical', className: 'font-roboto', cssFamily: "'Roboto', sans-serif", googleFamilyQuery: 'Roboto:wght@400;500;700' },
  { name: 'Montserrat', description: 'Geometric, Bold', className: 'font-montserrat', cssFamily: "'Montserrat', sans-serif", googleFamilyQuery: 'Montserrat:wght@400;500;600;700' },
  { name: 'Merriweather', description: 'Elegant Serif', className: 'font-merriweather', cssFamily: "'Merriweather', serif", googleFamilyQuery: 'Merriweather:wght@300;400;700' },
  { name: 'Noto Serif', description: 'Readable Serif', className: 'font-noto-serif', cssFamily: "'Noto Serif', serif", googleFamilyQuery: 'Noto+Serif:wght@400;500;600;700;800' },
  { name: 'Playfair Display', description: 'Stylish Serif', className: 'font-playfair', cssFamily: "'Playfair Display', serif", googleFamilyQuery: 'Playfair+Display:wght@400;500;600;700' },
  { name: 'JetBrains Mono', description: 'Technical, Code', className: 'font-mono', cssFamily: "'JetBrains Mono', monospace", googleFamilyQuery: 'JetBrains+Mono:wght@400;500;700' },
];

export const CV_FONT_CSS_MAP: Record<string, string> = Object.fromEntries(
  CV_FONT_OPTIONS.map((font) => [font.name, font.cssFamily])
);

export const sanitizeCvFontFamily = (value: unknown) => {
  if (typeof value !== 'string') return 'Inter';
  const fontFamily = value.trim();
  return Object.prototype.hasOwnProperty.call(CV_FONT_CSS_MAP, fontFamily) ? fontFamily : 'Inter';
};

export const googleFontFamilyParam = (fontFamily: string) => fontFamily.replace(/\s+/g, '+');

export const CV_GOOGLE_FONTS_URL =
  `https://fonts.googleapis.com/css2?${CV_FONT_OPTIONS
    .map((font) => `family=${font.googleFamilyQuery}`)
    .join('&')}&display=swap`;

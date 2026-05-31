import templateReleaseMap from '../../config/template-release-map.json';

export interface TemplateRenderOptions {
  watermark?: boolean;
}

export const TEMPLATE_DEFAULT_THEME_COLORS: Record<string, string> = Object.fromEntries(
  templateReleaseMap.flatMap((item) => [
    [item.sourceFolder, item.defaultThemeColor],
    [item.targetKey, item.defaultThemeColor],
  ])
);

export const safeHexColor = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;

export const resolveTemplateThemeColor = (template: unknown, value: unknown) => {
  const themeColor = safeHexColor(value, '#000000');
  if (themeColor.toLowerCase() !== '#000000' || typeof template !== 'string') return themeColor;
  return TEMPLATE_DEFAULT_THEME_COLORS[template] || themeColor;
};

const safeColorMap = (value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

export const resolveTemplateThemeColorForData = (template: unknown, cvData: { themeColor?: unknown; templateThemeColors?: unknown }, defaultThemeColor?: string) => {
  const templateKey = typeof template === 'string' ? template : '';
  const templateThemeColors = safeColorMap(cvData.templateThemeColors);
  const templateDefault = safeHexColor(defaultThemeColor, resolveTemplateThemeColor(template, '#000000'));
  const savedTemplateColor = safeHexColor(templateThemeColors[templateKey], '');
  if (savedTemplateColor) return savedTemplateColor;
  const themeColor = safeHexColor(cvData.themeColor, '#000000');
  return themeColor.toLowerCase() === '#000000' ? templateDefault : themeColor;
};

export const resolveTemplateSurfaceColorForData = (
  template: unknown,
  cvData: { templateSurfaceColor?: unknown; templateSurfaceColors?: unknown },
  fallback: string
) => {
  const templateKey = typeof template === 'string' ? template : '';
  const templateSurfaceColors = safeColorMap(cvData.templateSurfaceColors);
  return safeHexColor(templateSurfaceColors[templateKey] || cvData.templateSurfaceColor, fallback);
};

export const applyTemplateColorDefaults = <T extends {
  themeColor: string;
  templateThemeColors?: Record<string, string>;
  templateSurfaceColor?: string;
  templateSurfaceColors?: Record<string, string>;
}>(
  cvData: T,
  currentTemplate: unknown,
  nextTemplate: unknown,
  templateDefaults: Record<string, string> = {}
): T => {
  const currentTemplateKey = typeof currentTemplate === 'string' ? currentTemplate : '';
  const nextTemplateKey = typeof nextTemplate === 'string' ? nextTemplate : '';
  const currentDefault = safeHexColor(templateDefaults[currentTemplateKey], resolveTemplateThemeColor(currentTemplate, '#000000'));
  const nextDefault = safeHexColor(templateDefaults[nextTemplateKey], resolveTemplateThemeColor(nextTemplate, '#000000'));
  const currentThemeColor = safeHexColor(cvData.themeColor, currentDefault);
  const nextTemplateThemeColor = safeHexColor(cvData.templateThemeColors?.[nextTemplateKey], nextDefault);
  const templateThemeColors = { ...(cvData.templateThemeColors || {}) };
  const templateSurfaceColors = { ...(cvData.templateSurfaceColors || {}) };

  if (currentTemplateKey && currentThemeColor.toLowerCase() !== currentDefault.toLowerCase() && !templateThemeColors[currentTemplateKey]) {
    templateThemeColors[currentTemplateKey] = currentThemeColor;
  }

  if (currentTemplateKey && cvData.templateSurfaceColor && !templateSurfaceColors[currentTemplateKey]) {
    templateSurfaceColors[currentTemplateKey] = cvData.templateSurfaceColor;
  }

  return {
    ...cvData,
    themeColor: nextTemplateThemeColor,
    templateThemeColors,
    templateSurfaceColor: templateSurfaceColors[nextTemplateKey],
    templateSurfaceColors,
  };
};

export const profileImageCss = (cvData: any) => {
  const imageZoom = Number.isFinite(Number(cvData?.imageZoom)) ? Math.min(Math.max(Number(cvData.imageZoom), 0.5), 3) : 1;
  const imageX = Number.isFinite(Number(cvData?.imageX)) ? Math.min(Math.max(Number(cvData.imageX), -120), 120) : 0;
  const imageY = Number.isFinite(Number(cvData?.imageY)) ? Math.min(Math.max(Number(cvData.imageY), -120), 120) : 0;
  const transform = `scale(${imageZoom}) translate(${imageX}px, ${imageY}px)`;
  return {
    imageZoom,
    imageX,
    imageY,
    transform,
    style: `width:100%;height:100%;object-fit:cover;display:block;transform-origin:center;transform:${transform};`,
  };
};

const safeNumber = (value: unknown, fallback: number, min: number, max: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(Math.max(number, min), max) : fallback;
};

const getContrastColor = (hex: string) => {
  if (!hex || hex.length < 7) return '#ffffff';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#1a1a1a' : '#ffffff';
};

const templateFontMap: Record<string, string> = {
  Inter: "'Inter', sans-serif",
  Lora: "'Lora', serif",
  Roboto: "'Roboto', sans-serif",
  Montserrat: "'Montserrat', sans-serif",
  Merriweather: "'Merriweather', serif",
  'Playfair Display': "'Playfair Display', serif",
  'JetBrains Mono': "'JetBrains Mono', monospace",
};

const sanitizeTemplateFontFamily = (value: unknown) => {
  if (typeof value !== 'string') return 'Inter';
  const fontFamily = value.trim();
  return Object.prototype.hasOwnProperty.call(templateFontMap, fontFamily) ? fontFamily : 'Inter';
};

const googleFontFamilyParam = (fontFamily: string) => fontFamily.replace(/\s+/g, '+');

const formatDateInline = (startDate?: string, endDate?: string) =>
  [startDate || '', endDate || ''].filter(Boolean).join(startDate && endDate ? ' - ' : '');

const formatDateStacked = (startDate?: string, endDate?: string) =>
  (startDate || '') + (startDate && endDate ? '<br>-<br>' : '') + (endDate || '');

export const prepareS3TemplateData = (cvData: any, options: TemplateRenderOptions = {}) => {
  const personalInfo = cvData?.personalInfo || {};
  const experience = Array.isArray(cvData?.experience) ? cvData.experience : [];
  const education = Array.isArray(cvData?.education) ? cvData.education : [];
  const skills = Array.isArray(cvData?.skills) ? cvData.skills : [];
  const projects = Array.isArray(cvData?.projects) ? cvData.projects : [];
  const courses = Array.isArray(cvData?.courses) ? cvData.courses : [];
  const awards = Array.isArray(cvData?.awards) ? cvData.awards : [];
  const languages = Array.isArray(cvData?.languages) ? cvData.languages : [];
  const references = Array.isArray(cvData?.references) ? cvData.references : [];
  const sectionOrder = Array.isArray(cvData?.sectionOrder)
    ? cvData.sectionOrder
    : ['summary', 'personalDetails', 'experience', 'education', 'skills', 'projects', 'courses', 'awards', 'languages', 'references'];
  const hiddenSections = Array.isArray(cvData?.hiddenSections) ? cvData.hiddenSections : [];
  const themeColor = resolveTemplateThemeColorForData(cvData?.template, cvData || {});
  const sidebarColor = safeHexColor(cvData?.sidebarColor, '#1e293b');
  const templateSurfaceColor = resolveTemplateSurfaceColorForData(cvData?.template, cvData || {}, themeColor);
  const sidebarTextColor = getContrastColor(templateSurfaceColor);
  const startupHeaderTextColor = getContrastColor(templateSurfaceColor);
  const startupHeaderMutedColor = startupHeaderTextColor === '#ffffff' ? 'rgba(236, 253, 245, 0.92)' : 'rgba(15, 23, 42, 0.72)';
  const startupHeaderBackground = cvData?.templateSurfaceColor
    ? templateSurfaceColor
    : `linear-gradient(135deg, ${themeColor} 0%, #047857 100%)`;
  const fontFamily = sanitizeTemplateFontFamily(cvData?.fontFamily);
  const imageCss = profileImageCss(cvData);
  const profileImage = cvData?.profileImage || '';
  const lineSpacing = safeNumber(cvData?.lineSpacing, 1.5, 1, 2.5);
  const sectionGap = safeNumber(cvData?.sectionGap, 2, 0.5, 4);
  const personalDetails = [
    personalInfo.dob ? { label: 'Date of Birth', value: personalInfo.dob } : null,
    personalInfo.nic ? { label: 'NIC', value: personalInfo.nic } : null,
    personalInfo.gender ? { label: 'Gender', value: personalInfo.gender } : null,
    personalInfo.maritalStatus ? { label: 'Marital Status', value: personalInfo.maritalStatus } : null,
    personalInfo.nationality ? { label: 'Nationality', value: personalInfo.nationality } : null,
    personalInfo.religion ? { label: 'Religion', value: personalInfo.religion } : null,
  ].filter(Boolean);
  const processedExperience = experience.map((item: any) => ({
    ...item,
    position: item.position || '',
    company: item.company || 'Company',
    formattedDate: formatDateInline(item.startDate, item.endDate),
    formattedDateStacked: formatDateStacked(item.startDate, item.endDate),
  }));
  const processedEducation = education.map((item: any) => ({
    ...item,
    degree: item.degree || 'Degree',
    institution: item.institution || 'Institution',
    formattedDate: formatDateInline(item.startDate, item.endDate),
    formattedDateStacked: formatDateStacked(item.startDate, item.endDate),
  }));
  const processedSkills = skills.map((item: any) => {
    const level = Number(item.level || 0);
    const clampedLevel = Number.isFinite(level) ? Math.min(Math.max(level, 0), 5) : 0;
    return { ...item, level: clampedLevel, levelPercent: `${(clampedLevel / 5) * 100}%` };
  });
  const groupedSkillsMap = processedSkills.reduce((acc: Record<string, any[]>, skill: any) => {
    const category = skill.category?.trim() || 'Core Skills';
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill);
    return acc;
  }, {});
  const groupedSkills = Object.entries(groupedSkillsMap).map(([category, items]) => ({ category, items }));
  const processedProjects = projects.map((item: any) => ({ ...item, name: item.name || 'Project Name', hasLink: Boolean(item.link) }));
  const processedCourses = courses.map((item: any) => ({ ...item, name: item.name || 'Course Name', institution: item.institution || 'Institution', formattedDate: formatDateInline(item.startDate, item.endDate) }));
  const processedAwards = awards.map((item: any) => ({ ...item, name: item.name || 'Award Name', issuer: item.issuer || 'Issuer' }));
  const processedLanguages = languages.map((item: any) => ({ ...item, label: item.proficiency ? `${item.name || ''} (${item.proficiency})` : (item.name || '') }));
  const processedReferences = references.map((item: any) => ({ ...item, name: item.name || 'Reference Name', sub: [item.position, item.company].filter(Boolean).join(', '), hasContact: Boolean(item.email || item.phone) }));
  const hasPersonalDetails = personalDetails.length > 0;
  const isProfessional = cvData?.template === 'professional';
  const sectionBuilders: Record<string, () => any | null> = {
    summary: () => personalInfo.summary ? { key: 'summary', isSummary: true, title: isProfessional ? 'Professional Summary' : 'Profile' } : null,
    personalDetails: () => hasPersonalDetails ? { key: 'personalDetails', isPersonalDetails: true, title: 'Personal Details', items: personalDetails } : null,
    experience: () => processedExperience.length ? { key: 'experience', isExperience: true, title: 'Experience', items: processedExperience } : null,
    education: () => processedEducation.length ? { key: 'education', isEducation: true, title: 'Education', items: processedEducation } : null,
    skills: () => processedSkills.length ? { key: 'skills', isSkills: true, title: isProfessional ? 'Skills & Expertise' : 'Skills', items: processedSkills, groupedItems: groupedSkills } : null,
    projects: () => processedProjects.length ? { key: 'projects', isProjects: true, title: isProfessional ? 'Key Projects' : 'Projects', items: processedProjects } : null,
    courses: () => processedCourses.length ? { key: 'courses', isCourses: true, title: isProfessional ? 'Certifications & Courses' : 'Courses & Certifications', items: processedCourses } : null,
    awards: () => processedAwards.length ? { key: 'awards', isAwards: true, title: 'Awards', items: processedAwards } : null,
    languages: () => processedLanguages.length ? { key: 'languages', isLanguages: true, title: 'Languages', items: processedLanguages } : null,
    references: () => processedReferences.length ? { key: 'references', isReferences: true, title: 'References', items: processedReferences } : null,
  };
  const sections = sectionOrder.filter((key: string) => !hiddenSections.includes(key)).map((key: string) => sectionBuilders[key]?.()).filter(Boolean);
  const minimalistSideSectionKeys = ['personalDetails', 'education', 'skills', 'projects', 'courses', 'awards', 'languages', 'references'];
  const minimalistLeftSections = sections.filter((section: any) => !minimalistSideSectionKeys.includes(section.key));
  const minimalistRightSections = sections.filter((section: any) => minimalistSideSectionKeys.includes(section.key));
  const modernMainSections = sections.filter((section: any) => !['personalDetails', 'skills', 'languages'].includes(section.key));
  const startupLeftSections = sections.filter((section: any) => ['personalDetails', 'summary', 'experience'].includes(section.key));
  const startupRightSections = sections.filter((section: any) => ['education', 'skills', 'projects', 'courses', 'awards', 'languages', 'references'].includes(section.key));
  const creativeSideSections = sections.filter((section: any) => ['personalDetails', 'skills', 'languages'].includes(section.key));
  const creativeMainSections = sections.filter((section: any) => !['personalDetails', 'skills', 'languages'].includes(section.key));

  return {
    ...cvData,
    personalInfo: { ...personalInfo, fullName: personalInfo.fullName || 'Your Name' },
    contactItems: [personalInfo.email, personalInfo.phone, personalInfo.address].filter(Boolean).map((value: string) => ({ value })),
    experience: processedExperience,
    education: processedEducation,
    skills: processedSkills,
    groupedSkills,
    projects: processedProjects,
    courses: processedCourses,
    awards: processedAwards,
    languages: processedLanguages,
    references: processedReferences,
    sections,
    modernMainSections,
    startupLeftSections,
    startupRightSections,
    creativeSideSections,
    creativeMainSections,
    minimalistLeftSections,
    minimalistRightSections,
    themeColor,
    sidebarColor,
    templateSurfaceColor,
    primaryColor: themeColor,
    watermark: Boolean(options.watermark),
    computed: {
      themeColor,
      primaryColor: themeColor,
      sidebarColor,
      templateSurfaceColor,
      sidebarTextColor,
      sidebarMutedColor: sidebarTextColor === '#ffffff' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
      startupHeaderTextColor,
      startupHeaderMutedColor,
      startupHeaderBackground,
      fontFamily,
      fontFamilyCSS: templateFontMap[fontFamily],
      googleFontName: googleFontFamilyParam(fontFamily),
      lineSpacing,
      sectionGap,
      sectionGapRem: `${sectionGap}rem`,
      profileImage,
      hasProfileImage: Boolean(profileImage),
      profileImageTransform: imageCss.transform,
      startupHeadlineTitle: processedExperience[0]?.position || '',
    },
    flags: {
      isProfessional,
      hasPersonalDetails,
      hasSkills: processedSkills.length > 0,
      hasLanguages: processedLanguages.length > 0,
      hasSkillCategories: processedSkills.some((skill: any) => skill.category?.trim()),
    },
  };
};

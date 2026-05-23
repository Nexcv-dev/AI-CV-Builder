import DOMPurify from 'dompurify';

const getTemplateValue = (pathValue: string, context: any, root: any) => {
  const pathParts = pathValue.trim().split('.').filter(Boolean);
  const readPath = (source: any) => pathParts.reduce((value, part) => value?.[part], source);
  const contextValue = readPath(context);
  return contextValue === undefined ? readPath(root) : contextValue;
};

const renderTemplateValue = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return '';
  return String(value);
};

const escapeHtml = (str: string) => (
  (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
);

const profileImageCss = (cvData: any) => {
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

const withExperiencePageBreakGroups = (cvData: any) => {
  const experience = Array.isArray(cvData?.experience) ? cvData.experience : [];
  const experienceLeadItems = experience.slice(0, 2);
  const experienceContinuationItems = experience.slice(2);

  return {
    experienceLeadItems,
    experienceContinuationItems,
    hasExperienceContinuation: experienceContinuationItems.length > 0,
  };
};

const safeHexColor = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;

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

const formatDateInline = (startDate?: string, endDate?: string) =>
  [startDate || '', endDate || ''].filter(Boolean).join(startDate && endDate ? ' - ' : '');

const formatDateStacked = (startDate?: string, endDate?: string) =>
  (startDate || '') + (startDate && endDate ? '<br>-<br>' : '') + (endDate || '');

const prepareS3TemplateData = (cvData: any, options: { watermark?: boolean } = {}) => {
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
  const themeColor = safeHexColor(cvData?.themeColor, '#7c3aed');
  const sidebarColor = safeHexColor(cvData?.sidebarColor, '#1e293b');
  const templateSurfaceColor = safeHexColor(cvData?.templateSurfaceColor, themeColor);
  const sidebarTextColor = getContrastColor(templateSurfaceColor);
  const fontFamily = cvData?.fontFamily || 'Inter';
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
    position: item.position || 'Position',
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
    watermark: Boolean(options.watermark),
    computed: {
      themeColor,
      sidebarColor,
      templateSurfaceColor,
      sidebarTextColor,
      sidebarMutedColor: sidebarTextColor === '#ffffff' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
      fontFamily,
      fontFamilyCSS: templateFontMap[fontFamily] || "'Inter', sans-serif",
      googleFontName: String(fontFamily || 'Inter').replace(/\s+/g, '+'),
      lineSpacing,
      sectionGap,
      sectionGapRem: `${sectionGap}rem`,
      profileImage,
      hasProfileImage: Boolean(profileImage),
      profileImageTransform: imageCss.transform,
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

const applyProfileImageAdjustments = (html: string, profileImageUrl: string, style: string) => {
  if (!profileImageUrl || typeof DOMParser === 'undefined') return html;

  const parser = new DOMParser();
  const document = parser.parseFromString(html, 'text/html');
  document.querySelectorAll('img').forEach((image) => {
    if (image.getAttribute('src') !== profileImageUrl) return;
    const existingStyle = image.getAttribute('style') || '';
    const nextStyle = `${existingStyle}${existingStyle && !existingStyle.trim().endsWith(';') ? ';' : ''}${style}`;
    image.setAttribute('style', nextStyle);
    if (!image.getAttribute('alt')) image.setAttribute('alt', 'Profile');
  });

  return document.documentElement.outerHTML;
};

export function renderCvTemplateString(templateHtml: string, cvData: any, options: { watermark?: boolean } = {}) {
  const preparedData = prepareS3TemplateData(cvData, options);
  const headline = preparedData?.experience?.[0]?.position || preparedData?.education?.[0]?.degree || '';
  const location = cvData?.personalInfo?.address || '';
  const profileImageUrl = cvData?.profileImage || '';
  const imageCss = profileImageCss(cvData);
  const personalInfo = preparedData?.personalInfo || {};
  const hasSummary = Boolean(personalInfo.summary);
  const hasPersonalDetails = Boolean(
    personalInfo.dob ||
    personalInfo.nic ||
    personalInfo.gender ||
    personalInfo.nationality ||
    personalInfo.religion ||
    personalInfo.maritalStatus
  );
  const hasContact = Boolean(personalInfo.email || personalInfo.phone || location);
  const hasExperience = Boolean(cvData?.experience?.length);
  const hasEducation = Boolean(cvData?.education?.length);
  const hasSkills = Boolean(cvData?.skills?.length);
  const hasCourses = Boolean(cvData?.courses?.length);
  const hasProjects = Boolean(cvData?.projects?.length);
  const hasAwards = Boolean(cvData?.awards?.length);
  const hasLanguages = Boolean(cvData?.languages?.length);
  const hasReferences = Boolean(cvData?.references?.length);
  const experiencePageBreakGroups = withExperiencePageBreakGroups(cvData);
  const root = {
    ...preparedData,
    ...experiencePageBreakGroups,
    headline,
    location,
    profileImageUrl,
    profileImageTransform: imageCss.transform,
    profileImageStyle: imageCss.style,
    imageZoom: imageCss.imageZoom,
    imageX: imageCss.imageX,
    imageY: imageCss.imageY,
    hasHeader: Boolean(personalInfo.fullName || headline || hasSummary),
    hasSummary,
    hasContact,
    hasProfileCard: Boolean(profileImageUrl || hasContact || hasPersonalDetails),
    hasPersonalDetails,
    hasExperience,
    hasEducation,
    hasSkills,
    hasCourses,
    hasProjects,
    hasAwards,
    hasLanguages,
    hasReferences,
    hasMainColumn: Boolean(hasExperience || hasEducation || hasCourses || hasAwards),
    hasSideColumn: Boolean(hasSkills || hasProjects || hasLanguages || hasReferences || hasPersonalDetails),
    hasBody: Boolean(hasExperience || hasEducation || hasSkills || hasCourses || hasProjects || hasAwards || hasLanguages || hasReferences || hasPersonalDetails),
    watermark: Boolean(options.watermark),
  };

  const renderBlock = (source: string, context: any): string => {
    let html = source.replace(/{{#\s*([\w.]+)\s*}}([\s\S]*?){{\/\s*\1\s*}}/g, (_match, pathValue, block) => {
      const value = getTemplateValue(pathValue, context, root);
      if (Array.isArray(value)) {
        return value.map((item) => renderBlock(block, item)).join('');
      }
      if (value && typeof value === 'object') return renderBlock(block, value);
      return value ? renderBlock(block, context) : '';
    });

    html = html.replace(/{{\^\s*([\w.]+)\s*}}([\s\S]*?){{\/\s*\1\s*}}/g, (_match, pathValue, block) => {
      const value = getTemplateValue(pathValue, context, root);
      const isEmptyArray = Array.isArray(value) && value.length === 0;
      return (!value || isEmptyArray) ? renderBlock(block, context) : '';
    });

    html = html.replace(/{{{\s*([\w.]+)\s*}}}/g, (_match, pathValue) => {
      const value = renderTemplateValue(getTemplateValue(pathValue, context, root));
      return DOMPurify.sanitize(value, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'p', 'br', 'u', 'div', 'span'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
      });
    });

    return html.replace(/{{\s*([\w.]+)\s*}}/g, (_match, pathValue) => (
      escapeHtml(renderTemplateValue(getTemplateValue(pathValue, context, root)))
    ));
  };

  return applyProfileImageAdjustments(renderBlock(templateHtml, root), profileImageUrl, imageCss.style);
}

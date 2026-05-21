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

export function renderCvTemplateString(templateHtml: string, cvData: any, options: { watermark?: boolean } = {}) {
  const headline = cvData?.experience?.[0]?.position || cvData?.education?.[0]?.degree || '';
  const location = cvData?.personalInfo?.address || '';
  const profileImageUrl = cvData?.profileImage || '';
  const personalInfo = cvData?.personalInfo || {};
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
  const root = {
    ...cvData,
    headline,
    location,
    profileImageUrl,
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

  return renderBlock(templateHtml, root);
}

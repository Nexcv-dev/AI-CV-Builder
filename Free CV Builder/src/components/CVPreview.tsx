import React, { forwardRef } from 'react';
import { Mail, Phone, MapPin, Calendar, IdCard, User, Globe, Sparkles, Heart, type LucideIcon } from 'lucide-react';
import { CVData } from '../types';
import { getTemplateSurfaceColorFallback, TemplateName } from '../templates';
import DOMPurify from 'dompurify';

interface CVPreviewProps {
  cvData: CVData;
  template: TemplateName;
}

const getValidUrl = (url?: string): string | undefined => {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch (e) {
    try {
      const parsed = new URL(`https://${url}`);
      return parsed.href;
    } catch {
      return undefined;
    }
  }
  return undefined;
};

const domPurifyConfig = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'p', 'br', 'u', 'div', 'span'],
  ALLOWED_ATTR: ['href', 'target', 'rel']
};

const sanitizeRichText = (html: string): string =>
  DOMPurify.sanitize(html || '', domPurifyConfig).replace(/>\s+</g, '><');

const CVPreview = React.memo(forwardRef<HTMLDivElement, CVPreviewProps>(({ cvData, template }, ref) => {
  const {
    personalInfo,
    experience,
    education,
    skills,
    themeColor,
    fontFamily,
    profileImage,
    imageZoom = 1,
    imageX = 0,
    imageY = 0,
    sidebarColor,
    templateSurfaceColor,
    lineSpacing = 1.5,
    sectionGap = 2,
    hiddenSections = [],
  } = cvData;
  const resolvedTemplateSurfaceColor = templateSurfaceColor || getTemplateSurfaceColorFallback(template, { themeColor, sidebarColor });

  // Helper to determine text color based on background luminance
  const getContrastColor = (hexColor: string) => {
    if (!hexColor || hexColor.length < 7) return '#ffffff';
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
  };

  const sidebarTextColor = getContrastColor(resolvedTemplateSurfaceColor);
  const sidebarMutedColor = sidebarTextColor === '#ffffff' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)';
  const startupHeaderTextColor = getContrastColor(resolvedTemplateSurfaceColor);
  const startupHeaderMutedColor = startupHeaderTextColor === '#ffffff' ? 'rgba(236, 253, 245, 0.92)' : 'rgba(15, 23, 42, 0.72)';
  const startupHeaderBackground = templateSurfaceColor
    ? resolvedTemplateSurfaceColor
    : `linear-gradient(135deg, ${themeColor} 0%, #047857 100%)`;

  // Helper to render bars
  const renderBars = (level: number, color: string) => {
    const percentage = (level / 5) * 100;
    return (
      <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    );
  };

  const getFontClass = () => {
    switch (fontFamily) {
      case 'Lora': return 'font-serif';
      case 'Roboto': return 'font-roboto';
      case 'Montserrat': return 'font-montserrat';
      case 'Merriweather': return 'font-merriweather';
      case 'Playfair Display': return 'font-playfair';
      case 'JetBrains Mono': return 'font-mono';
      default: return 'font-sans';
    }
  };

  const renderModernSidebar = () => {
    return (
      <div className="w-full p-[15mm] flex flex-col h-full modern-sidebar" style={{ backgroundColor: resolvedTemplateSurfaceColor, color: sidebarTextColor }}>
        {profileImage && (
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/20 mx-auto mb-6 flex items-center justify-center">
            <img
              src={profileImage}
              alt="Profile"
              className="w-full h-full object-cover"
              style={{ transform: `scale(${imageZoom}) translate(${imageX}px, ${imageY}px)` }}
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-base font-bold uppercase tracking-widest border-b mb-4 pb-1" style={{ color: sidebarTextColor, borderColor: sidebarTextColor === '#ffffff' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)' }}>Details</h2>
          <div className="space-y-4 text-xs" style={{ color: sidebarMutedColor }}>
            {personalInfo.email && (
              <div className="flex items-center gap-2">
                <Mail size={14} className="shrink-0" />
                <span className="break-all whitespace-normal" style={{ wordBreak: 'break-word', textDecoration: 'none' }}>{personalInfo.email}</span>
              </div>
            )}
            {personalInfo.phone && (
              <div className="flex items-center gap-2">
                <Phone size={14} className="shrink-0" />
                <span className="break-all whitespace-normal" style={{ wordBreak: 'break-word', textDecoration: 'none' }}>{personalInfo.phone}</span>
              </div>
            )}
            {personalInfo.address && (
              <div className="flex items-center gap-2">
                <MapPin size={14} className="shrink-0" />
                <span className="wrap-break-word whitespace-normal" style={{ wordBreak: 'break-word' }}>{personalInfo.address}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mb-8 break-inside-avoid print:break-inside-avoid!" data-page-break="avoid">
          {(personalInfo.dob || personalInfo.nic || personalInfo.gender || personalInfo.nationality || personalInfo.religion || personalInfo.maritalStatus) && (
            <>
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-white/20 mb-4 pb-1" style={{ color: sidebarTextColor, borderColor: sidebarTextColor === '#ffffff' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)' }}>Personal Info</h2>
              <div className="space-y-3.5 text-[10px] uppercase tracking-wider font-medium" style={{ color: sidebarMutedColor }}>
                {personalInfo.dob && (
                  <div className="flex items-center gap-2.5">
                    <Calendar size={12} className="shrink-0 opacity-80" />
                    <span className="wrap-break-word" style={{ wordBreak: 'break-word' }}>{personalInfo.dob}</span>
                  </div>
                )}
                {personalInfo.nic && (
                  <div className="flex items-center gap-2.5">
                    <IdCard size={12} className="shrink-0 opacity-80" />
                    <span className="wrap-break-word" style={{ wordBreak: 'break-word' }}>{personalInfo.nic}</span>
                  </div>
                )}
                {personalInfo.gender && (
                  <div className="flex items-center gap-2.5">
                    <User size={12} className="shrink-0 opacity-80" />
                    <span className="wrap-break-word" style={{ wordBreak: 'break-word' }}>{personalInfo.gender}</span>
                  </div>
                )}
                {personalInfo.nationality && (
                  <div className="flex items-center gap-2.5">
                    <Globe size={12} className="shrink-0 opacity-80" />
                    <span className="wrap-break-word" style={{ wordBreak: 'break-word' }}>{personalInfo.nationality}</span>
                  </div>
                )}
                {personalInfo.religion && (
                  <div className="flex items-center gap-2.5">
                    <Sparkles size={12} className="shrink-0 opacity-80" />
                    <span className="wrap-break-word" style={{ wordBreak: 'break-word' }}>{personalInfo.religion}</span>
                  </div>
                )}
                {personalInfo.maritalStatus && (
                  <div className="flex items-center gap-2.5">
                    <Heart size={12} className="shrink-0 opacity-80" />
                    <span className="wrap-break-word" style={{ wordBreak: 'break-word' }}>{personalInfo.maritalStatus}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {skills.length > 0 && (() => {
          const hasCategories = skills.some(skill => skill.category?.trim());

          if (!hasCategories) {
            return (
              <div className="mt-4">
                <h2 className="text-base font-bold uppercase tracking-widest border-b border-white/20 mb-4 pb-1" style={{ color: sidebarTextColor, borderColor: sidebarTextColor === '#ffffff' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)' }}>Skills</h2>
                <div className="space-y-4">
                  {skills.map((skill) => (
                    <div key={skill.id} className="flex flex-col space-y-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: sidebarTextColor }}>{skill.name}</span>
                      {renderBars(skill.level, themeColor)}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          const skillsByCategory = skills.reduce((acc, skill) => {
            const category = skill.category?.trim() || 'Other Skills';
            if (!acc[category]) acc[category] = [];
            acc[category].push(skill);
            return acc;
          }, {} as Record<string, typeof skills>);

          return (
            <div className="mt-4">
              <h2 className="text-base font-bold uppercase tracking-widest border-b border-white/20 mb-4 pb-1" style={{ color: sidebarTextColor, borderColor: sidebarTextColor === '#ffffff' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)' }}>Skills</h2>
              <div className="space-y-6">
                {Object.entries(skillsByCategory).map(([category, catSkills]) => (
                  <div key={category} className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2" style={{ color: sidebarTextColor }}>{category}</h3>
                    <div className="space-y-4">
                      {catSkills.map((skill) => (
                        <div key={skill.id} className="flex flex-col space-y-1.5">
                          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: sidebarTextColor }}>{skill.name}</span>
                          {renderBars(skill.level, themeColor)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {cvData.languages && cvData.languages.length > 0 && (
          <div className="mt-8">
            <h2 className="text-base font-bold uppercase tracking-widest border-b border-white/20 mb-4 pb-1" style={{ color: sidebarTextColor, borderColor: sidebarTextColor === '#ffffff' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)' }}>Languages</h2>
            <div className="space-y-3">
              {cvData.languages.map((lang) => (
                <div key={lang.id} className="flex justify-between items-center text-sm">
                  <span className="font-semibold" style={{ color: sidebarTextColor }}>{lang.name}</span>
                  <span className="text-xs" style={{ color: sidebarMutedColor }}>{lang.proficiency}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSection = (sectionKey: string) => {
    if (hiddenSections.includes(sectionKey)) return null;
    const isPro = template === 'professional';
    const isModern = template === 'modern';
    const isTimeline = template === 'timeline';
    const isMin = template === 'minimalist';
    const isStartup = template === 'startup';

    const SectionHeader = ({ title }: { title: string }) => (
      isStartup ? (
        <h2 className="startup-section-title mb-4 inline-block text-xl font-black uppercase tracking-[0.05em]" style={{ color: themeColor }}>
          {title}
        </h2>
      ) : isTimeline || isMin ? (
        <div className="mb-4 flex items-center gap-3">
          <h2 className={`${isMin ? 'text-[13px] tracking-[0.15em]' : 'text-[11px] tracking-[0.22em]'} shrink-0 font-black uppercase`} style={{ color: themeColor }}>
            {title}
          </h2>
          {(!isMin || !['personalDetails', 'skills', 'projects', 'courses', 'awards', 'languages', 'references'].includes(sectionKey)) && (
            <div className="h-px flex-1 bg-gray-200" />
          )}
        </div>
      ) : (
        <h2
          className={`${isPro ? 'text-sm' : 'text-lg'} font-bold uppercase tracking-widest border-b-2 mb-4 pb-1`}
          style={{ color: themeColor, borderColor: themeColor }}
        >
          {title}
        </h2>
      )
    );

    const SectionWrapper = ({ children }: { children: React.ReactNode }) => (
      <section data-page-break="avoid" style={{ marginBottom: `${sectionGap}rem`, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        {children}
      </section>
    );

    const ProseContent = ({ html, className = '' }: { html: string, className?: string }) => (
      <div
        className={`cv-preview-rich-text text-sm text-gray-700 prose prose-sm max-w-none prose-p:my-0 whitespace-pre-wrap wrap-break-word ${className}`}
        style={{ lineHeight: lineSpacing }}
        dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }}
      />
    );

    const GridRow = ({ dateNode, contentNode }: { dateNode: React.ReactNode, contentNode: React.ReactNode }) => {
      if (isStartup) {
        return (
          <div className="relative pl-5" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <div className="absolute bottom-0 left-0 top-2 w-0.5" style={{ backgroundColor: `${themeColor}22` }} />
            <div className="absolute -left-[5px] top-1.5 h-3 w-3 rounded-full shadow-[0_0_0_4px_white]" style={{ backgroundColor: themeColor }} />
            {contentNode}
          </div>
        );
      }
      const colClass = isMin ? 'grid-cols-1' : (isTimeline ? 'grid-cols-[104px_1fr]' : (isPro ? 'grid-cols-[114px_1fr]' : 'grid-cols-[130px_1fr]'));
      const dateClass = isTimeline ? 'text-[11px] text-gray-500 font-black uppercase tracking-wider pt-0.5' : (isPro ? 'text-xs text-gray-500 font-bold uppercase pt-0.5' : 'text-sm text-gray-500 font-medium pt-0.5');

      if (isMin) {
        return (
          <div className="flex flex-col mb-4" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            {contentNode}
          </div>
        );
      }
      return (
        <div className={`grid ${colClass} gap-4`} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className={dateClass}>{dateNode}</div>
          <div className={isTimeline ? 'relative border-l border-gray-200 pl-5' : ''}>
            {isTimeline && <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white" style={{ backgroundColor: themeColor }} />}
            {contentNode}
          </div>
        </div>
      );
    };

    switch (sectionKey) {
      case 'summary':
        if (!personalInfo.summary) return null;
        return (
          <SectionWrapper key="summary">
            <SectionHeader title={isStartup ? 'About Me' : (isPro ? 'Professional Summary' : (isMin ? 'Profile' : 'Profile'))} />
            <ProseContent html={personalInfo.summary} className={isPro ? 'ml-[130px]' : ''} />
          </SectionWrapper>
        );

      case 'personalDetails':
        if (isModern || !(personalInfo.dob || personalInfo.nic || personalInfo.gender || personalInfo.nationality || personalInfo.religion || personalInfo.maritalStatus)) return null;
        if (isStartup) {
          const detailItems: [string, string, LucideIcon][] = [
            ['Date of Birth', personalInfo.dob, Calendar],
            ['NIC Number', personalInfo.nic, IdCard],
            ['Gender', personalInfo.gender, User],
            ['Marital Status', personalInfo.maritalStatus, Heart],
            ['Nationality', personalInfo.nationality, Globe],
            ['Religion', personalInfo.religion, Sparkles],
          ];
          const details = detailItems.filter(([, value]) => value);

          return (
            <SectionWrapper key="personalDetails">
              <SectionHeader title="Personal Details" />
              <div className="mt-2 grid grid-cols-2 gap-x-5 gap-y-2.5 text-sm">
                {details.map(([label, value, Icon]) => (
                  <div key={label} className="border-b border-gray-100 pb-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-gray-500">
                      <Icon size={13} strokeWidth={2.1} />
                      <span>{label}:</span>
                    </div>
                    <div className="mt-0.5 font-semibold text-gray-800 wrap-break-word">{value}</div>
                  </div>
                ))}
              </div>
            </SectionWrapper>
          );
        }
        return (
          <SectionWrapper key="personalDetails">
            <SectionHeader title={isPro ? 'Personal Information' : 'Personal Details'} />
            <div className={`grid ${isMin ? 'grid-cols-1' : 'grid-cols-2'} gap-x-12 gap-y-2 text-sm ${isPro ? 'ml-[130px]' : ''} ${isTimeline ? 'text-[13px]' : ''}`}>
              {personalInfo.dob && <div className="flex justify-between border-b border-gray-100 pb-1"><span className="font-semibold text-gray-600">Date of Birth:</span><span className="text-gray-800">{personalInfo.dob}</span></div>}
              {personalInfo.nic && <div className="flex justify-between border-b border-gray-100 pb-1"><span className="font-semibold text-gray-600">NIC{isPro ? '' : ' Number'}:</span><span className="text-gray-800">{personalInfo.nic}</span></div>}
              {personalInfo.gender && <div className="flex justify-between border-b border-gray-100 pb-1"><span className="font-semibold text-gray-600">Gender:</span><span className="text-gray-800">{personalInfo.gender}</span></div>}
              {personalInfo.maritalStatus && <div className="flex justify-between border-b border-gray-100 pb-1"><span className="font-semibold text-gray-600">Marital Status:</span><span className="text-gray-800">{personalInfo.maritalStatus}</span></div>}
              {personalInfo.nationality && <div className="flex justify-between border-b border-gray-100 pb-1"><span className="font-semibold text-gray-600">Nationality:</span><span className="text-gray-800">{personalInfo.nationality}</span></div>}
              {personalInfo.religion && <div className="flex justify-between border-b border-gray-100 pb-1"><span className="font-semibold text-gray-600">Religion:</span><span className="text-gray-800">{personalInfo.religion}</span></div>}
            </div>
          </SectionWrapper>
        );

      case 'experience':
        if (experience.length === 0) return null;
        return (
          <SectionWrapper key="experience">
            <SectionHeader title="Experience" />
            <div className="space-y-6">
              {experience.map((exp) => {
                if (isModern || isMin) {
                  return (
                    <div key={exp.id} data-page-break="avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <h3 className="text-base font-bold text-gray-900">{exp.position || 'Position'}</h3>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium" style={{ color: themeColor }}>{exp.company || 'Company'}</span>
                        <span className="text-xs text-gray-500 font-medium">{exp.startDate} {exp.startDate && exp.endDate ? '—' : ''} {exp.endDate}</span>
                      </div>
                      {exp.description && <ProseContent html={exp.description} />}
                    </div>
                  );
                }
                const dateNode = isPro ? (
                  <>{exp.startDate} <br /> {exp.startDate && exp.endDate ? '—' : ''} <br /> {exp.endDate}</>
                ) : (
                  <>{exp.startDate} {exp.startDate && exp.endDate ? '—' : ''} {exp.endDate}</>
                );
                const contentNode = (
                  <>
                    <h3 className={`${isStartup ? 'text-lg leading-tight' : 'text-base'} font-bold text-gray-900`}>{exp.position || 'Position'}</h3>
                    <div className={isStartup ? "mt-1 mb-2 flex items-center gap-2 text-sm font-bold" : (isPro ? "text-sm font-medium mb-1.5" : "text-sm font-medium text-gray-700 mb-2")} style={isStartup || isPro ? { color: themeColor } : {}}>
                      <span>{exp.company || 'Company'}</span>
                      {isStartup && (exp.startDate || exp.endDate) && <span className="h-1 w-1 rounded-full bg-gray-300" />}
                      {isStartup && <span className="text-xs font-semibold text-gray-400">{exp.startDate} {exp.startDate && exp.endDate ? '—' : ''} {exp.endDate}</span>}
                    </div>
                    {exp.description && <ProseContent html={exp.description} />}
                  </>
                );
                return <GridRow key={exp.id} dateNode={dateNode} contentNode={contentNode} />;
              })}
            </div>
          </SectionWrapper>
        );

      case 'education':
        if (education.length === 0) return null;
        return (
          <SectionWrapper key="education">
            <SectionHeader title="Education" />
            <div className="space-y-6">
              {education.map((edu) => {
                if (isModern || isMin) {
                  return (
                    <div key={edu.id} data-page-break="avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <h3 className="text-base font-bold text-gray-900">{edu.degree || 'Degree'}</h3>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">{edu.institution || 'Institution'}</span>
                        <span className="text-xs text-gray-500 font-medium">{edu.startDate} {edu.startDate && edu.endDate ? '—' : ''} {edu.endDate}</span>
                      </div>
                      {edu.description && <ProseContent html={edu.description} />}
                    </div>
                  );
                }
                const dateNode = isPro ? (
                  <>{edu.startDate} <br /> {edu.startDate && edu.endDate ? '—' : ''} <br /> {edu.endDate}</>
                ) : (
                  <>{edu.startDate} {edu.startDate && edu.endDate ? '—' : ''} {edu.endDate}</>
                );
                const contentNode = (
                  <>
                    <h3 className={`${isStartup ? 'text-sm' : 'text-base'} font-bold text-gray-900`}>{edu.degree || 'Degree'}</h3>
                    <div className={isStartup ? "mt-1 text-xs font-medium text-gray-500" : (isPro ? "text-sm font-medium mb-1.5" : "text-sm text-gray-700 mb-1")} style={isPro ? { color: themeColor } : {}}>{edu.institution || 'Institution'}</div>
                    {edu.description && <ProseContent html={edu.description} />}
                  </>
                );
                if (isStartup) {
                  return (
                    <div key={edu.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      {(edu.startDate || edu.endDate) && (
                        <div className="mb-2 inline-block rounded-full border px-3 py-1 text-xs font-bold" style={{ backgroundColor: `${themeColor}12`, borderColor: `${themeColor}44`, color: themeColor }}>
                          {edu.startDate} {edu.startDate && edu.endDate ? '—' : ''} {edu.endDate}
                        </div>
                      )}
                      {contentNode}
                    </div>
                  );
                }
                return <GridRow key={edu.id} dateNode={dateNode} contentNode={contentNode} />;
              })}
            </div>
          </SectionWrapper>
        );

      case 'skills': {
        if (isModern || skills.length === 0) return null;
        const hasCategories = skills.some(skill => skill.category?.trim());
        const renderChips = (skillList: typeof skills) => (
          <div className="flex flex-wrap gap-2">
            {skillList.map((skill) => (
              <span key={skill.id} className={`font-semibold rounded-md ${isStartup ? 'border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 shadow-sm first:bg-gray-900 first:text-white first:border-gray-900' : `bg-gray-100 text-gray-700 shadow-sm border border-gray-200 ${isPro || isTimeline || isMin ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5'}`}`} style={{ pageBreakInside: 'avoid' }}>
                {skill.name}
              </span>
            ))}
          </div>
        );

        if (isPro) {
          const skillsByCategory = hasCategories
            ? skills.reduce((acc, skill) => {
              const category = skill.category?.trim() || 'Core Setup';
              if (!acc[category]) acc[category] = [];
              acc[category].push(skill);
              return acc;
            }, {} as Record<string, typeof skills>)
            : { 'Core Setup': skills };

          return (
            <SectionWrapper key="skills">
              <SectionHeader title="Skills & Expertise" />
              <div className="space-y-4">
                {Object.entries(skillsByCategory).map(([category, catSkills]) => (
                  <div key={category} className="grid grid-cols-[114px_1fr] gap-4">
                    <div className="text-xs text-gray-500 font-bold uppercase pt-0.5">{category}</div>
                    {renderChips(catSkills)}
                  </div>
                ))}
              </div>
            </SectionWrapper>
          );
        }

        if (isStartup) {
          return (
            <SectionWrapper key="skills">
              <SectionHeader title="Expertise" />
              {renderChips(skills)}
            </SectionWrapper>
          );
        }

        if (isTimeline || isMin) {
          const skillsByCategory = hasCategories
            ? skills.reduce((acc, skill) => {
              const category = skill.category?.trim() || (isMin ? 'Core Expertise' : 'Core Skills');
              if (!acc[category]) acc[category] = [];
              acc[category].push(skill);
              return acc;
            }, {} as Record<string, typeof skills>)
            : { [isMin ? 'Core Expertise' : 'Core Skills']: skills };

          return (
            <SectionWrapper key="skills">
              <SectionHeader title="Skills" />
              <div className="grid gap-3">
                {Object.entries(skillsByCategory).map(([category, catSkills]) => (
                  <div key={category} className={isMin ? "space-y-2" : "grid grid-cols-[104px_1fr] gap-4"}>
                    <div className={isMin ? "text-[11px] font-black uppercase tracking-wider text-gray-700" : "pt-1 text-[11px] font-black uppercase tracking-wider text-gray-500"}>{category}</div>
                    {renderChips(catSkills)}
                  </div>
                ))}
              </div>
            </SectionWrapper>
          );
        }

        if (!hasCategories) {
          return (
            <SectionWrapper key="skills">
              <SectionHeader title="Skills" />
              {renderChips(skills)}
            </SectionWrapper>
          );
        }

        const skillsByCategory = skills.reduce((acc, skill) => {
          const category = skill.category?.trim() || 'Other Skills';
          if (!acc[category]) acc[category] = [];
          acc[category].push(skill);
          return acc;
        }, {} as Record<string, typeof skills>);

        return (
          <SectionWrapper key="skills">
            <SectionHeader title="Skills" />
            <div className="space-y-5">
              {Object.entries(skillsByCategory).map(([category, catSkills]) => (
                <div key={category} className="space-y-2">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">{category}</h3>
                  {renderChips(catSkills)}
                </div>
              ))}
            </div>
          </SectionWrapper>
        );
      }

      case 'projects':
        if (!cvData.projects || cvData.projects.length === 0) return null;
        return (
          <SectionWrapper key="projects">
            <SectionHeader title={isPro ? 'Key Projects' : 'Projects'} />
            <div className="space-y-6">
              {cvData.projects.map((proj) => {
                const linkNode = proj.link ? (
                  <a href={getValidUrl(proj.link)} target="_blank" rel="noopener noreferrer" className={isPro ? "hover:underline" : "text-sm font-normal underline hover:text-gray-900"} style={{ color: themeColor }}>
                    {isModern || isPro || isMin ? (isModern || isMin ? 'View Project' : 'Link') : 'View Project'}
                  </a>
                ) : null;

                if (isModern || isMin) {
                  return (
                    <div key={proj.id} data-page-break="avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="text-base font-bold text-gray-900">{proj.name || 'Project Name'}</h3>
                        {linkNode && <span className="text-xs font-medium">{linkNode}</span>}
                      </div>
                      {proj.description && <ProseContent html={proj.description} />}
                    </div>
                  );
                }
                const contentNode = (
                  <>
                    <h3 className={`text-base font-bold text-gray-900 ${isPro ? 'mb-1.5' : ''}`}>{proj.name || 'Project Name'}</h3>
                    {proj.description && <ProseContent html={proj.description} className={isPro ? '' : 'mt-1'} />}
                  </>
                );
                return <GridRow key={proj.id} dateNode={linkNode} contentNode={contentNode} />;
              })}
            </div>
          </SectionWrapper>
        );

      case 'courses':
        if (!cvData.courses || cvData.courses.length === 0) return null;
        return (
          <SectionWrapper key="courses">
            <SectionHeader title={isPro ? 'Certifications & Courses' : (isModern || isMin ? 'Courses & Certifications' : 'Courses')} />
            <div className={isPro || isModern || isMin ? "space-y-4" : "space-y-6"}>
              {cvData.courses.map((course) => {
                if (isModern || isMin) {
                  return (
                    <div key={course.id} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <h3 className="text-base font-bold text-gray-900">{course.name || 'Course Name'}</h3>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">{course.institution || 'Institution'}</span>
                        <span className="text-xs text-gray-500 font-medium">{course.startDate} {course.startDate && course.endDate ? '—' : ''} {course.endDate}</span>
                      </div>
                    </div>
                  );
                }
                const dateNode = isPro ? (
                  <>{course.startDate} <br /> {course.endDate ? '—' : ''} <br /> {course.endDate}</>
                ) : (
                  <>{course.startDate} {course.startDate && course.endDate ? '—' : ''} {course.endDate}</>
                );
                const contentNode = (
                  <>
                    <h3 className={isPro ? "text-sm font-bold text-gray-900" : "text-base font-bold text-gray-900"}>{course.name || 'Course Name'}</h3>
                    {isStartup && (course.startDate || course.endDate) && (
                      <div className="mt-1 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold" style={{ borderColor: `${themeColor}44`, backgroundColor: `${themeColor}12`, color: themeColor }}>
                        {course.startDate} {course.startDate && course.endDate ? '—' : ''} {course.endDate}
                      </div>
                    )}
                    <div className={isPro ? "text-xs font-medium text-gray-600 mt-0.5" : "text-sm text-gray-700 mb-1"}>{course.institution || 'Institution'}</div>
                  </>
                );
                return <GridRow key={course.id} dateNode={dateNode} contentNode={contentNode} />;
              })}
            </div>
          </SectionWrapper>
        );

      case 'awards':
        if (!cvData.awards || cvData.awards.length === 0) return null;
        return (
          <SectionWrapper key="awards">
            <SectionHeader title={isModern || isMin ? 'Awards & Honors' : 'Awards'} />
            <div className={isPro || isModern || isMin ? "space-y-4" : "space-y-6"}>
              {cvData.awards.map((award) => {
                if (isModern || isMin) {
                  return (
                    <div key={award.id} data-page-break="avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <h3 className="text-base font-bold text-gray-900">{award.name || 'Award Name'}</h3>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">{award.issuer || 'Issuer'}</span>
                        <span className="text-xs text-gray-500 font-medium">{award.date}</span>
                      </div>
                    </div>
                  );
                }
                const contentNode = (
                  <>
                    <h3 className={isPro ? "text-sm font-bold text-gray-900" : "text-base font-bold text-gray-900"}>{award.name || (isPro ? 'Award Title' : 'Award Name')}</h3>
                    {isStartup && award.date && (
                      <div className="mt-1 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold" style={{ borderColor: `${themeColor}44`, backgroundColor: `${themeColor}12`, color: themeColor }}>
                        {award.date}
                      </div>
                    )}
                    <div className={isPro ? "text-xs font-medium text-gray-600 mt-0.5" : "text-sm text-gray-700 mb-1"}>{award.issuer || 'Issuer'}</div>
                  </>
                );
                return <GridRow key={award.id} dateNode={award.date} contentNode={contentNode} />;
              })}
            </div>
          </SectionWrapper>
        );

      case 'languages':
        if (isModern || !cvData.languages || cvData.languages.length === 0) return null;
        return (
          <SectionWrapper key="languages">
            <SectionHeader title="Languages" />
            {isStartup ? (
              <div className="space-y-3">
                {cvData.languages.map((lang) => (
                  <div key={lang.id} data-page-break="avoid" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div className="mb-1 flex justify-between text-sm font-bold text-gray-800">
                      <span>{lang.name}</span>
                      <span style={{ color: themeColor }}>{lang.proficiency}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-200">
                      <div className="h-1.5 rounded-full" style={{ width: '78%', backgroundColor: themeColor }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : isTimeline ? (
              <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
                {cvData.languages.map((lang) => (
                  <div key={lang.id} data-page-break="avoid" className="min-w-0" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <span className="font-bold text-gray-800">{lang.name}</span>
                    <span className="ml-1.5 text-xs text-gray-500">{lang.proficiency}</span>
                  </div>
                ))}
              </div>
            ) : isPro ? (
              <div className="grid grid-cols-[114px_1fr] gap-4">
                <div className="text-xs text-gray-500 font-bold uppercase pt-0.5">Spoken</div>
                <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-800">
                  {cvData.languages.map((lang) => (
                    <span key={lang.id}>
                      {lang.name} <span className="text-gray-400 font-normal">({lang.proficiency})</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : isMin ? (
              <div className="flex flex-col gap-2 text-sm">
                {cvData.languages.map((lang) => (
                  <div key={lang.id} className="flex justify-between border-b border-gray-50 pb-1">
                    <span className="font-semibold text-gray-700">{lang.name}</span>
                    <span className="text-gray-500">{lang.proficiency}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-x-8 gap-y-3">
                {cvData.languages.map((language) => (
                  <div key={language.id} data-page-break="avoid" className="flex items-baseline gap-2.5 min-w-0" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <span className="text-sm font-semibold text-gray-700 truncate">{language.name}</span>
                    <span className="text-xs text-gray-500 shrink-0">{language.proficiency}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionWrapper>
        );

      case 'references':
        if (!cvData.references || cvData.references.length === 0) return null;
        return (
          <SectionWrapper key="references">
            <SectionHeader title="References" />
            {isPro ? (
              <div className="grid grid-cols-[114px_1fr] gap-4">
                <div className="text-xs text-gray-500 font-bold uppercase pt-0.5">Contacts</div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {cvData.references.map((reference) => (
                    <div key={reference.id} data-page-break="avoid" className="text-xs" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <h3 className="text-sm font-bold text-gray-900">{reference.name || 'Reference Name'}</h3>
                      {(reference.position || reference.company) && (
                        <div className="font-medium text-gray-600 mt-0.5">
                          {[reference.position, reference.company].filter(Boolean).join(', ')}
                        </div>
                      )}
                      <div className="mt-1 space-y-0.5 text-gray-500">
                        {reference.email && <div>{reference.email}</div>}
                        {reference.phone && <div>{reference.phone}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`grid gap-x-10 gap-y-4 ${isModern || isMin ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {cvData.references.map((reference) => (
                  <div key={reference.id} data-page-break="avoid" className="text-sm" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h3 className="font-bold text-gray-900">{reference.name || 'Reference Name'}</h3>
                    {(reference.position || reference.company) && (
                      <div className="text-gray-600 mt-0.5">
                        {[reference.position, reference.company].filter(Boolean).join(', ')}
                      </div>
                    )}
                    <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                      {reference.email && <div>{reference.email}</div>}
                      {reference.phone && <div>{reference.phone}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionWrapper>
        );

      default:
        return null;
    }
  };


  return (
    <div ref={ref} className={`${getFontClass()} print:p-0`}>
      <style>
        {`
          .cv-preview-surface,
          .cv-preview-surface * {
            max-width: 100%;
            overflow-wrap: anywhere;
            word-break: break-word;
          }
          .cv-preview-surface a {
            word-break: break-all;
          }
          .cv-preview-rich-text,
          .cv-preview-rich-text * {
            overflow-wrap: anywhere;
            word-break: break-word;
          }
          @media print {
            .page-break {
              page-break-after: always !important;
              break-after: page !important;
            }
            body {
              margin: 0 !important;
              padding: 0 !important;
            }
          }
        `}
      </style>
      <div
        className={`cv-preview-surface bg-white w-[210mm] min-h-[297mm] shadow-2xl mb-8 mx-auto box-border overflow-hidden flex flex-col print:shadow-none print:mb-0 page-break relative`}
        style={{
          minWidth: '210mm',
          backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 296.5mm, #e5e7eb 296.5mm, #e5e7eb 297mm)',
          backgroundSize: '100% 297mm'
        }}
      >
        {/* Visual Page Indicators for Preview */}
        <div className="absolute inset-0 pointer-events-none print:hidden overflow-hidden">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute w-full border-t-2 border-blue-400 border-dashed flex items-center justify-end pr-4"
              style={{
                top: `${(i + 1) * 297}mm`,
                opacity: 0.4
              }}
            >
              <span className="bg-blue-400 text-white text-[10px] px-2 py-0.5 rounded-b-md font-bold uppercase tracking-wider">
                Page {i + 1} End
              </span>
            </div>
          ))}
        </div>
        {template === 'modern' ? (
          <div className="w-full bg-white modern-template-container flex flex-row items-stretch min-h-[297mm]">
            <div className="w-[30%] shrink-0">
              {renderModernSidebar()}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 w-[70%] p-[15mm] main-content-area">
              <header className="mb-10 mt-12 relative z-20">
                <h1 className="text-4xl font-bold uppercase tracking-widest mb-2 wrap-break-word" style={{ color: themeColor }}>
                  {personalInfo.fullName || 'Your Name'}
                </h1>
                <div className="w-16 h-1 mb-3" style={{ backgroundColor: themeColor }}></div>
              </header>

              <div className="modern-sections-container">
                {(cvData.sectionOrder || []).map(renderSection)}
              </div>
            </div>
          </div>
        ) : template === 'startup' ? (
          <div className="min-h-[297mm] bg-white">
            <style>{`
              .startup-section-title { position: relative; }
              .startup-section-title::after {
                content: "";
                position: absolute;
                left: 0;
                bottom: -5px;
                width: 50%;
                height: 3px;
                border-radius: 9999px;
                background: ${themeColor};
                opacity: 0.65;
              }
            `}</style>
            <header className="relative overflow-hidden px-[20mm] pb-[25mm] pt-[15mm]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 75%, 0 100%)', background: startupHeaderBackground, color: startupHeaderTextColor }}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)', backgroundSize: '24px 24px' }} />
              <div className="relative z-10 pr-44">
                <h1 className="text-5xl font-extrabold tracking-tight wrap-break-word">{personalInfo.fullName || 'Your Name'}</h1>
                <div className="mt-2 text-lg font-semibold uppercase tracking-wide" style={{ color: startupHeaderMutedColor }}>
                  {experience[0]?.position || 'Professional Title'}
                </div>
                <div className="mt-6 space-y-2 text-sm font-medium" style={{ color: startupHeaderMutedColor }}>
                  {personalInfo.email && <div className="flex items-center gap-3"><Mail size={16} /><span style={{ textDecoration: 'none' }}>{personalInfo.email}</span></div>}
                  {personalInfo.phone && <div className="flex items-center gap-3"><Phone size={16} /><span>{personalInfo.phone}</span></div>}
                  {personalInfo.address && <div className="flex items-center gap-3"><MapPin size={16} /><span>{personalInfo.address}</span></div>}
                </div>
              </div>
            </header>

            {profileImage && (
              <div className="absolute right-[20mm] top-[15mm] z-20 h-36 w-36 overflow-hidden rounded-full border-4 border-white shadow-xl">
                <img
                  src={profileImage}
                  alt="Profile"
                  className="h-full w-full object-cover"
                  style={{ transform: `scale(${imageZoom}) translate(${imageX}px, ${imageY}px)` }}
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            <div className="relative z-10 -mt-4 flex gap-10 px-[20mm] pb-[15mm]">
              <div className="w-[60%] space-y-8">
                {(cvData.sectionOrder || [])
                  .filter(key => ['personalDetails', 'summary', 'experience'].includes(key))
                  .map(renderSection)}
              </div>
              <div className="mt-16 w-[40%] space-y-8">
                {(cvData.sectionOrder || [])
                  .filter(key => ['education', 'skills', 'projects', 'courses', 'awards', 'languages', 'references'].includes(key))
                  .map(renderSection)}
              </div>
            </div>
          </div>
        ) : template === 'professional' ? (
          <div className="min-h-[297mm] flex flex-col bg-white">
            <div className="w-full h-2" style={{ backgroundColor: themeColor }}></div>
            <div className="p-[20mm] pt-[15mm]">
              <header className="mb-10 flex border-b-2 border-gray-100 pb-6">
                <div className="flex-1">
                  <h1 className="text-[2.4rem] leading-tight font-extrabold tracking-tight mb-2 text-gray-900 wrap-break-word">
                    {personalInfo.fullName || 'Your Name'}
                  </h1>
                  <div className="flex flex-col gap-1 text-sm font-medium mt-4">
                    {personalInfo.email && <div className="text-gray-600">{personalInfo.email}</div>}
                    {personalInfo.phone && <div className="text-gray-600">{personalInfo.phone}</div>}
                    {personalInfo.address && <div className="text-gray-500">{personalInfo.address}</div>}
                  </div>
                </div>
                {profileImage && (
                  <div className="ml-6 shrink-0">
                    <div className="w-28 h-28 rounded-md overflow-hidden border border-gray-200">
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        style={{ transform: `scale(${imageZoom}) translate(${imageX}px, ${imageY}px)` }}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}
              </header>

              <div className="professional-sections-container">
                {(cvData.sectionOrder || []).map(renderSection)}
              </div>
            </div>
          </div>
        ) : template === 'timeline' ? (
          <div className="p-[18mm] min-h-[297mm] flex flex-col bg-white">
            <header className="mb-9 border-b border-gray-200 pb-6">
              <div className="flex items-start justify-between gap-8">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 h-1.5 w-16 rounded-full" style={{ backgroundColor: themeColor }} />
                  <h1 className="text-[2.45rem] font-black leading-none tracking-tight text-gray-950 wrap-break-word">
                    {personalInfo.fullName || 'Your Name'}
                  </h1>
                  <div className="mt-4 flex flex-col gap-0.5 text-[12px] font-medium leading-5 text-gray-500">
                    {[personalInfo.email, personalInfo.phone, personalInfo.address]
                      .filter(Boolean)
                      .map((item, i) => (
                        <span key={i} className="wrap-break-word" style={{ wordBreak: 'break-word', textDecoration: 'none' }}>{item}</span>
                      ))
                    }
                  </div>
                </div>
                {profileImage && (
                  <div className="shrink-0">
                    <div className="h-28 w-28 rounded-full overflow-hidden border-[3px] border-white shadow-[0_0_0_1px_rgba(229,231,235,1)] flex items-center justify-center">
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        style={{ transform: `scale(${imageZoom}) translate(${imageX}px, ${imageY}px)` }}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </header>

            <div className="timeline-sections-container">
              {(cvData.sectionOrder || []).map(renderSection)}
            </div>
          </div>
        ) : template === 'minimalist' ? (
          <div className="p-[15mm] pt-[15mm] min-h-[297mm] flex flex-col bg-white">
            <header className="mb-10 text-center flex flex-col items-center border-b-2 border-gray-100 pb-8">
              {profileImage && (
                <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.1)] mb-5 flex items-center justify-center">
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    style={{ transform: `scale(${imageZoom}) translate(${imageX}px, ${imageY}px)` }}
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <h1 className="text-4xl font-bold tracking-tight mb-3 text-gray-900" style={{ fontFamily: fontFamily === 'Inter' ? 'Lora, serif' : undefined }}>
                {personalInfo.fullName || 'Your Name'}
              </h1>
              <div className="text-[13px] text-gray-600 font-medium flex flex-wrap justify-center gap-x-4 gap-y-1">
                {personalInfo.email && <span style={{ textDecoration: 'none' }}>{personalInfo.email}</span>}
                {personalInfo.phone && <span>{personalInfo.phone}</span>}
                {personalInfo.address && <span>{personalInfo.address}</span>}
              </div>
            </header>

            <div className="grid grid-cols-[1fr_250px] gap-10 relative">
              {/* Vertical Divider */}
              <div className="absolute top-0 bottom-0 left-[calc(100%-250px-20px)] w-px bg-gray-400" />

              <div className="flex flex-col gap-2">
                {(cvData.sectionOrder || [])
                  .filter(key => !['personalDetails', 'skills', 'projects', 'courses', 'awards', 'languages', 'references'].includes(key))
                  .map(renderSection)}
              </div>

              <div className="flex flex-col gap-6">
                {(cvData.sectionOrder || [])
                  .filter(key => ['personalDetails', 'skills', 'projects', 'courses', 'awards', 'languages', 'references'].includes(key))
                  .map(renderSection)}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-[20mm] min-h-[297mm] flex flex-col bg-white">
            <header className="mb-8 text-center flex flex-col items-center">
              {profileImage && (
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 mb-4 flex items-center justify-center">
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    style={{ transform: `scale(${imageZoom}) translate(${imageX}px, ${imageY}px)` }}
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <h1 className="text-3xl font-bold uppercase tracking-widest mb-3" style={{ color: themeColor }}>
                {personalInfo.fullName || 'Your Name'}
              </h1>
              <div className="text-sm text-gray-600 flex flex-wrap justify-center gap-x-1 gap-y-1">
                {[personalInfo.email, personalInfo.phone, personalInfo.address]
                  .filter(Boolean)
                  .map((item, i, arr) => (
                    <React.Fragment key={i}>
                      <span style={{ textDecoration: 'none' }}>{item}</span>
                      {i < arr.length - 1 && <span>&nbsp;•&nbsp;</span>}
                    </React.Fragment>
                  ))
                }
              </div>
            </header>

            {cvData.sectionOrder.map(renderSection)}
          </div>
        )}
      </div>
    </div>
  );
}));

export default CVPreview;

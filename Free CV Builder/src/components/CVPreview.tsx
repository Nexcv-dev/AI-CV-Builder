import React, { forwardRef } from 'react';
import { Mail, Phone, MapPin, Calendar, IdCard, User, Globe, Sparkles, Heart } from 'lucide-react';
import { CVData } from '../types';
import DOMPurify from 'dompurify';

interface CVPreviewProps {
  cvData: CVData;
  template: 'classic' | 'modern' | 'professional';
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
    lineSpacing = 1.5,
    sectionGap = 2,
    hiddenSections = [],
  } = cvData;

  // Helper to determine text color based on background luminance
  const getContrastColor = (hexColor: string) => {
    if (!hexColor || hexColor.length < 7) return '#ffffff';
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
  };

  const sidebarTextColor = getContrastColor(sidebarColor);
  const sidebarMutedColor = sidebarTextColor === '#ffffff' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)';

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
      <div className="w-full text-white p-[15mm] flex flex-col h-full modern-sidebar" style={{ backgroundColor: sidebarColor }}>
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

    const SectionHeader = ({ title }: { title: string }) => (
      <h2 
        className={`${isPro ? 'text-sm' : 'text-lg'} font-bold uppercase tracking-widest border-b-2 mb-4 pb-1`} 
        style={{ color: themeColor, borderColor: themeColor }}
      >
        {title}
      </h2>
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
      const colClass = isPro ? 'grid-cols-[114px_1fr]' : 'grid-cols-[130px_1fr]';
      const dateClass = isPro ? 'text-xs text-gray-500 font-bold uppercase pt-0.5' : 'text-sm text-gray-500 font-medium pt-0.5';
      return (
        <div className={`grid ${colClass} gap-4`} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <div className={dateClass}>{dateNode}</div>
          <div>{contentNode}</div>
        </div>
      );
    };

    switch (sectionKey) {
      case 'summary':
        if (!personalInfo.summary) return null;
        return (
          <SectionWrapper key="summary">
            <SectionHeader title={isPro ? 'Professional Summary' : 'Profile'} />
            <ProseContent html={personalInfo.summary} className={isPro ? 'ml-[130px]' : ''} />
          </SectionWrapper>
        );

      case 'personalDetails':
        if (isModern || !(personalInfo.dob || personalInfo.nic || personalInfo.gender || personalInfo.nationality || personalInfo.religion || personalInfo.maritalStatus)) return null;
        return (
          <SectionWrapper key="personalDetails">
            <SectionHeader title={isPro ? 'Personal Information' : 'Personal Details'} />
            <div className={`grid grid-cols-2 gap-x-12 gap-y-2 text-sm ${isPro ? 'ml-[130px]' : ''}`}>
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
                if (isModern) {
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
                    <h3 className="text-base font-bold text-gray-900">{exp.position || 'Position'}</h3>
                    <div className={isPro ? "text-sm font-medium mb-1.5" : "text-sm font-medium text-gray-700 mb-2"} style={isPro ? { color: themeColor } : {}}>{exp.company || 'Company'}</div>
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
                if (isModern) {
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
                    <h3 className="text-base font-bold text-gray-900">{edu.degree || 'Degree'}</h3>
                    <div className={isPro ? "text-sm font-medium mb-1.5" : "text-sm text-gray-700 mb-1"} style={isPro ? { color: themeColor } : {}}>{edu.institution || 'Institution'}</div>
                    {edu.description && <ProseContent html={edu.description} />}
                  </>
                );
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
              <span key={skill.id} className={`font-semibold bg-gray-100 text-gray-700 rounded-md shadow-sm border border-gray-200 ${isPro ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5'}`} style={{ pageBreakInside: 'avoid' }}>
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
                    {isModern || isPro ? (isModern ? 'View Project' : 'Link') : 'View Project'}
                  </a>
                ) : null;

                if (isModern) {
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
            <SectionHeader title={isPro ? 'Certifications & Courses' : (isModern ? 'Courses & Certifications' : 'Courses')} />
            <div className={isPro || isModern ? "space-y-4" : "space-y-6"}>
              {cvData.courses.map((course) => {
                if (isModern) {
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
            <SectionHeader title={isModern ? 'Awards & Honors' : 'Awards'} />
            <div className={isPro || isModern ? "space-y-4" : "space-y-6"}>
              {cvData.awards.map((award) => {
                if (isModern) {
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
            {isPro ? (
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

      default:
        return null;
    }
  };


  return (
    <div ref={ref} className={`${getFontClass()} print:p-0`}>
      <style>
        {`
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
        className={`bg-white w-[210mm] min-h-[297mm] shadow-2xl mb-8 mx-auto box-border overflow-hidden flex flex-col print:shadow-none print:mb-0 page-break relative`}
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

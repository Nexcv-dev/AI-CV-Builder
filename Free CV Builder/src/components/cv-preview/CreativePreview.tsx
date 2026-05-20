import React from 'react';
import { Award, BookOpen, Briefcase, Calendar, Code2, Globe, GraduationCap, Heart, IdCard, Languages, Link2, Mail, MapPin, Phone, Sparkles, User, Users, type LucideIcon } from 'lucide-react';
import { CVData } from '../../types';
import { getValidUrl, sanitizeRichText } from './previewUtils';

interface CreativePreviewProps {
  cvData: CVData;
  resolvedTemplateSurfaceColor: string;
  sidebarTextColor: string;
  sidebarMutedColor: string;
  lineSpacing: number;
  sectionGap: number;
}

type SectionIconKey = 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'courses' | 'awards' | 'languages' | 'references' | 'personalDetails';

const sectionIcons: Record<SectionIconKey, LucideIcon> = {
  summary: Sparkles,
  experience: Briefcase,
  education: GraduationCap,
  skills: Code2,
  projects: Link2,
  courses: BookOpen,
  awards: Award,
  languages: Languages,
  references: Users,
  personalDetails: User,
};

const CreativeSectionHeader = ({ title, iconKey, color }: { title: string; iconKey: SectionIconKey; color: string }) => {
  const Icon = sectionIcons[iconKey];
  return (
    <h2 className="mb-5 flex items-center gap-3 text-[13px] font-black uppercase leading-tight tracking-[0.12em] text-gray-950">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-[0_0_0_5px_rgba(124,58,237,0.10)]" style={{ backgroundColor: color, color: '#ffffff' }}>
        <Icon size={15} strokeWidth={2.4} />
      </span>
      <span>{title}</span>
    </h2>
  );
};

export default function CreativePreview({
  cvData,
  resolvedTemplateSurfaceColor,
  sidebarTextColor,
  sidebarMutedColor,
  lineSpacing,
  sectionGap,
}: CreativePreviewProps) {
  const {
    personalInfo,
    experience,
    education,
    skills,
    profileImage,
    imageZoom = 1,
    imageX = 0,
    imageY = 0,
    hiddenSections = [],
  } = cvData;

  const isVisible = (key: string) => !hiddenSections.includes(key);
  const title = experience[0]?.position || education[0]?.degree || 'Professional Title';
  const personalDetails = [
    ['Date of Birth', personalInfo.dob, Calendar],
    ['NIC', personalInfo.nic, IdCard],
    ['Gender', personalInfo.gender, User],
    ['Marital Status', personalInfo.maritalStatus, Heart],
    ['Nationality', personalInfo.nationality, Globe],
    ['Religion', personalInfo.religion, Sparkles],
  ].filter(([, value]) => value) as [string, string, LucideIcon][];

  const renderRich = (html?: string) => html ? (
    <div
      className="cv-preview-rich-text prose prose-sm max-w-none whitespace-pre-wrap text-[13.5px] text-gray-600 prose-p:my-0 wrap-break-word"
      style={{ lineHeight: lineSpacing }}
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }}
    />
  ) : null;

  const renderMainSection = (key: string) => {
    if (!isVisible(key)) return null;
    const sectionStyle = { marginBottom: `${sectionGap}rem`, pageBreakInside: 'avoid' as const, breakInside: 'avoid' as const };

    switch (key) {
      case 'summary':
        if (!personalInfo.summary) return null;
        return (
          <section key={key} style={sectionStyle}>
            <CreativeSectionHeader title="Profile" iconKey="summary" color={resolvedTemplateSurfaceColor} />
            {renderRich(personalInfo.summary)}
          </section>
        );

      case 'experience':
        if (!experience.length) return null;
        return (
          <section key={key} style={sectionStyle}>
            <CreativeSectionHeader title="Experience" iconKey="experience" color={resolvedTemplateSurfaceColor} />
            <div className="grid gap-6">
              {experience.map((exp) => (
                <article key={exp.id} className="border-l-[3px] pl-5" style={{ borderColor: `${resolvedTemplateSurfaceColor}38`, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
                    <h3 className="text-[17px] font-black leading-snug text-gray-950">{exp.position || 'Position'}</h3>
                    {(exp.startDate || exp.endDate) && <span className="text-[11px] font-extrabold uppercase text-gray-500">{exp.startDate} {exp.startDate && exp.endDate ? '-' : ''} {exp.endDate}</span>}
                  </div>
                  <p className="mb-2 mt-1 text-sm font-bold" style={{ color: resolvedTemplateSurfaceColor }}>{exp.company || 'Company'}</p>
                  {renderRich(exp.description)}
                </article>
              ))}
            </div>
          </section>
        );

      case 'education':
        if (!education.length) return null;
        return (
          <section key={key} style={sectionStyle}>
            <CreativeSectionHeader title="Education" iconKey="education" color={resolvedTemplateSurfaceColor} />
            <div className="grid grid-cols-2 gap-5">
              {education.map((edu) => (
                <article key={edu.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <h3 className="text-[15px] font-black leading-snug text-gray-950">{edu.degree || 'Degree'}</h3>
                  <p className="mb-1 mt-1 text-sm font-bold text-gray-600">{edu.institution || 'Institution'}</p>
                  {(edu.startDate || edu.endDate) && <span className="text-[11px] font-bold" style={{ color: resolvedTemplateSurfaceColor }}>{edu.startDate} {edu.startDate && edu.endDate ? '-' : ''} {edu.endDate}</span>}
                  {renderRich(edu.description)}
                </article>
              ))}
            </div>
          </section>
        );

      case 'projects':
        if (!cvData.projects?.length) return null;
        return (
          <section key={key} style={sectionStyle}>
            <CreativeSectionHeader title="Projects" iconKey="projects" color={resolvedTemplateSurfaceColor} />
            <div className="grid gap-5">
              {cvData.projects.map((project) => (
                <article key={project.id} className="rounded-lg border border-gray-200 p-4" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-[15px] font-black text-gray-950">{project.name || 'Project Name'}</h3>
                    {project.link && <a className="text-[11px] font-bold uppercase" style={{ color: resolvedTemplateSurfaceColor }} href={getValidUrl(project.link)} target="_blank" rel="noopener noreferrer">View Project</a>}
                  </div>
                  {renderRich(project.description)}
                </article>
              ))}
            </div>
          </section>
        );

      case 'courses':
        if (!cvData.courses?.length) return null;
        return (
          <section key={key} style={sectionStyle}>
            <CreativeSectionHeader title="Courses" iconKey="courses" color={resolvedTemplateSurfaceColor} />
            <div className="grid grid-cols-2 gap-4">
              {cvData.courses.map((course) => (
                <article key={course.id} className="rounded-lg bg-gray-50 p-4" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <h3 className="text-[14px] font-black text-gray-950">{course.name || 'Course Name'}</h3>
                  <p className="text-sm font-semibold text-gray-600">{course.institution || 'Institution'}</p>
                  <span className="text-[11px] font-bold text-gray-500">{course.startDate} {course.startDate && course.endDate ? '-' : ''} {course.endDate}</span>
                </article>
              ))}
            </div>
          </section>
        );

      case 'awards':
        if (!cvData.awards?.length) return null;
        return (
          <section key={key} style={sectionStyle}>
            <CreativeSectionHeader title="Awards" iconKey="awards" color={resolvedTemplateSurfaceColor} />
            <div className="grid grid-cols-2 gap-4">
              {cvData.awards.map((award) => (
                <article key={award.id} className="rounded-lg bg-gray-50 p-4" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <h3 className="text-[14px] font-black text-gray-950">{award.name || 'Award Name'}</h3>
                  <p className="text-sm font-semibold text-gray-600">{award.issuer || 'Issuer'}</p>
                  <span className="text-[11px] font-bold" style={{ color: resolvedTemplateSurfaceColor }}>{award.date}</span>
                </article>
              ))}
            </div>
          </section>
        );

      case 'references':
        if (!cvData.references?.length) return null;
        return (
          <section key={key} style={sectionStyle}>
            <CreativeSectionHeader title="References" iconKey="references" color={resolvedTemplateSurfaceColor} />
            <div className="grid grid-cols-2 gap-4">
              {cvData.references.map((reference) => (
                <article key={reference.id} className="rounded-lg border border-gray-200 p-4 text-sm" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                  <h3 className="font-black text-gray-950">{reference.name || 'Reference Name'}</h3>
                  {(reference.position || reference.company) && <p className="text-gray-600">{[reference.position, reference.company].filter(Boolean).join(', ')}</p>}
                  <div className="mt-1 text-xs text-gray-500">
                    {reference.email && <div>{reference.email}</div>}
                    {reference.phone && <div>{reference.phone}</div>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="grid min-h-[297mm] grid-cols-[72mm_1fr] bg-white">
      <aside className="relative p-[18mm_10mm_16mm]" style={{ backgroundColor: resolvedTemplateSurfaceColor, color: sidebarTextColor }}>
        <div className="absolute inset-x-0 top-0 h-[72mm] bg-white/10 [clip-path:polygon(0_0,100%_0,100%_62%,0_100%)]" />
        <div className="relative z-10">
          <div className="mb-[14mm]">
            {profileImage ? (
              <div className="h-[38mm] w-[38mm] overflow-hidden rounded-full border-[2.5mm] border-white/30 bg-white/15">
                <img
                  src={profileImage}
                  alt="Profile"
                  className="h-full w-full object-cover"
                  style={{ transform: `scale(${imageZoom}) translate(${imageX}px, ${imageY}px)` }}
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="h-[38mm] w-[38mm] rounded-full border-[2.5mm] border-white/25 bg-white/15" aria-hidden="true" />
            )}
          </div>

          <section className="mb-9">
            <h2 className="mb-4 text-[13px] font-black uppercase tracking-[0.12em]">Contact</h2>
            <div className="grid gap-3 text-[12px] font-semibold" style={{ color: sidebarMutedColor }}>
              {personalInfo.email && <div className="flex gap-2"><Mail size={14} className="mt-0.5 shrink-0" /><span>{personalInfo.email}</span></div>}
              {personalInfo.phone && <div className="flex gap-2"><Phone size={14} className="mt-0.5 shrink-0" /><span>{personalInfo.phone}</span></div>}
              {personalInfo.address && <div className="flex gap-2"><MapPin size={14} className="mt-0.5 shrink-0" /><span>{personalInfo.address}</span></div>}
            </div>
          </section>

          {isVisible('personalDetails') && personalDetails.length > 0 && (
            <section className="mb-9">
              <h2 className="mb-4 text-[13px] font-black uppercase tracking-[0.12em]">Details</h2>
              <div className="grid gap-3">
                {personalDetails.map(([label, value, Icon]) => (
                  <div key={label} className="flex gap-2">
                    <Icon size={14} className="mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-75">{label}</div>
                      <div className="text-[12px] font-semibold" style={{ color: sidebarMutedColor }}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {isVisible('skills') && skills.length > 0 && (
            <section className="mb-9">
              <h2 className="mb-4 text-[13px] font-black uppercase tracking-[0.12em]">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span key={skill.id} className="inline-flex min-h-8 items-center rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-bold">
                    {skill.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {isVisible('languages') && cvData.languages?.length > 0 && (
            <section>
              <h2 className="mb-4 text-[13px] font-black uppercase tracking-[0.12em]">Languages</h2>
              <div className="grid gap-3">
                {cvData.languages.map((language) => (
                  <div key={language.id} className="flex justify-between gap-3 text-[12px]">
                    <span className="font-bold">{language.name}</span>
                    <span style={{ color: sidebarMutedColor }}>{language.proficiency}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </aside>

      <section className="p-[18mm_15mm_16mm]">
        <header className="mb-12">
          <div className="mb-5 h-1.5 w-[22mm] rounded-full" style={{ backgroundColor: resolvedTemplateSurfaceColor }} />
          <h1 className="text-[37px] font-black leading-none text-gray-950 wrap-break-word">{personalInfo.fullName || 'Your Name'}</h1>
          <p className="mt-3 text-[15px] font-extrabold uppercase tracking-[0.08em]" style={{ color: resolvedTemplateSurfaceColor }}>{title}</p>
        </header>

        {(cvData.sectionOrder || [])
          .filter((key) => !['personalDetails', 'skills', 'languages'].includes(key))
          .map(renderMainSection)}
      </section>
    </div>
  );
}

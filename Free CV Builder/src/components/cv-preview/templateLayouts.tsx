import React from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import { CVData } from '../../types';

type RenderSection = (sectionKey: string) => React.ReactNode;

interface TemplateLayoutProps {
  cvData: CVData;
  renderSection: RenderSection;
}

interface HeaderImageProps {
  profileImage: string;
  imageZoom: number;
  imageX: number;
  imageY: number;
  className: string;
  imageClassName: string;
}

const HeaderImage = ({ profileImage, imageZoom, imageX, imageY, className, imageClassName }: HeaderImageProps) => {
  if (!profileImage) return null;
  return (
    <div className={className}>
      <img
        src={profileImage}
        alt="Profile"
        className={imageClassName}
        style={{ transform: `scale(${imageZoom}) translate(${imageX}px, ${imageY}px)` }}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

export function ModernPreview({ cvData, renderSection, renderModernSidebar, themeColor }: TemplateLayoutProps & { renderModernSidebar: () => React.ReactNode; themeColor: string }) {
  return (
    <div className="w-full bg-white modern-template-container flex flex-row items-stretch min-h-[297mm]">
      <div className="w-[30%] shrink-0">{renderModernSidebar()}</div>

      <div className="flex-1 w-[70%] p-[15mm] main-content-area">
        <header className="mb-10 mt-12 relative z-20">
          <h1 className="text-4xl font-bold uppercase tracking-widest mb-2 wrap-break-word" style={{ color: themeColor }}>
            {cvData.personalInfo.fullName || 'Your Name'}
          </h1>
          <div className="w-16 h-1 mb-3" style={{ backgroundColor: themeColor }} />
        </header>

        <div className="modern-sections-container">
          {(cvData.sectionOrder || []).map(renderSection)}
        </div>
      </div>
    </div>
  );
}

export function StartupPreview({
  cvData,
  renderSection,
  themeColor,
  startupHeaderBackground,
  startupHeaderTextColor,
  startupHeaderMutedColor,
}: TemplateLayoutProps & {
  themeColor: string;
  startupHeaderBackground: string;
  startupHeaderTextColor: string;
  startupHeaderMutedColor: string;
}) {
  const { personalInfo, experience, profileImage, imageZoom = 1, imageX = 0, imageY = 0 } = cvData;

  return (
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

      <HeaderImage
        profileImage={profileImage}
        imageZoom={imageZoom}
        imageX={imageX}
        imageY={imageY}
        className="absolute right-[20mm] top-[15mm] z-20 h-36 w-36 overflow-hidden rounded-full border-4 border-white shadow-xl"
        imageClassName="h-full w-full object-cover"
      />

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
  );
}

export function ProfessionalPreview({ cvData, renderSection, themeColor }: TemplateLayoutProps & { themeColor: string }) {
  const { personalInfo, profileImage, imageZoom = 1, imageX = 0, imageY = 0 } = cvData;

  return (
    <div className="min-h-[297mm] flex flex-col bg-white">
      <div className="w-full h-2" style={{ backgroundColor: themeColor }} />
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
              <HeaderImage
                profileImage={profileImage}
                imageZoom={imageZoom}
                imageX={imageX}
                imageY={imageY}
                className="w-28 h-28 rounded-md overflow-hidden border border-gray-200"
                imageClassName="w-full h-full object-cover"
              />
            </div>
          )}
        </header>

        <div className="professional-sections-container">
          {(cvData.sectionOrder || []).map(renderSection)}
        </div>
      </div>
    </div>
  );
}

export function TimelinePreview({ cvData, renderSection, themeColor }: TemplateLayoutProps & { themeColor: string }) {
  const { personalInfo, profileImage, imageZoom = 1, imageX = 0, imageY = 0 } = cvData;

  return (
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
                ))}
            </div>
          </div>
          {profileImage && (
            <div className="shrink-0">
              <HeaderImage
                profileImage={profileImage}
                imageZoom={imageZoom}
                imageX={imageX}
                imageY={imageY}
                className="h-28 w-28 rounded-full overflow-hidden border-[3px] border-white shadow-[0_0_0_1px_rgba(229,231,235,1)] flex items-center justify-center"
                imageClassName="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </header>

      <div className="timeline-sections-container">
        {(cvData.sectionOrder || []).map(renderSection)}
      </div>
    </div>
  );
}

export function MinimalistPreview({ cvData, renderSection }: TemplateLayoutProps) {
  const { personalInfo, profileImage, imageZoom = 1, imageX = 0, imageY = 0 } = cvData;

  return (
    <div className="min-h-[297mm] bg-white px-[20mm] py-[15mm]">
      <header className="mb-10 text-center flex flex-col items-center border-b-2 border-gray-100 pb-[30px]">
        <HeaderImage
          profileImage={profileImage}
          imageZoom={imageZoom}
          imageX={imageX}
          imageY={imageY}
          className="w-28 h-28 rounded-full overflow-hidden border-[3px] border-white shadow-[0_0_0_1px_rgba(229,231,235,1)] mb-5 flex items-center justify-center"
          imageClassName="w-full h-full object-cover"
        />
        <h1 className="mb-2.5 text-[2.25rem] font-medium leading-[1.1] text-gray-900 wrap-break-word">
          {personalInfo.fullName || 'Your Name'}
        </h1>
        <div className="flex flex-wrap justify-center gap-x-[15px] gap-y-1 text-[13px] font-medium text-gray-600">
          {[personalInfo.email, personalInfo.phone, personalInfo.address]
            .filter(Boolean)
            .map((item, i, arr) => (
              <React.Fragment key={i}>
                <span style={{ textDecoration: 'none' }}>{item}</span>
                {i < arr.length - 1 && <span className="text-gray-400">|</span>}
              </React.Fragment>
            ))}
        </div>
      </header>

      <div className="grid grid-cols-[1fr_250px] gap-10 relative">
        <div className="absolute top-0 bottom-0 left-[calc(100%-250px-20px)] w-px bg-gray-200" />

        <div className="flex flex-col gap-2">
          {(cvData.sectionOrder || [])
            .filter(key => !['personalDetails', 'education', 'skills', 'projects', 'courses', 'awards', 'languages', 'references'].includes(key))
            .map(renderSection)}
        </div>

        <div className="flex flex-col gap-6">
          {(cvData.sectionOrder || [])
            .filter(key => ['personalDetails', 'education', 'skills', 'projects', 'courses', 'awards', 'languages', 'references'].includes(key))
            .map(renderSection)}
        </div>
      </div>
    </div>
  );
}

export function ClassicPreview({ cvData, renderSection, themeColor }: TemplateLayoutProps & { themeColor: string }) {
  const { personalInfo, profileImage, imageZoom = 1, imageX = 0, imageY = 0 } = cvData;

  return (
    <div className="p-[20mm] min-h-[297mm] flex flex-col bg-white">
      <header className="mb-8 text-center flex flex-col items-center">
        <HeaderImage
          profileImage={profileImage}
          imageZoom={imageZoom}
          imageX={imageX}
          imageY={imageY}
          className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 mb-4 flex items-center justify-center"
          imageClassName="w-full h-full object-cover"
        />
        <h1 className="text-3xl font-bold uppercase tracking-widest mb-3" style={{ color: themeColor }}>
          {personalInfo.fullName || 'Your Name'}
        </h1>
        <div className="text-sm text-gray-600 flex flex-wrap justify-center gap-x-1 gap-y-1">
          {[personalInfo.email, personalInfo.phone, personalInfo.address]
            .filter(Boolean)
            .map((item, i, arr) => (
              <React.Fragment key={i}>
                <span style={{ textDecoration: 'none' }}>{item}</span>
                {i < arr.length - 1 && <span>&nbsp;â€¢&nbsp;</span>}
              </React.Fragment>
            ))}
        </div>
      </header>

      {cvData.sectionOrder.map(renderSection)}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import CVPreview from '../components/CVPreview';
import { CVData } from '../types';

/**
 * A dedicated, UI-less route for rendering the CV.
 * Wait for the data to be injected by Puppeteer.
 */
export const PrintView = () => {
  const [cvData, setCvData] = useState<CVData | null>(null);

  useEffect(() => {
    // Puppeteer will inject window.__CV_DATA__ before rendering
    const checkData = () => {
      // @ts-ignore
      if (window.__CV_DATA__) {
        // @ts-ignore
        setCvData(window.__CV_DATA__);
      } else {
        // Fallback or retry
        setTimeout(checkData, 50);
      }
    };
    checkData();
  }, []);

  if (!cvData) {
    return <div style={{ padding: '20px' }}>Loading document for print...</div>;
  }

  // To let puppeteer know when it's safe to print
  // @ts-ignore
  window.__CV_RENDERED__ = true;

  // We explicitly select the template from localStorage if required, 
  // currently we just read it from the cvData object if we store it there, 
  // or it will be injected by Puppeteer.
  // @ts-ignore
  const template = window.__CV_TEMPLATE__ || 'modern';

  return (
    <div style={{ margin: 0, padding: 0, background: 'white' }}>
      <CVPreview 
        cvData={cvData} 
        template={template} 
      />
    </div>
  );
};

export default PrintView;

import React, { forwardRef } from 'react';
import { CVData } from '../types';
import { TemplateName } from '../templates';
import CustomPreview from './cv-preview/CustomPreview';

interface CVPreviewProps {
  cvData: CVData;
  template: TemplateName;
}

const CVPreview = React.memo(forwardRef<HTMLDivElement, CVPreviewProps>(({ cvData, template }, ref) => (
  <CustomPreview key={template} ref={ref} cvData={cvData} template={template} />
)));

CVPreview.displayName = 'CVPreview';

export default CVPreview;

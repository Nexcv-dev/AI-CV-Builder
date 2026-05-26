import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ApiError, apiFetch } from '../../../utils/api';
import type { AdminTemplateItem, AdminTemplateValidationResult } from '../adminTypes';
import { emptyCustomTemplateForm } from '../adminUtils';
import { mergeTemplateValidationResults, validateAdminTemplateMetadata, validateAdminTemplateSource } from '../../../../server-utils/templateValidation';

type TemplateForm = {
  label: string;
  category: string;
  access: 'free' | 'paid';
  thumbnail: string;
  surfaceColorRole: 'none' | 'sidebar' | 'header';
  surfaceColorLabel: string;
  defaultThemeColor: string;
};

type TemplateFileForm = {
  indexHtml: string;
  indexHtmlFileName: string;
  styleCss: string;
  styleCssFileName: string;
  thumbnailDataUrl: string;
  thumbnailFileName: string;
};

const emptyTemplateFileForm: TemplateFileForm = {
  indexHtml: '',
  indexHtmlFileName: '',
  styleCss: '',
  styleCssFileName: '',
  thumbnailDataUrl: '',
  thumbnailFileName: '',
};

const emptyValidationResult: AdminTemplateValidationResult = {
  errors: [],
  warnings: [],
};

const placeholderHtmlForCssOnlyValidation = '<html><body>{{personalInfo.fullName}}</body></html>';
const placeholderCssForHtmlOnlyValidation = '@page { size: A4; } .page { min-height: 297mm; } a { color: {{themeColor}}; }';

const templateFormFromItem = (template: AdminTemplateItem): TemplateForm => ({
  label: template.label,
  category: template.category,
  access: template.access,
  thumbnail: template.thumbnail,
  surfaceColorRole: template.surfaceColorRole || 'none',
  surfaceColorLabel: template.surfaceColorLabel || '',
  defaultThemeColor: template.defaultThemeColor || '#000000',
});

function readTemplateFile(file: File, mode: 'text' | 'dataUrl') {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.onload = () => resolve(String(reader.result || ''));
    if (mode === 'dataUrl') reader.readAsDataURL(file);
    else reader.readAsText(file);
  });
}

export function useAdminTemplates({ enabled }: { enabled: boolean }) {
  const [templates, setTemplates] = useState<AdminTemplateItem[]>([]);
  const [templateCategories, setTemplateCategories] = useState<string[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('all');
  const [templateAccessFilter, setTemplateAccessFilter] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<AdminTemplateItem | null>(null);
  const [templateForm, setTemplateForm] = useState<TemplateForm>({
    label: '',
    category: 'Modern',
    access: 'paid',
    thumbnail: '',
    surfaceColorRole: 'none',
    surfaceColorLabel: '',
    defaultThemeColor: '#000000',
  });
  const [templateFileForm, setTemplateFileForm] = useState<TemplateFileForm>(emptyTemplateFileForm);
  const [templateValidation, setTemplateValidation] = useState<AdminTemplateValidationResult | null>(null);
  const [templateWarningsConfirmed, setTemplateWarningsConfirmed] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [customTemplateForm, setCustomTemplateForm] = useState(emptyCustomTemplateForm);
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let ignore = false;
    setTemplatesLoading(true);

    apiFetch<{ templates: AdminTemplateItem[]; categories: string[] }>('/api/admin/templates')
      .then((data) => {
        if (ignore) return;
        setTemplates(data.templates);
        setTemplateCategories(data.categories);
      })
      .catch((error) => {
        if (!ignore) toast.error(error instanceof Error ? error.message : 'Could not load templates.');
      })
      .finally(() => {
        if (!ignore) setTemplatesLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [enabled]);

  const visibleTemplates = useMemo(() => templates.filter((template) => {
    const query = templateSearch.trim().toLowerCase();
    const matchesSearch = !query || template.label.toLowerCase().includes(query) || template.key.toLowerCase().includes(query);
    const matchesCategory = templateCategoryFilter === 'all' || template.category === templateCategoryFilter;
    const matchesAccess = templateAccessFilter === 'all' || template.access === templateAccessFilter;
    return matchesSearch && matchesCategory && matchesAccess;
  }), [templateAccessFilter, templateCategoryFilter, templateSearch, templates]);

  const openTemplateDetail = (template: AdminTemplateItem) => {
    setSelectedTemplate(template);
    setTemplateForm(templateFormFromItem(template));
    setTemplateFileForm(emptyTemplateFileForm);
    setTemplateValidation(null);
    setTemplateWarningsConfirmed(false);
  };

  const handleValidationError = (error: unknown) => {
    if (error instanceof ApiError && error.data?.validation) {
      setTemplateValidation(error.data.validation);
      const errorCount = error.data.validation.errors?.length || 0;
      const warningCount = error.data.validation.warnings?.length || 0;
      toast.error(errorCount ? `Template has ${errorCount} validation error${errorCount === 1 ? '' : 's'}.` : `Template has ${warningCount} warning${warningCount === 1 ? '' : 's'}.`);
      return true;
    }
    return false;
  };

  const saveSelectedTemplate = async () => {
    if (!selectedTemplate) return;
    const hasFileChanges = Boolean(templateFileForm.indexHtml || templateFileForm.styleCss || templateFileForm.thumbnailDataUrl);
    let preflightValidation: AdminTemplateValidationResult | null = validateAdminTemplateMetadata({
      key: selectedTemplate.key,
      ...templateForm,
    }, { requireThumbnailPath: true });
    if (hasFileChanges) {
      preflightValidation = mergeTemplateValidationResults(preflightValidation, validateAdminTemplateSource({
        indexHtml: templateFileForm.indexHtml || placeholderHtmlForCssOnlyValidation,
        styleCss: templateFileForm.styleCss || placeholderCssForHtmlOnlyValidation,
        thumbnailPresent: true,
      }));
    }
    setTemplateValidation(preflightValidation);
    if (preflightValidation.errors.length) {
      toast.error(`Template has ${preflightValidation.errors.length} validation error${preflightValidation.errors.length === 1 ? '' : 's'}.`);
      return;
    }
    if (preflightValidation.warnings.length && !templateWarningsConfirmed) {
      setTemplateWarningsConfirmed(true);
      toast.error(`Review ${preflightValidation.warnings.length} template warning${preflightValidation.warnings.length === 1 ? '' : 's'} before saving.`);
      return;
    }
    setSavingTemplate(true);
    try {
      const data = await apiFetch<{ template: AdminTemplateItem; validation?: AdminTemplateValidationResult }>(`/api/admin/templates/${selectedTemplate.key}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...templateForm,
          ...(templateFileForm.indexHtml ? { indexHtml: templateFileForm.indexHtml } : {}),
          ...(templateFileForm.styleCss ? { styleCss: templateFileForm.styleCss } : {}),
          ...(templateFileForm.thumbnailDataUrl ? { thumbnailDataUrl: templateFileForm.thumbnailDataUrl } : {}),
        }),
      });
      setTemplates((items) => items.map((item) => item.key === data.template.key ? data.template : item));
      setSelectedTemplate(data.template);
      setTemplateForm(templateFormFromItem(data.template));
      setTemplateFileForm(emptyTemplateFileForm);
      setTemplateValidation(preflightValidation.warnings.length ? preflightValidation : (data.validation || emptyValidationResult));
      setTemplateWarningsConfirmed(false);
      toast.success(templateFileForm.indexHtml || templateFileForm.styleCss || templateFileForm.thumbnailDataUrl ? 'Template files updated.' : 'Template metadata updated.');
    } catch (error) {
      if (!handleValidationError(error)) {
        toast.error(error instanceof Error ? error.message : 'Could not update template.');
      }
    } finally {
      setSavingTemplate(false);
    }
  };

  const createCustomTemplate = async () => {
    const preflightValidation = mergeTemplateValidationResults(
      validateAdminTemplateMetadata(customTemplateForm),
      validateAdminTemplateSource({
        indexHtml: customTemplateForm.indexHtml,
        styleCss: customTemplateForm.styleCss,
        thumbnailPresent: Boolean(customTemplateForm.thumbnailDataUrl),
      })
    );
    setTemplateValidation(preflightValidation);
    if (preflightValidation.errors.length) {
      toast.error(`Template has ${preflightValidation.errors.length} validation error${preflightValidation.errors.length === 1 ? '' : 's'}.`);
      return;
    }
    if (preflightValidation.warnings.length && !templateWarningsConfirmed) {
      setTemplateWarningsConfirmed(true);
      toast.error(`Review ${preflightValidation.warnings.length} template warning${preflightValidation.warnings.length === 1 ? '' : 's'} before creating.`);
      return;
    }
    setCreatingTemplate(true);
    try {
      const data = await apiFetch<{ template: AdminTemplateItem; validation?: AdminTemplateValidationResult }>('/api/admin/templates', {
        method: 'POST',
        body: JSON.stringify(customTemplateForm),
      });
      setTemplates((items) => [...items, data.template]);
      setSelectedTemplate(data.template);
      setTemplateForm(templateFormFromItem(data.template));
      setTemplateValidation(data.validation || emptyValidationResult);
      setTemplateWarningsConfirmed(false);
      setCustomTemplateForm(emptyCustomTemplateForm);
      setCreateTemplateOpen(false);
      toast.success(data.template.status === 'active' ? 'Template created and published.' : 'Template draft created.');
    } catch (error) {
      if (!handleValidationError(error)) {
        toast.error(error instanceof Error ? error.message : 'Could not create template.');
      }
    } finally {
      setCreatingTemplate(false);
    }
  };

  const changeCustomTemplateStatus = async (template: AdminTemplateItem, action: 'publish' | 'archive') => {
    setSavingTemplate(true);
    try {
      const data = await apiFetch<{ template: AdminTemplateItem; validation?: AdminTemplateValidationResult }>(`/api/admin/templates/${template.key}/${action}`, { method: 'POST' });
      setTemplates((items) => items.map((item) => item.key === data.template.key ? data.template : item));
      setSelectedTemplate(data.template);
      setTemplateValidation(data.validation || null);
      toast.success(action === 'publish' ? 'Template published.' : 'Template archived.');
    } catch (error) {
      if (!handleValidationError(error)) {
        toast.error(error instanceof Error ? error.message : `Could not ${action} template.`);
      }
    } finally {
      setSavingTemplate(false);
    }
  };

  const setCustomTemplateFile = async (file: File | undefined, field: keyof TemplateFileForm) => {
    if (!file) return;
    try {
      const value = await readTemplateFile(file, field === 'thumbnailDataUrl' ? 'dataUrl' : 'text');
      setCustomTemplateForm((current) => ({ ...current, [field]: value }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read file.');
    }
  };

  const setSelectedTemplateFile = async (file: File | undefined, field: keyof TemplateFileForm) => {
    if (!file) return;
    try {
      const value = await readTemplateFile(file, field === 'thumbnailDataUrl' ? 'dataUrl' : 'text');
      const fileNameField = field === 'indexHtml'
        ? 'indexHtmlFileName'
        : field === 'styleCss'
        ? 'styleCssFileName'
        : 'thumbnailFileName';
      setTemplateFileForm((current) => ({ ...current, [field]: value, [fileNameField]: file.name }));
      setTemplateValidation(null);
      setTemplateWarningsConfirmed(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read file.');
    }
  };

  const updateTemplateFileForm = (value: TemplateFileForm) => {
    setTemplateFileForm(value);
    setTemplateValidation(null);
    setTemplateWarningsConfirmed(false);
  };

  const updateTemplateForm = (value: TemplateForm) => {
    setTemplateForm(value);
    setTemplateValidation(null);
    setTemplateWarningsConfirmed(false);
  };

  const updateCustomTemplateForm = (value: typeof emptyCustomTemplateForm) => {
    setCustomTemplateForm(value);
    setTemplateValidation(null);
    setTemplateWarningsConfirmed(false);
  };

  return {
    changeCustomTemplateStatus,
    createCustomTemplate,
    createTemplateOpen,
    creatingTemplate,
    customTemplateForm,
    openTemplateDetail,
    saveSelectedTemplate,
    savingTemplate,
    selectedTemplate,
    setCreateTemplateOpen,
    setCustomTemplateFile,
    setCustomTemplateForm: updateCustomTemplateForm,
    setSelectedTemplate,
    setSelectedTemplateFile,
    setTemplateAccessFilter,
    setTemplateCategoryFilter,
    setTemplateFileForm: updateTemplateFileForm,
    setTemplateForm: updateTemplateForm,
    setTemplateSearch,
    templateAccessFilter,
    templateCategories,
    templateCategoryFilter,
    templateFileForm,
    templateForm,
    templateValidation,
    templateWarningConfirmationPending: Boolean(templateValidation?.warnings.length && !templateValidation.errors.length && !templateWarningsConfirmed),
    templates,
    templatesLoading,
    templateSearch,
    visibleTemplates,
  };
}

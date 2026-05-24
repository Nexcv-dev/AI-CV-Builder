import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../../utils/api';
import type { AdminTemplateItem } from '../adminTypes';
import { emptyCustomTemplateForm } from '../adminUtils';

type TemplateForm = {
  label: string;
  category: string;
  access: 'free' | 'paid';
  thumbnail: string;
  surfaceColorRole: 'none' | 'sidebar' | 'header';
  surfaceColorLabel: string;
};

type TemplateFileForm = {
  indexHtml: string;
  styleCss: string;
  thumbnailDataUrl: string;
};

const emptyTemplateFileForm: TemplateFileForm = {
  indexHtml: '',
  styleCss: '',
  thumbnailDataUrl: '',
};

const templateFormFromItem = (template: AdminTemplateItem): TemplateForm => ({
  label: template.label,
  category: template.category,
  access: template.access,
  thumbnail: template.thumbnail,
  surfaceColorRole: template.surfaceColorRole || 'none',
  surfaceColorLabel: template.surfaceColorLabel || '',
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
  });
  const [templateFileForm, setTemplateFileForm] = useState<TemplateFileForm>(emptyTemplateFileForm);
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
  };

  const saveSelectedTemplate = async () => {
    if (!selectedTemplate) return;
    setSavingTemplate(true);
    try {
      const data = await apiFetch<{ template: AdminTemplateItem }>(`/api/admin/templates/${selectedTemplate.key}`, {
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
      toast.success(templateFileForm.indexHtml || templateFileForm.styleCss || templateFileForm.thumbnailDataUrl ? 'Template files updated.' : 'Template metadata updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const createCustomTemplate = async () => {
    setCreatingTemplate(true);
    try {
      const data = await apiFetch<{ template: AdminTemplateItem }>('/api/admin/templates', {
        method: 'POST',
        body: JSON.stringify(customTemplateForm),
      });
      setTemplates((items) => [...items, data.template]);
      setSelectedTemplate(data.template);
      setTemplateForm(templateFormFromItem(data.template));
      setCustomTemplateForm(emptyCustomTemplateForm);
      setCreateTemplateOpen(false);
      toast.success(data.template.status === 'active' ? 'Template created and published.' : 'Template draft created.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create template.');
    } finally {
      setCreatingTemplate(false);
    }
  };

  const changeCustomTemplateStatus = async (template: AdminTemplateItem, action: 'publish' | 'archive') => {
    setSavingTemplate(true);
    try {
      const data = await apiFetch<{ template: AdminTemplateItem }>(`/api/admin/templates/${template.key}/${action}`, { method: 'POST' });
      setTemplates((items) => items.map((item) => item.key === data.template.key ? data.template : item));
      setSelectedTemplate(data.template);
      toast.success(action === 'publish' ? 'Template published.' : 'Template archived.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Could not ${action} template.`);
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
      setTemplateFileForm((current) => ({ ...current, [field]: value }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read file.');
    }
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
    setCustomTemplateForm,
    setSelectedTemplate,
    setSelectedTemplateFile,
    setTemplateAccessFilter,
    setTemplateCategoryFilter,
    setTemplateFileForm,
    setTemplateForm,
    setTemplateSearch,
    templateAccessFilter,
    templateCategories,
    templateCategoryFilter,
    templateFileForm,
    templateForm,
    templates,
    templatesLoading,
    templateSearch,
    visibleTemplates,
  };
}

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../../utils/api';
import type { AdminSettingsSummary } from '../adminTypes';

/** Backs the Settings, CMS, and Notifications pages, which all edit the same app settings document. */
export function useAdminSettings({ enabled }: { enabled: boolean }) {
  const [settings, setSettings] = useState<AdminSettingsSummary | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let ignore = false;
    setSettingsLoading(true);

    apiFetch<AdminSettingsSummary>('/api/admin/settings')
      .then((data) => {
        if (!ignore) setSettings(data);
      })
      .catch((error) => {
        if (!ignore) toast.error(error instanceof Error ? error.message : 'Could not load settings.');
      })
      .finally(() => {
        if (!ignore) setSettingsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [enabled]);

  const saveSettings = async (appSettings: AdminSettingsSummary['app']) => {
    setSavingSettings(true);
    try {
      const data = await apiFetch<{ app: AdminSettingsSummary['app'] }>('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({ app: appSettings }),
      });
      setSettings((current) => current ? { ...current, app: data.app } : current);
      toast.success('Settings updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const sendTestEmail = async (recipient: string) => {
    setSendingTestEmail(true);
    try {
      const data = await apiFetch<{ message: string }>('/api/admin/settings/test-email', {
        method: 'POST',
        body: JSON.stringify({ to: recipient }),
      });
      toast.success(data.message || 'Test email sent.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send test email.');
    } finally {
      setSendingTestEmail(false);
    }
  };

  return {
    saveSettings,
    savingSettings,
    sendingTestEmail,
    sendTestEmail,
    settings,
    settingsLoading,
  };
}

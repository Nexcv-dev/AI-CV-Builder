import { afterEach, describe, expect, it, vi } from 'vitest';
import { triggerBrowserDownload } from './homeUtils';

describe('triggerBrowserDownload', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('creates a download link, clicks it, and removes it from the document', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    triggerBrowserDownload('/api/pdf-jobs/job-1/download?filename=Test_User', 'Test_User_Resume.pdf');

    expect(click).toHaveBeenCalledTimes(1);
    const link = click.mock.instances[0] as HTMLAnchorElement;
    expect(link.href).toContain('/api/pdf-jobs/job-1/download?filename=Test_User');
    expect(link.getAttribute('download')).toBe('Test_User_Resume.pdf');
    expect(document.body.querySelector('a')).toBeNull();
  });

  it('opens in a new tab on iOS user agents', () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    triggerBrowserDownload('/api/pdf-jobs/job-1/download', 'Resume.pdf');

    const link = (HTMLAnchorElement.prototype.click as any).mock.instances[0] as HTMLAnchorElement;
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('revokes generated blob URLs after the delayed download trigger window', () => {
    vi.useFakeTimers();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const revokeObjectURL = vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => undefined);

    triggerBrowserDownload('blob:http://localhost/pdf', 'Resume.pdf', true);

    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/pdf');
  });
});

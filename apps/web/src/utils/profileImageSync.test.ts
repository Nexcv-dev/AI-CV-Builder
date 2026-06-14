import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from './api';
import { clearProfileImageSyncCache, syncProfileImage } from './profileImageSync';

vi.mock('./api', () => ({
  apiFetch: vi.fn(),
}));

const mockApiFetch = vi.mocked(apiFetch);

describe('profileImageSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearProfileImageSyncCache();
  });

  it('deduplicates concurrent and completed uploads for the same compressed image', async () => {
    mockApiFetch.mockResolvedValue({ imageUrl: '/api/cv-assets/user/image.webp' });

    const first = syncProfileImage('data:image/webp;base64,c2FtZQ==');
    const second = syncProfileImage('data:image/webp;base64,c2FtZQ==');

    await expect(Promise.all([first, second])).resolves.toEqual([
      '/api/cv-assets/user/image.webp',
      '/api/cv-assets/user/image.webp',
    ]);
    await expect(syncProfileImage('data:image/webp;base64,c2FtZQ==')).resolves.toBe('/api/cv-assets/user/image.webp');
    expect(mockApiFetch).toHaveBeenCalledTimes(1);
  });

  it('removes failed uploads from the cache so the user can retry', async () => {
    mockApiFetch
      .mockRejectedValueOnce(new Error('Upload failed'))
      .mockResolvedValueOnce({ imageUrl: '/api/cv-assets/user/retry.webp' });

    await expect(syncProfileImage('data:image/webp;base64,cmV0cnk=')).rejects.toThrow('Upload failed');
    await expect(syncProfileImage('data:image/webp;base64,cmV0cnk=')).resolves.toBe('/api/cv-assets/user/retry.webp');
    expect(mockApiFetch).toHaveBeenCalledTimes(2);
  });
});

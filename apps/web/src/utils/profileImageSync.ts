import { apiFetch } from './api';

const MAX_CACHED_UPLOADS = 12;
const profileImageUploads = new Map<string, Promise<string>>();

function rememberUpload(imageData: string, upload: Promise<string>) {
  profileImageUploads.set(imageData, upload);
  while (profileImageUploads.size > MAX_CACHED_UPLOADS) {
    const oldest = profileImageUploads.keys().next().value;
    if (oldest === undefined) break;
    profileImageUploads.delete(oldest);
  }
}

export function syncProfileImage(imageData: string) {
  const existing = profileImageUploads.get(imageData);
  if (existing) return existing;

  const upload = apiFetch<{ imageUrl: string }>('/api/profile-images', {
    method: 'POST',
    body: JSON.stringify({ imageData }),
  })
    .then(({ imageUrl }) => imageUrl)
    .catch((error) => {
      profileImageUploads.delete(imageData);
      throw error;
    });

  rememberUpload(imageData, upload);
  return upload;
}

export function clearProfileImageSyncCache() {
  profileImageUploads.clear();
}

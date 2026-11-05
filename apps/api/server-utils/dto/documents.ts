import { publicCvShareUrl } from '../publicUrls';

export const documentSummary = (document: any) => ({
    id: document._id.toString(),
    title: document.title,
    template: document.template,
    status: document.status || 'completed',
    shareEnabled: Boolean(document.shareEnabled),
    shareSlug: document.shareSlug || null,
    shareUrl: document.shareEnabled ? publicCvShareUrl(document.shareSlug) : null,
    shareCreatedAt: document.shareCreatedAt || null,
    shareUpdatedAt: document.shareUpdatedAt || null,
    shareRevokedAt: document.shareRevokedAt || null,
    shareViewCount: Math.max(0, Number(document.shareViewCount || 0)),
    shareDownloadCount: Math.max(0, Number(document.shareDownloadCount || 0)),
    shareLastViewedAt: document.shareLastViewedAt || null,
    shareLastDownloadedAt: document.shareLastDownloadedAt || null,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
});

export const documentDetails = (document: any) => ({
    ...documentSummary(document),
    cvData: document.cvData,
});

export const titleFromCvData = (cvData: any) => {
    const fullName = cvData?.personalInfo?.fullName?.trim?.();
    return fullName ? `${fullName} CV` : 'Untitled CV';
};

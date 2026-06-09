export interface PublicAnnouncement {
  enabled: boolean;
  text: string;
  linkLabel: string;
  linkHref: string;
}

export interface PublicAppSettingsResponse {
  maintenanceMode: boolean;
  announcementEnabled: boolean;
  announcementText: string;
  announcement: PublicAnnouncement;
  cmsContent?: unknown;
  supportEmail: string;
  adminAccessAllowed: boolean;
}

export interface PublicAppSettings {
  maintenanceMode: boolean;
  announcementEnabled: boolean;
  announcementText: string;
  announcement?: {
    enabled: boolean;
    text: string;
    linkLabel: string;
    linkHref: string;
  };
  supportEmail: string;
  adminAccessAllowed: boolean;
}

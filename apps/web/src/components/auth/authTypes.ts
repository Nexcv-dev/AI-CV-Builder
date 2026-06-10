import type { AuthUser } from '../../utils/api';

export type AuthMode = 'login' | 'signup';
export type WizardStep = 'choice' | 'email' | 'password' | 'name' | 'signup-password' | 'otp';

export interface AuthModalProps {
  isOpen: boolean;
  initialMode: AuthMode;
  onClose: () => void;
  redirectTo?: string;
  onAuthenticated?: (user: AuthUser) => void;
}

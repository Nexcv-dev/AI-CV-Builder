export function authNextParam(redirectTo: string) {
  if (redirectTo.includes('download=1')) return '?next=download';
  if (redirectTo.includes('import=1')) return '?next=import';
  if (redirectTo.startsWith('/dashboard')) return '?next=dashboard';
  if (redirectTo.startsWith('/my-cvs')) return '?next=my-cvs';
  if (redirectTo.startsWith('/profile')) return '?next=profile';
  if (redirectTo.startsWith('/admin')) return '?next=admin';
  return '?next=builder';
}

export const prefetchBuilderRoute = () => {
  void import('../../pages/Home');
  void import('../CVForm');
  void import('../CVPreview');
};

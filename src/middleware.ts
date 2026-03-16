export { auth as middleware } from '@/auth';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/history/:path*',
    '/holdings/:path*',
    '/import/:path*',
  ],
};

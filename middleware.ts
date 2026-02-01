import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

// Protect routes and manage sessions with AuthKit middleware
// This middleware will:
// - Verify and refresh session tokens
// - Make user info available via getUser() in server components
// - Handle session cookies automatically
export default authkitMiddleware();

export const config = {
  matcher: [
    // Match all paths except static files, images, and API routes that don't need auth
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)',
  ],
};

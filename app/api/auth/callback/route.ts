import { handleAuth } from '@workos-inc/authkit-nextjs';

// Handle OAuth callback from WorkOS
export const GET = handleAuth({
  returnPathname: '/dashboard',
});

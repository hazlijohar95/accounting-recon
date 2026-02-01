import { signOut } from '@workos-inc/authkit-nextjs';

// Handle logout - clear session and redirect
export async function GET() {
  return signOut({ returnTo: '/' });
}

export async function POST() {
  return signOut({ returnTo: '/' });
}

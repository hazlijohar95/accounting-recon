import { getSignInUrl } from '@workos-inc/authkit-nextjs';
import { NextResponse } from 'next/server';

// Redirect to WorkOS AuthKit login
export async function GET() {
  const signInUrl = await getSignInUrl();
  return NextResponse.redirect(signInUrl);
}

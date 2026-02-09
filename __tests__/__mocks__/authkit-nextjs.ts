/**
 * Stub for @workos-inc/authkit-nextjs
 * This module imports next/cache which doesn't exist in vitest's jsdom environment.
 * Mock it at the module resolution level so ESM import succeeds.
 */
export const withAuth = () => {}
export const getUser = async () => null
export const signOut = async () => {}
export const authkitMiddleware = () => () => {}
export const handleAuth = () => () => {}

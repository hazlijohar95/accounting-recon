/**
 * Stub for @workos-inc/authkit-nextjs/components
 */
export const useAuth = () => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  signIn: () => {},
  signOut: () => {},
})
export const useAccessToken = () => ({
  accessToken: null,
  isLoading: false,
})
export const AuthKitProvider = ({ children }: { children: React.ReactNode }) => children

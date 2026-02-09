/**
 * Stub for next/cache — required because @workos-inc/authkit-nextjs
 * imports it at the ESM resolution level before vi.mock can intercept.
 */
export const revalidatePath = () => {}
export const revalidateTag = () => {}
export const unstable_cache = (fn: Function) => fn
export const unstable_noStore = () => {}

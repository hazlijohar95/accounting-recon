import { AuthKit, type AuthFunctions } from "@convex-dev/workos-authkit";
import { internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

// Note: The 'components' export is generated after running `npx convex dev`
// with the workOSAuthKit component registered in convex.config.ts
import { components } from "./_generated/api";

// Get a typed object of internal Convex functions exported by this file
// @ts-expect-error - internal.auth will be available after Convex codegen
const authFunctions: AuthFunctions = internal.auth;

// Initialize AuthKit component
// The component may be undefined until `npx convex dev` generates types
export const authKit = new AuthKit<DataModel>(
  components?.workOSAuthKit ?? ({} as any),
  {
    authFunctions,
  }
);

// Export event handlers for user sync via webhooks
export const { authKitEvent } = authKit.events({
  "user.created": async (ctx, event) => {
    // Check if user already exists (e.g., created manually during demo)
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", event.data.email))
      .first();

    if (existing) {
      // Update existing user with WorkOS ID
      await ctx.db.patch(existing._id, {
        workosId: event.data.id,
        name:
          `${event.data.firstName ?? ""} ${event.data.lastName ?? ""}`.trim() ||
          existing.name,
      });
      return;
    }

    // Create new user record
    await ctx.db.insert("users", {
      email: event.data.email,
      name:
        `${event.data.firstName ?? ""} ${event.data.lastName ?? ""}`.trim() ||
        undefined,
      workosId: event.data.id,
      createdAt: Date.now(),
    });
  },

  "user.updated": async (ctx, event) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_workos", (q) => q.eq("workosId", event.data.id))
      .first();

    if (!user) {
      console.warn(`User not found for WorkOS ID: ${event.data.id}`);
      return;
    }

    await ctx.db.patch(user._id, {
      email: event.data.email,
      name:
        `${event.data.firstName ?? ""} ${event.data.lastName ?? ""}`.trim() ||
        user.name,
    });
  },

  "user.deleted": async (ctx, event) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_workos", (q) => q.eq("workosId", event.data.id))
      .first();

    if (!user) {
      console.warn(`User not found for WorkOS ID: ${event.data.id}`);
      return;
    }

    // Note: We're deleting the user record here.
    // If you want to preserve data, consider soft-delete instead.
    await ctx.db.delete(user._id);
  },
});

// Optional: Export action handlers for custom auth logic
export const { authKitAction } = authKit.actions({
  authentication: async (_ctx, _action, response) => {
    // Allow all authentications by default
    return response.allow();
  },
  userRegistration: async (_ctx, _action, response) => {
    // Allow all registrations by default
    return response.allow();
  },
});

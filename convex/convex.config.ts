import workOSAuthKit from "@convex-dev/workos-authkit/convex.config";
import aggregate from "@convex-dev/aggregate/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(workOSAuthKit);
app.use(aggregate);
export default app;

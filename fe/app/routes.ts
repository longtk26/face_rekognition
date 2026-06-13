import { type RouteConfig, index, route } from "@react-router/dev/routes";
import { authRoute } from "./routes/auth/auth.route";

export default [
  index("routes/home.tsx"),
  authRoute,
  route("face/register", "routes/face-register.tsx"),
  route("face/verify", "routes/face-verify.tsx"),
] satisfies RouteConfig;

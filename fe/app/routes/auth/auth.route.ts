import { layout, route } from "@react-router/dev/routes";
const basePath = "./routes/auth";

const authPath = {
    layout: `${basePath}/layout.tsx`,
    login: `${basePath}/login/login.tsx`,
    register: `${basePath}/register/register.tsx`,
};

export const authRoute = layout(authPath.layout, [
    route("login", authPath.login),
    route("register", authPath.register),
]);

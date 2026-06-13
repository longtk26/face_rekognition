import {
    isRouteErrorResponse,
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
    useLoaderData,
} from "react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { dehydrate } from "@tanstack/react-query";
import i18nextServer from "./i18n.server";
import { createQueryClient } from "./lib/query-client";
import { QueryProvider } from "./provider/query-provider";

import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
    },
    {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
    },
];

export async function loader({ request }: Route.LoaderArgs) {
    const locale = await i18nextServer.getLocale(request);

    // Create a per-request QueryClient and dehydrate it so the client
    // can rehydrate the same cache without re-fetching on first render.
    const queryClient = createQueryClient();
    // Prefetch any global queries here (e.g. auth session, feature flags).
    // Example: await queryClient.prefetchQuery(sessionQueries.current());
    const dehydratedState = dehydrate(queryClient);

    return { locale, dehydratedState };
}

export const handle = {
    i18n: "common",
};

export function Layout({ children }: { children: React.ReactNode }) {
    const data = useLoaderData<typeof loader>();
    const locale = data?.locale ?? "es";
    const { i18n } = useTranslation();

    useEffect(() => {
        if (i18n.language !== locale) {
            i18n.changeLanguage(locale);
        }
    }, [locale, i18n]);

    return (
        <html lang={locale} dir={i18n.dir()}>
            <head>
                <meta charSet="utf-8" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                />
                <Meta />
                <Links />
            </head>
            <body>
                <QueryProvider dehydratedState={data?.dehydratedState}>
                    {children}
                </QueryProvider>
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    );
}

export default function App() {
    return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
    let message = "Oops!";
    let details = "An unexpected error occurred.";
    let stack: string | undefined;

    if (isRouteErrorResponse(error)) {
        message = error.status === 404 ? "404" : "Error";
        details =
            error.status === 404
                ? "The requested page could not be found."
                : error.statusText || details;
    } else if (import.meta.env.DEV && error && error instanceof Error) {
        details = error.message;
        stack = error.stack;
    }

    return (
        <main className="pt-16 p-4 container mx-auto">
            <h1>{message}</h1>
            <p>{details}</p>
            {stack && (
                <pre className="w-full p-4 overflow-x-auto">
                    <code>{stack}</code>
                </pre>
            )}
        </main>
    );
}

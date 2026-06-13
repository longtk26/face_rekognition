import { RemixI18Next } from "remix-i18next/server";
import { resolve } from "node:path";
import i18n from "./i18n";
import Backend from "i18next-fs-backend";

let backend: RemixI18Next;

if (typeof window === "undefined") {
    backend = new RemixI18Next({
        detection: {
            supportedLanguages: i18n.supportedLngs,
            fallbackLanguage: i18n.fallbackLng,
        },
        // This is the configuration for i18next used
        // when translating messages server-side only
        i18next: {
            ...i18n,
            backend: {
                loadPath: resolve("./public/locales/{{lng}}/{{ns}}.json"),
            },
        },
        // The i18next plugins you want RemixI18next to use for `i18n.getFixedT` inside loaders and actions.
        // E.g. The Backend plugin for loading translations from the file system
        // Make sure you see below for the correct pattern for using the `Backend` plugin.
        plugins: [Backend],
    });
}

export default backend!;

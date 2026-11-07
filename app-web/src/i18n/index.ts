import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import fr from "./fr.json";

// UI_LOCALE is a build-time input in P0 (PRE-SPEC.md §1; per-user runtime
// preference arrives with the settings screen).
const uiLocale = (import.meta.env.VITE_UI_LOCALE as string | undefined) ?? "en";

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: uiLocale === "fr" ? "fr" : "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

// Keep the document language in sync with the active UI locale (a11y).
void i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
});
document.documentElement.lang = i18n.language;

export default i18n;

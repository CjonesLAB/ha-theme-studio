const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const assert = require("node:assert/strict");

const frontend = path.join(
  __dirname,
  "../custom_components/theme_studio/frontend"
);
const read = (name) => fs.readFileSync(path.join(frontend, name), "utf8");

const localeNames = ["de", "en", "fr", "es"];
const localeSources = Object.fromEntries(localeNames.map((language) => {
  const relativePath = path.join("locales", `${language}.js`);
  assert.ok(
    fs.existsSync(path.join(frontend, relativePath)),
    `frontend translations must have a separate ${language}.js language file`
  );
  return [language, read(relativePath)];
}));

const localizationSource = read("theme-studio-locales.js");
assert.ok(
  localeNames.every((language) => localizationSource.includes(`./locales/${language}.js`)),
  "the localization runtime must load every separate language file"
);

const translationKeys = (source) => Array.from(
  source.matchAll(/^\s{2}("(?:[^"\\]|\\.)+"):/gm),
  (match) => JSON.parse(match[1])
);
for (const language of ["en", "fr", "es"]) {
  const keys = translationKeys(localeSources[language]);
  assert.equal(
    new Set(keys).size,
    keys.length,
    `${language}.js must not contain duplicate translation terms`
  );
}
assert.deepEqual(
  translationKeys(localeSources.en).sort(),
  translationKeys(localeSources.fr).sort(),
  "English and French frontend dictionaries must contain the same terms"
);
assert.deepEqual(
  translationKeys(localeSources.en).sort(),
  translationKeys(localeSources.es).sort(),
  "English and Spanish frontend dictionaries must contain the same terms"
);
assert.ok(
  localizationSource.split(/\r?\n/).length < 350,
  "the executable localization runtime must stay small and contain no bundled dictionaries"
);

const requiredGermanTerms = [
  "Warmweiß",
  "Kaltweiß",
  "Lichtstimmung",
  "Energie und Gerätestatus",
  "Momentanleistung",
  "Jalousie-Darstellung",
  "Laufzeiten einlernen",
  "Öffnungsfahrt starten",
  "Schließfahrt starten",
  "Name der Karte (optional)",
  "Empfohlene Größe verwenden",
  "Uhrtyp",
];

for (const term of requiredGermanTerms) {
  assert.ok(
    localeSources.de.includes(JSON.stringify(term)),
    `German source catalog must contain ${term}`
  );
  for (const language of ["en", "fr", "es"]) {
    assert.ok(
      localeSources[language].includes(JSON.stringify(term)),
      `${language}.js must translate ${term}`
    );
  }
}

const baseSource = read("theme-studio-card-base.js");
assert.ok(
  baseSource.includes("ThemeStudioLocalizer")
    && baseSource.includes("translateTree(this.shadowRoot)"),
  "custom cards and their editors must translate their own shadow DOM"
);
const clockSource = read("theme-studio-clock-card.js");
assert.ok(
  clockSource.includes("ThemeStudioLocalizer")
    && clockSource.includes("this._syncLocalization();"),
  "the clock card editor must translate its own shadow DOM"
);

(async () => {
  const localizationModule = await import(pathToFileURL(
    path.join(frontend, "theme-studio-locales.js")
  ).href);
  const expected = {
    en: ["Warm white", "Clock type", "100% brightness", "Total 1,69 kWh"],
    fr: ["Blanc chaud", "Type d’horloge", "Luminosité : 100 %", "Total 1,69 kWh"],
    es: ["Blanco cálido", "Tipo de reloj", "100 % de brillo", "Total 1,69 kWh"],
  };
  for (const [language, translations] of Object.entries(expected)) {
    const localizer = new localizationModule.ThemeStudioLocalizer(language);
    assert.deepEqual(
      [
        localizer.translate("Warmweiß"),
        localizer.translate("Uhrtyp"),
        localizer.translate("100 % Helligkeit"),
        localizer.translate("Gesamt 1,69 kWh"),
      ],
      translations,
      `${language} must translate fixed and dynamic card text`
    );
  }
  console.log("Frontend localization checks passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { MESSAGES as DE_MESSAGES } from "./locales/de.js?v=0.11.2";
import { MESSAGES as EN_MESSAGES } from "./locales/en.js?v=0.11.2";
import { MESSAGES as FR_MESSAGES } from "./locales/fr.js?v=0.11.2";
import { MESSAGES as ES_MESSAGES } from "./locales/es.js?v=0.11.2";

const TRANSLATIONS = Object.freeze({
  de: DE_MESSAGES,
  en: EN_MESSAGES,
  fr: FR_MESSAGES,
  es: ES_MESSAGES,
});

const LANGUAGE_ALIASES = {
  de: "de",
  en: "en",
  es: "es",
  fr: "fr"
};

const ATTRIBUTES = ["aria-label", "placeholder", "title"];

function normalizedLanguage(language) {
  const shortLanguage = String(language || "en")
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0];

  return LANGUAGE_ALIASES[shortLanguage] || "en";
}

function normalizedText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function translatePatterns(text, language) {
  const patterns = {
    en: [
      [/^(\d+) von 64 Regeln$/, "$1 of 64 rules"],
      [/^CSS-Regel „(.+)“ wirklich löschen\?$/, "Really delete CSS rule “$1”?"],
      [/^(.+): Wert zwischen (-?\d+) und (-?\d+) eingeben\.$/, "$1: Enter a value between $2 and $3."],
      [/^(\d+) von (\d+) Bildern$/, "$1 of $2 images"],
      [/^(\d+) gewählt$/, "$1 selected"],
      [/^Ausgewählt: (.+)$/, "Selected: $1"],
      [/^(.+) auswählen$/, "Select $1"],
      [/^(\d+)–(\d+) von (\d+)$/, "$1–$2 of $3"],
      [/^(.+) wurde aus der Galerie importiert und als Profil gespeichert\.$/, "$1 was imported from the gallery and saved as a profile."],
      [/^(.+) geladen\. Zum Aktivieren „Design anwenden“ drücken\.$/, "$1 loaded. Press “Apply design” to activate it."],
      [/^(.+) wurde aktualisiert\.$/, "$1 was updated."],
      [/^(.+) wurde gespeichert\.$/, "$1 was saved."],
      [/^Profil wurde in (.+) umbenannt\.$/, "Profile was renamed to $1."],
      [/^(.+) wurde angelegt\.$/, "$1 was created."],
      [/^(.+) wurde geprüft und importiert\. Zum Aktivieren „Design anwenden“ drücken\.$/, "$1 was verified and imported. Press “Apply design” to activate it."],
      [/^Profil „(.+)“ wirklich löschen\?$/, "Really delete profile “$1”?"],
      [/^(.+) wurde gelöscht\. Das aktuelle Design bleibt erhalten\.$/, "$1 was deleted. The current design is retained."],
      [/^(.+) ausgewählt\. Bitte beide Modi anwenden\.$/, "$1 selected. Please apply both modes."],
      [/^Bild wurde in (.+) umbenannt\.$/, "Image was renamed to $1."],
      [/^Bild „(.+)“ wirklich löschen\?$/, "Really delete image “$1”?"],
      [/^(.+) wurde dauerhaft gelöscht\.$/, "$1 was permanently deleted."],
      [/^(.+) wurde ohne lokale Bildpfade, Effekte und Entitätszuordnungen als JSON exportiert\.$/, "$1 was exported as JSON without local image paths, effects, or entity assignments."],
      [/^Galerie konnte nicht geladen werden: (.+)$/, "The gallery could not be loaded: $1"],
      [/^Designprofile konnten nicht geladen werden: (.+)$/, "Design profiles could not be loaded: $1"],
      [/^Bildbibliothek konnte nicht geladen werden: (.+)$/, "The image library could not be loaded: $1"],
      [/^(\d+) % Helligkeit$/, "$1% brightness"],
      [/^Heute (.+)$/, "Today $1"],
      [/^Gesamt (.+)$/, "Total $1"],
      [/^(\d+) % geöffnet$/, "$1% open"],
      [/^Öffnungsfahrt läuft: (.+) Sekunden$/, "Opening run: $1 seconds"],
      [/^Schließfahrt läuft: (.+) Sekunden$/, "Closing run: $1 seconds"],
      [/^Motor gestoppt\. Gemessene Öffnungszeit: (.+) Sekunden\.$/, "Motor stopped. Measured opening time: $1 seconds."],
      [/^Motor gestoppt\. Gemessene Schließzeit: (.+) Sekunden\.$/, "Motor stopped. Measured closing time: $1 seconds."],
      [/^Öffnungsfahrt läuft\. Am Endpunkt sofort stoppen\.$/, "Opening ride is running. Stop immediately at the endpoint."],
      [/^Schließfahrt läuft\. Am Endpunkt sofort stoppen\.$/, "Closing ride is running. Stop immediately at the endpoint."],
      [/^Öffnungszeit gespeichert: (.+) Sekunden\.$/, "Opening time saved: $1 seconds."],
      [/^Schließzeit gespeichert: (.+) Sekunden\.$/, "Closing time saved: $1 seconds."],
      [/^Diese Karte benötigt eine (.+)\.-Entität\.$/, "This card requires a $1 entity."],
      [/^(.+) analysieren$/, "Analyze $1"]
    ],
    fr: [
      [/^(\d+) von 64 Regeln$/, "$1 règle(s) sur 64"],
      [/^CSS-Regel „(.+)“ wirklich löschen\?$/, "Supprimer réellement la règle CSS « $1 » ?"],
      [/^(.+): Wert zwischen (-?\d+) und (-?\d+) eingeben\.$/, "$1 : saisissez une valeur comprise entre $2 et $3."],
      [/^(\d+) von (\d+) Bildern$/, "$1 image(s) sur $2"],
      [/^(\d+) gewählt$/, "$1 sélectionné(s)"],
      [/^Ausgewählt: (.+)$/, "Sélection : $1"],
      [/^(.+) auswählen$/, "Sélectionner $1"],
      [/^(\d+)–(\d+) von (\d+)$/, "$1–$2 sur $3"],
      [/^(.+) wurde aus der Galerie importiert und als Profil gespeichert\.$/, "$1 a été importé depuis la galerie et enregistré comme profil."],
      [/^(.+) geladen\. Zum Aktivieren „Design anwenden“ drücken\.$/, "$1 chargé. Appuyez sur « Appliquer le thème » pour l’activer."],
      [/^(.+) wurde aktualisiert\.$/, "$1 a été mis à jour."],
      [/^(.+) wurde gespeichert\.$/, "$1 a été enregistré."],
      [/^Profil wurde in (.+) umbenannt\.$/, "Le profil a été renommé $1."],
      [/^(.+) wurde angelegt\.$/, "$1 a été créé."],
      [/^(.+) wurde geprüft und importiert\. Zum Aktivieren „Design anwenden“ drücken\.$/, "$1 a été vérifié et importé. Appuyez sur « Appliquer le thème » pour l’activer."],
      [/^Profil „(.+)“ wirklich löschen\?$/, "Supprimer réellement le profil « $1 » ?"],
      [/^(.+) wurde gelöscht\. Das aktuelle Design bleibt erhalten\.$/, "$1 a été supprimé. Le design actuel est conservé."],
      [/^(.+) ausgewählt\. Bitte beide Modi anwenden\.$/, "$1 sélectionné. Veuillez appliquer les deux modes."],
      [/^Bild wurde in (.+) umbenannt\.$/, "L’image a été renommée $1."],
      [/^Bild „(.+)“ wirklich löschen\?$/, "Supprimer réellement l’image « $1 » ?"],
      [/^(.+) wurde dauerhaft gelöscht\.$/, "$1 a été supprimé définitivement."],
      [/^(.+) wurde ohne lokale Bildpfade, Effekte und Entitätszuordnungen als JSON exportiert\.$/, "$1 a été exporté en JSON sans chemins d’images locaux, effets ni associations d’entités."],
      [/^Galerie konnte nicht geladen werden: (.+)$/, "Impossible de charger la galerie : $1"],
      [/^Designprofile konnten nicht geladen werden: (.+)$/, "Impossible de charger les profils de design : $1"],
      [/^Bildbibliothek konnte nicht geladen werden: (.+)$/, "Impossible de charger la bibliothèque d’images : $1"],
      [/^(\d+) % Helligkeit$/, "Luminosité : $1 %"],
      [/^Heute (.+)$/, "Aujourd’hui $1"],
      [/^Gesamt (.+)$/, "Total $1"],
      [/^(\d+) % geöffnet$/, "Ouvert à $1 %"],
      [/^Öffnungsfahrt läuft: (.+) Sekunden$/, "Ouverture en cours : $1 secondes"],
      [/^Schließfahrt läuft: (.+) Sekunden$/, "Fermeture en cours : $1 secondes"],
      [/^Motor gestoppt\. Gemessene Öffnungszeit: (.+) Sekunden\.$/, "Moteur arrêté. Temps d’ouverture mesuré : $1 secondes."],
      [/^Motor gestoppt\. Gemessene Schließzeit: (.+) Sekunden\.$/, "Moteur arrêté. Temps de fermeture mesuré : $1 secondes."],
      [/^Öffnungsfahrt läuft\. Am Endpunkt sofort stoppen\.$/, "Course d’ouverture en cours. Arrêtez immédiatement à la fin de course."],
      [/^Schließfahrt läuft\. Am Endpunkt sofort stoppen\.$/, "Course de fermeture en cours. Arrêtez immédiatement à la fin de course."],
      [/^Öffnungszeit gespeichert: (.+) Sekunden\.$/, "Temps d’ouverture enregistré : $1 secondes."],
      [/^Schließzeit gespeichert: (.+) Sekunden\.$/, "Temps de fermeture enregistré : $1 secondes."],
      [/^Diese Karte benötigt eine (.+)\.-Entität\.$/, "Cette carte nécessite une entité $1."],
      [/^(.+) analysieren$/, "Analyser $1"]
    ],
    es: [
      [/^(\d+) von 64 Regeln$/, "$1 de 64 reglas"],
      [/^CSS-Regel „(.+)“ wirklich löschen\?$/, "¿Eliminar realmente la regla CSS «$1»?"],
      [/^(.+): Wert zwischen (-?\d+) und (-?\d+) eingeben\.$/, "$1: introduce un valor entre $2 y $3."],
      [/^(\d+) von (\d+) Bildern$/, "$1 de $2 imágenes"],
      [/^(\d+) gewählt$/, "$1 seleccionadas"],
      [/^Ausgewählt: (.+)$/, "Seleccionado: $1"],
      [/^(.+) auswählen$/, "Seleccionar $1"],
      [/^(\d+)–(\d+) von (\d+)$/, "$1–$2 de $3"],
      [/^(.+) wurde aus der Galerie importiert und als Profil gespeichert\.$/, "$1 se importó desde la galería y se guardó como perfil."],
      [/^(.+) geladen\. Zum Aktivieren „Design anwenden“ drücken\.$/, "$1 cargado. Pulsa «Aplicar diseño» para activarlo."],
      [/^(.+) wurde aktualisiert\.$/, "$1 se actualizó."],
      [/^(.+) wurde gespeichert\.$/, "$1 se guardó."],
      [/^Profil wurde in (.+) umbenannt\.$/, "El perfil se renombró como $1."],
      [/^(.+) wurde angelegt\.$/, "$1 se creó."],
      [/^(.+) wurde geprüft und importiert\. Zum Aktivieren „Design anwenden“ drücken\.$/, "$1 se verificó e importó. Pulsa «Aplicar diseño» para activarlo."],
      [/^Profil „(.+)“ wirklich löschen\?$/, "¿Eliminar realmente el perfil «$1»?"],
      [/^(.+) wurde gelöscht\. Das aktuelle Design bleibt erhalten\.$/, "$1 se eliminó. El diseño actual se conserva."],
      [/^(.+) ausgewählt\. Bitte beide Modi anwenden\.$/, "$1 seleccionado. Aplica ambos modos."],
      [/^Bild wurde in (.+) umbenannt\.$/, "La imagen se renombró como $1."],
      [/^Bild „(.+)“ wirklich löschen\?$/, "¿Eliminar realmente la imagen «$1»?"],
      [/^(.+) wurde dauerhaft gelöscht\.$/, "$1 se eliminó permanentemente."],
      [/^(.+) wurde ohne lokale Bildpfade, Effekte und Entitätszuordnungen als JSON exportiert\.$/, "$1 se exportó como JSON sin rutas de imagen locales, efectos ni asignaciones de entidades."],
      [/^Galerie konnte nicht geladen werden: (.+)$/, "No se pudo cargar la galería: $1"],
      [/^Designprofile konnten nicht geladen werden: (.+)$/, "No se pudieron cargar los perfiles de diseño: $1"],
      [/^Bildbibliothek konnte nicht geladen werden: (.+)$/, "No se pudo cargar la biblioteca de imágenes: $1"],
      [/^(\d+) % Helligkeit$/, "$1 % de brillo"],
      [/^Heute (.+)$/, "Hoy $1"],
      [/^Gesamt (.+)$/, "Total $1"],
      [/^(\d+) % geöffnet$/, "$1 % abierta"],
      [/^Öffnungsfahrt läuft: (.+) Sekunden$/, "Apertura en curso: $1 segundos"],
      [/^Schließfahrt läuft: (.+) Sekunden$/, "Cierre en curso: $1 segundos"],
      [/^Motor gestoppt\. Gemessene Öffnungszeit: (.+) Sekunden\.$/, "Motor detenido. Tiempo de apertura medido: $1 segundos."],
      [/^Motor gestoppt\. Gemessene Schließzeit: (.+) Sekunden\.$/, "Motor detenido. Tiempo de cierre medido: $1 segundos."],
      [/^Öffnungsfahrt läuft\. Am Endpunkt sofort stoppen\.$/, "Recorrido de apertura en curso. Detén inmediatamente al llegar al final."],
      [/^Schließfahrt läuft\. Am Endpunkt sofort stoppen\.$/, "Recorrido de cierre en curso. Detén inmediatamente al llegar al final."],
      [/^Öffnungszeit gespeichert: (.+) Sekunden\.$/, "Tiempo de apertura guardado: $1 segundos."],
      [/^Schließzeit gespeichert: (.+) Sekunden\.$/, "Tiempo de cierre guardado: $1 segundos."],
      [/^Diese Karte benötigt eine (.+)\.-Entität\.$/, "Esta tarjeta necesita una entidad $1."],
      [/^(.+) analysieren$/, "Analizar $1"]
    ]
  };

  for (const [pattern, replacement] of patterns[language] || []) {
    if (pattern.test(text)) {
      return text.replace(pattern, replacement);
    }
  }

  return text;
}

export class ThemeStudioLocalizer {
  constructor(language) {
    this.language = normalizedLanguage(language);
    this.messages = TRANSLATIONS[this.language] || {};
    this.observer = null;
  }

  translate(value) {
    if (this.language === "de" || !value) {
      return value;
    }

    const text = normalizedText(value);
    if (!text) {
      return value;
    }

    const translated = this.messages[text] || translatePatterns(
      text,
      this.language
    );

    if (translated === text) {
      return value;
    }

    const leading = String(value).match(/^\s*/)?.[0] || "";
    const trailing = String(value).match(/\s*$/)?.[0] || "";
    return `${leading}${translated}${trailing}`;
  }

  translateTree(root) {
    if (this.language === "de" || !root) {
      return;
    }

    if (root.nodeType === Node.TEXT_NODE) {
      root.nodeValue = this.translate(root.nodeValue);
      return;
    }

    if (root.nodeType !== Node.ELEMENT_NODE
        && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
      return;
    }

    if (root.nodeType === Node.ELEMENT_NODE) {
      for (const attribute of ATTRIBUTES) {
        if (root.hasAttribute(attribute)) {
          root.setAttribute(
            attribute,
            this.translate(root.getAttribute(attribute))
          );
        }
      }
    }

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT
    );
    let node = walker.nextNode();

    while (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        node.nodeValue = this.translate(node.nodeValue);
      } else {
        for (const attribute of ATTRIBUTES) {
          if (node.hasAttribute(attribute)) {
            node.setAttribute(
              attribute,
              this.translate(node.getAttribute(attribute))
            );
          }
        }
      }
      node = walker.nextNode();
    }
  }

  observe(root) {
    this.disconnect();
    this.translateTree(root);

    if (
      this.language === "de"
      || !root
      || typeof globalThis.MutationObserver === "undefined"
    ) {
      return;
    }

    this.observer = new globalThis.MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          const attribute = mutation.attributeName;
          const value = mutation.target.getAttribute(attribute);
          const translated = this.translate(value);
          if (translated !== value) {
            mutation.target.setAttribute(attribute, translated);
          }
          continue;
        }

        if (mutation.type === "characterData") {
          const translated = this.translate(mutation.target.nodeValue);
          if (translated !== mutation.target.nodeValue) {
            mutation.target.nodeValue = translated;
          }
          continue;
        }

        for (const node of mutation.addedNodes) {
          this.translateTree(node);
        }
      }
    });

    this.observer.observe(root, {
      attributeFilter: ATTRIBUTES,
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  disconnect() {
    this.observer?.disconnect();
    this.observer = null;
  }
}

export function themeStudioLanguage(hass) {
  return normalizedLanguage(
    hass?.locale?.language
      || hass?.language
      || globalThis.document?.documentElement?.lang
      || globalThis.navigator?.language
  );
}

const TRANSLATIONS = {
  en: {
    "Zur Übersicht": "Back to Overview",
    "Community-Design wählen oder individuell gestalten.": "Choose a community design or create your own.",
    "Version wird geladen …": "Loading version …",
    "Änderungsverlauf": "Change history",
    "Letzte Änderung rückgängig machen": "Undo last change",
    "Rückgängig": "Undo",
    "Änderung wiederholen": "Redo change",
    "Wiederholen": "Redo",
    "☀ Hell": "☀ Light",
    "☾ Dunkel": "☾ Dark",
    "Beide Modi anwenden": "Apply both modes",
    "Erzeugt aus dem gewählten Modus einen farblich passenden Gegenmodus": "Creates a matching opposite color mode from the selected mode",
    "Passenden Hellmodus erzeugen": "Generate matching light mode",
    "Passenden Dunkelmodus erzeugen": "Generate matching dark mode",
    "Aktiviert das zuletzt gesicherte Design": "Activates the most recently saved design",
    "Noch kein vorheriges Design gespeichert": "No previous design has been saved yet",
    "Letztes Design wiederherstellen": "Restore last design",
    "● Nicht angewendete Änderungen": "● Unapplied changes",
    "Import prüfen": "Review import",
    "Abbrechen": "Cancel",
    "Profil importieren": "Import profile",
    "Community-Galerie": "Community Gallery",
    "Geprüfte Designs ansehen und direkt als Profil importieren.": "Browse verified designs and import them directly as a profile.",
    "Aktualisieren": "Refresh",
    "Galerie öffnen": "Open gallery",
    "Galerie wird geladen …": "Loading gallery …",
    "Vorherige Designs anzeigen": "Show previous designs",
    "Weitere Designs anzeigen": "Show more designs",
    "Eigene Designprofile": "My design profiles",
    "Komplette Designs speichern, laden oder weitergeben.": "Save, load, or share complete designs.",
    "Gespeichertes Profil": "Saved profile",
    "Neues Profil anlegen": "Create new profile",
    "Profilname": "Profile name",
    "Zum Beispiel: Abend": "For example: Evening",
    "Profil speichern": "Save profile",
    "Profil aktualisieren": "Update profile",
    "Umbenennen": "Rename",
    "Duplizieren": "Duplicate",
    "JSON exportieren": "Export JSON",
    "JSON importieren": "Import JSON",
    "Löschen": "Delete",
    "Es können bis zu 32 Profile gespeichert werden. Eigene Hintergrundbilder werden als lokaler Pfad, nicht als Bilddatei exportiert.": "Up to 32 profiles can be saved. Custom background images are exported as a local path, not as an image file.",
    "Feineinstellungen": "Fine-tuning",
    "Einstellungen für den oben gewählten Modus.": "Settings for the mode selected above.",
    "Farben": "Colors",
    "Türkis": "Turquoise",
    "Blau": "Blue",
    "Grün": "Green",
    "Rot": "Red",
    "Violett": "Purple",
    "Hauptfarbe": "Primary color",
    "Hintergrundfarbe": "Background color",
    "Karten": "Cards",
    "Kartenfarbe": "Card color",
    "Textfarbe": "Text color",
    "Symbolfarbe": "Icon color",
    "Rahmenfarbe": "Border color",
    "Kartendeckkraft": "Card opacity",
    "Rahmenstärke": "Border width",
    "Schattenstärke": "Shadow strength",
    "Runde Ecken": "Rounded corners",
    "Navigation": "Navigation",
    "Kopfzeile": "Header",
    "Text- und Symbolfarbe": "Text and icon color",
    "Seitenleiste": "Sidebar",
    "Aktive Navigation": "Active navigation",
    "Die Einstellungen gelten getrennt für den oben ausgewählten hellen oder dunklen Modus.": "The settings apply separately to the light or dark mode selected above.",
    "Hintergrund": "Background",
    "Farbe": "Color",
    "Wellen": "Waves",
    "Eigenes Bild": "Custom image",
    "JPG, PNG oder WebP bis 5 MB.": "JPG, PNG, or WebP up to 5 MB.",
    "Bildname (optional)": "Image name (optional)",
    "Bild auswählen": "Select image",
    "Bild hinzufügen": "Add image",
    "Bildbibliothek": "Image library",
    "Hintergrund abdunkeln": "Darken background",
    "Dashboard-Effekte": "Dashboard effects",
    "Hintergrundeffekt": "Background effect",
    "Kein Effekt": "No effect",
    "Ruhige Oberfläche ohne Animation": "Calm interface without animation",
    "Sternenfeld, Raster und Lichtakzente": "Star field, grid, and light accents",
    "Bewegung": "Motion",
    "Leuchtstärke": "Glow strength",
    "Karteneffekte (Mehrfachauswahl)": "Card effects (multiple selection)",
    "Kein Karteneffekt": "No card effect",
    "Alle Karteneffekte ausschalten": "Disable all card effects",
    "Farbiges Leuchten bei Zustandsänderungen": "Colored glow on state changes",
    "Verbrauchsabhängige Farben für Energiekarten": "Consumption-based colors for energy cards",
    "Temperatur und Luftfeuchtigkeit als Farbaura": "Temperature and humidity as a color aura",
    "Alarm-Fokus": "Alert Focus",
    "Warnfarben für Sicherheit, Zugänge und Batterien": "Warning colors for security, access, and batteries",
    "Effektstärke": "Effect strength",
    "Entitäten für Status Pulse": "Entities for Status Pulse",
    "Entität suchen …": "Search entity …",
    "Keine passende Entität gefunden.": "No matching entity found.",
    "Leistungssensoren": "Power sensors",
    "Leistungssensor suchen …": "Search power sensor …",
    "Kein passender Leistungssensor gefunden.": "No matching power sensor found.",
    "Gelb ab (W)": "Yellow from (W)",
    "Rot ab (W)": "Red from (W)",
    "Klimasensoren": "Climate sensors",
    "Klimasensor suchen …": "Search climate sensor …",
    "Kein passender Klimasensor gefunden.": "No matching climate sensor found.",
    "Angenehm ab (°C)": "Comfortable from (°C)",
    "Warm ab (°C)": "Warm from (°C)",
    "Heiß ab (°C)": "Hot from (°C)",
    "Alarm- und Statussensoren": "Alert and status sensors",
    "Alarm- oder Statussensor suchen …": "Search alert or status sensor …",
    "Batterie-Warnung unter (%)": "Battery warning below (%)",
    "Beide Effekte gelten für den hellen und dunklen Modus. Bei aktivierter Systemoption „Bewegung reduzieren“ bleibt er automatisch aus.": "Both effects apply to light and dark mode. They remain disabled automatically when the system option “Reduce motion” is enabled.",
    "Home-Assistant-Standard wiederherstellen": "Restore Home Assistant default",
    "Übersicht": "Overview",
    "Karte": "Map",
    "Energie": "Energy",
    "Verlauf": "History",
    "Einstellungen": "Settings",
    "Mein Zuhause": "My Home",
    "Stromverbrauch": "Power consumption",
    "Heute 8,4 kWh": "Today 8.4 kWh",
    "Wohnzimmer": "Living room",
    "Deckenlicht": "Ceiling light",
    "Stehlampe": "Floor lamp",
    "Temperatur": "Temperature",
    "Luftfeuchtigkeit 48 %": "Humidity 48%",
    "Keine Entitäten gefunden.": "No entities found.",
    "Keine Temperatur- oder Feuchtigkeitssensoren gefunden.": "No temperature or humidity sensors found.",
    "Keine passenden Alarm- oder Statussensoren gefunden.": "No matching alert or status sensors found.",
    "Mit einem Klick importieren": "Import with one click",
    "Galerie konnte nicht geladen werden.": "The gallery could not be loaded.",
    "Aktuell sind keine veröffentlichten Designs verfügbar.": "No published designs are currently available.",
    "Wird importiert …": "Importing …",
    "Bitte einen Profilnamen eingeben.": "Please enter a profile name.",
    "Name eingeben und das aktuelle Design als neues Profil speichern.": "Enter a name and save the current design as a new profile.",
    "Die Profildatei darf höchstens 1 MB groß sein.": "The profile file must not exceed 1 MB.",
    "Übernommen": "Included",
    "Farben, Karten, Navigation und Hintergrundeinstellungen": "Colors, cards, navigation, and background settings",
    "Nicht übernommen": "Not included",
    "Lokale Bildpfade, Dashboard-Effekte und Entitätszuordnungen": "Local image paths, dashboard effects, and entity assignments",
    "Erst nach Bestätigung als neues lokales Profil": "Only saved as a new local profile after confirmation",
    "Prüfergebnis": "Validation result",
    "Die Einstellungen konnten nicht geladen werden.": "The settings could not be loaded.",
    "Version unbekannt": "Version unknown",
    "Wird hochgeladen …": "Uploading …",
    "Bitte JPG, PNG oder WebP auswählen.": "Please select a JPG, PNG, or WebP image.",
    "Das Bild darf höchstens 5 MB groß sein.": "The image must not exceed 5 MB.",
    "Bild hochgeladen. Bitte anwenden.": "Image uploaded. Please apply the changes.",
    "Datei konnte nicht gelesen werden.": "The file could not be read.",
    "Wird aktiviert …": "Applying …",
    "Aktiviert ✓": "Applied ✓",
    "Fehlgeschlagen": "Failed",
    "Design gespeichert und aktiviert.": "Design saved and applied.",
    "Wird wiederhergestellt …": "Restoring …",
    "Wiederhergestellt ✓": "Restored ✓",
    "Wiederherstellung fehlgeschlagen": "Restore failed",
    "Standarddesign wird aktiviert …": "Applying default design …",
    "Home-Assistant-Standard aktiv ✓": "Home Assistant default active ✓",
    "Hintergrundbild ausgewählt": "Background image selected",
    "Vorschau: heller Modus": "Preview: light mode",
    "Vorschau: dunkler Modus": "Preview: dark mode",
    "Profilformat": "Profile format",
    "Speicherung": "Storage",
    "Hellmodus": "Light mode",
    "Dunkelmodus": "Dark mode",
    "Keine lokalen Hintergrundbild-Pfade oder Entitätszuordnungen gefunden.": "No local background image paths or entity assignments found.",
    "Das gewählte Galerie-Design wurde nicht gefunden.": "The selected gallery design was not found.",
    "Bitte ein Profil wählen und einen Namen eingeben.": "Please select a profile and enter a name.",
    "Noch keine eigenen Bilder gespeichert.": "No custom images have been saved yet.",
    "Neuer Name des Hintergrundbildes:": "New background image name:",
    "Bitte mindestens eine Entität für Status Pulse auswählen.": "Please select at least one entity for Status Pulse.",
    "Bitte mindestens einen Leistungssensor auswählen.": "Please select at least one power sensor.",
    "Bitte mindestens einen Klimasensor auswählen.": "Please select at least one climate sensor.",
    "Bitte mindestens einen Alarm- oder Statussensor auswählen.": "Please select at least one alert or status sensor.",
    "Das zuletzt gesicherte Design wurde aktiviert.": "The most recently saved design has been activated.",
    "Der zuvor gesicherte Home-Assistant-Standard wurde aktiviert.": "The previously saved Home Assistant default has been activated.",
    "Der Vorgang ist fehlgeschlagen.": "The operation failed."
  },
  fr: {
    "Zur Übersicht": "Retour à la vue d’ensemble",
    "Community-Design wählen oder individuell gestalten.": "Choisissez un design communautaire ou créez le vôtre.",
    "Version wird geladen …": "Chargement de la version…",
    "Änderungsverlauf": "Historique des modifications",
    "Letzte Änderung rückgängig machen": "Annuler la dernière modification",
    "Rückgängig": "Annuler",
    "Änderung wiederholen": "Rétablir la modification",
    "Wiederholen": "Rétablir",
    "☀ Hell": "☀ Clair",
    "☾ Dunkel": "☾ Sombre",
    "Beide Modi anwenden": "Appliquer les deux modes",
    "Erzeugt aus dem gewählten Modus einen farblich passenden Gegenmodus": "Crée un mode de couleur opposé assorti à partir du mode sélectionné",
    "Passenden Hellmodus erzeugen": "Générer le mode clair assorti",
    "Passenden Dunkelmodus erzeugen": "Générer le mode sombre assorti",
    "Aktiviert das zuletzt gesicherte Design": "Active le dernier design enregistré",
    "Noch kein vorheriges Design gespeichert": "Aucun design précédent n’a encore été enregistré",
    "Letztes Design wiederherstellen": "Restaurer le dernier design",
    "● Nicht angewendete Änderungen": "● Modifications non appliquées",
    "Import prüfen": "Vérifier l’importation",
    "Abbrechen": "Annuler",
    "Profil importieren": "Importer le profil",
    "Community-Galerie": "Galerie communautaire",
    "Geprüfte Designs ansehen und direkt als Profil importieren.": "Parcourez les designs vérifiés et importez-les directement comme profil.",
    "Aktualisieren": "Actualiser",
    "Galerie öffnen": "Ouvrir la galerie",
    "Galerie wird geladen …": "Chargement de la galerie…",
    "Vorherige Designs anzeigen": "Afficher les designs précédents",
    "Weitere Designs anzeigen": "Afficher plus de designs",
    "Eigene Designprofile": "Mes profils de design",
    "Komplette Designs speichern, laden oder weitergeben.": "Enregistrez, chargez ou partagez des designs complets.",
    "Gespeichertes Profil": "Profil enregistré",
    "Neues Profil anlegen": "Créer un profil",
    "Profilname": "Nom du profil",
    "Zum Beispiel: Abend": "Par exemple : Soir",
    "Profil speichern": "Enregistrer le profil",
    "Profil aktualisieren": "Mettre à jour le profil",
    "Umbenennen": "Renommer",
    "Duplizieren": "Dupliquer",
    "JSON exportieren": "Exporter le JSON",
    "JSON importieren": "Importer le JSON",
    "Löschen": "Supprimer",
    "Es können bis zu 32 Profile gespeichert werden. Eigene Hintergrundbilder werden als lokaler Pfad, nicht als Bilddatei exportiert.": "Jusqu’à 32 profils peuvent être enregistrés. Les images d’arrière-plan personnalisées sont exportées sous forme de chemin local, et non de fichier image.",
    "Feineinstellungen": "Réglages avancés",
    "Einstellungen für den oben gewählten Modus.": "Réglages du mode sélectionné ci-dessus.",
    "Farben": "Couleurs",
    "Türkis": "Turquoise",
    "Blau": "Bleu",
    "Grün": "Vert",
    "Rot": "Rouge",
    "Violett": "Violet",
    "Hauptfarbe": "Couleur principale",
    "Hintergrundfarbe": "Couleur d’arrière-plan",
    "Karten": "Cartes",
    "Kartenfarbe": "Couleur des cartes",
    "Textfarbe": "Couleur du texte",
    "Symbolfarbe": "Couleur des icônes",
    "Rahmenfarbe": "Couleur de la bordure",
    "Kartendeckkraft": "Opacité des cartes",
    "Rahmenstärke": "Épaisseur de la bordure",
    "Schattenstärke": "Intensité de l’ombre",
    "Runde Ecken": "Coins arrondis",
    "Navigation": "Navigation",
    "Kopfzeile": "En-tête",
    "Text- und Symbolfarbe": "Couleur du texte et des icônes",
    "Seitenleiste": "Barre latérale",
    "Aktive Navigation": "Navigation active",
    "Die Einstellungen gelten getrennt für den oben ausgewählten hellen oder dunklen Modus.": "Les réglages s’appliquent séparément au mode clair ou sombre sélectionné ci-dessus.",
    "Hintergrund": "Arrière-plan",
    "Farbe": "Couleur",
    "Wellen": "Ondes",
    "Eigenes Bild": "Image personnalisée",
    "JPG, PNG oder WebP bis 5 MB.": "JPG, PNG ou WebP jusqu’à 5 Mo.",
    "Bildname (optional)": "Nom de l’image (facultatif)",
    "Bild auswählen": "Sélectionner une image",
    "Bild hinzufügen": "Ajouter une image",
    "Bildbibliothek": "Bibliothèque d’images",
    "Hintergrund abdunkeln": "Assombrir l’arrière-plan",
    "Dashboard-Effekte": "Effets du tableau de bord",
    "Hintergrundeffekt": "Effet d’arrière-plan",
    "Kein Effekt": "Aucun effet",
    "Ruhige Oberfläche ohne Animation": "Interface calme sans animation",
    "Sternenfeld, Raster und Lichtakzente": "Champ d’étoiles, grille et accents lumineux",
    "Bewegung": "Mouvement",
    "Leuchtstärke": "Intensité lumineuse",
    "Karteneffekte (Mehrfachauswahl)": "Effets des cartes (sélection multiple)",
    "Kein Karteneffekt": "Aucun effet de carte",
    "Alle Karteneffekte ausschalten": "Désactiver tous les effets de carte",
    "Farbiges Leuchten bei Zustandsänderungen": "Lueur colorée lors des changements d’état",
    "Verbrauchsabhängige Farben für Energiekarten": "Couleurs selon la consommation pour les cartes d’énergie",
    "Temperatur und Luftfeuchtigkeit als Farbaura": "Température et humidité sous forme d’aura colorée",
    "Alarm-Fokus": "Focus alarme",
    "Warnfarben für Sicherheit, Zugänge und Batterien": "Couleurs d’alerte pour la sécurité, les accès et les batteries",
    "Effektstärke": "Intensité de l’effet",
    "Entitäten für Status Pulse": "Entités pour Status Pulse",
    "Entität suchen …": "Rechercher une entité…",
    "Keine passende Entität gefunden.": "Aucune entité correspondante trouvée.",
    "Leistungssensoren": "Capteurs de puissance",
    "Leistungssensor suchen …": "Rechercher un capteur de puissance…",
    "Kein passender Leistungssensor gefunden.": "Aucun capteur de puissance correspondant trouvé.",
    "Gelb ab (W)": "Jaune à partir de (W)",
    "Rot ab (W)": "Rouge à partir de (W)",
    "Klimasensoren": "Capteurs climatiques",
    "Klimasensor suchen …": "Rechercher un capteur climatique…",
    "Kein passender Klimasensor gefunden.": "Aucun capteur climatique correspondant trouvé.",
    "Angenehm ab (°C)": "Confortable à partir de (°C)",
    "Warm ab (°C)": "Chaud à partir de (°C)",
    "Heiß ab (°C)": "Très chaud à partir de (°C)",
    "Alarm- und Statussensoren": "Capteurs d’alarme et d’état",
    "Alarm- oder Statussensor suchen …": "Rechercher un capteur d’alarme ou d’état…",
    "Batterie-Warnung unter (%)": "Alerte batterie sous (%)",
    "Beide Effekte gelten für den hellen und dunklen Modus. Bei aktivierter Systemoption „Bewegung reduzieren“ bleibt er automatisch aus.": "Les deux effets s’appliquent aux modes clair et sombre. Ils restent automatiquement désactivés si l’option système « Réduire les animations » est active.",
    "Home-Assistant-Standard wiederherstellen": "Restaurer le thème Home Assistant par défaut",
    "Übersicht": "Vue d’ensemble",
    "Karte": "Carte",
    "Energie": "Énergie",
    "Verlauf": "Historique",
    "Einstellungen": "Paramètres",
    "Mein Zuhause": "Ma maison",
    "Stromverbrauch": "Consommation électrique",
    "Heute 8,4 kWh": "Aujourd’hui 8,4 kWh",
    "Wohnzimmer": "Salon",
    "Deckenlicht": "Plafonnier",
    "Stehlampe": "Lampadaire",
    "Temperatur": "Température",
    "Luftfeuchtigkeit 48 %": "Humidité 48 %",
    "Keine Entitäten gefunden.": "Aucune entité trouvée.",
    "Keine Temperatur- oder Feuchtigkeitssensoren gefunden.": "Aucun capteur de température ou d’humidité trouvé.",
    "Keine passenden Alarm- oder Statussensoren gefunden.": "Aucun capteur d’alarme ou d’état correspondant trouvé.",
    "Mit einem Klick importieren": "Importer en un clic",
    "Aktuell sind keine veröffentlichten Designs verfügbar.": "Aucun design publié n’est actuellement disponible.",
    "Wird importiert …": "Importation…",
    "Bitte einen Profilnamen eingeben.": "Veuillez saisir un nom de profil.",
    "Name eingeben und das aktuelle Design als neues Profil speichern.": "Saisissez un nom et enregistrez le design actuel comme nouveau profil.",
    "Die Profildatei darf höchstens 1 MB groß sein.": "Le fichier de profil ne doit pas dépasser 1 Mo.",
    "Übernommen": "Inclus",
    "Farben, Karten, Navigation und Hintergrundeinstellungen": "Couleurs, cartes, navigation et réglages d’arrière-plan",
    "Nicht übernommen": "Non inclus",
    "Lokale Bildpfade, Dashboard-Effekte und Entitätszuordnungen": "Chemins d’images locaux, effets du tableau de bord et associations d’entités",
    "Erst nach Bestätigung als neues lokales Profil": "Enregistré comme nouveau profil local uniquement après confirmation",
    "Prüfergebnis": "Résultat de la vérification",
    "Die Einstellungen konnten nicht geladen werden.": "Impossible de charger les réglages.",
    "Version unbekannt": "Version inconnue",
    "Wird hochgeladen …": "Téléversement…",
    "Bitte JPG, PNG oder WebP auswählen.": "Veuillez sélectionner une image JPG, PNG ou WebP.",
    "Das Bild darf höchstens 5 MB groß sein.": "L’image ne doit pas dépasser 5 Mo.",
    "Bild hochgeladen. Bitte anwenden.": "Image téléversée. Veuillez appliquer les modifications.",
    "Datei konnte nicht gelesen werden.": "Impossible de lire le fichier.",
    "Wird aktiviert …": "Application…",
    "Aktiviert ✓": "Appliqué ✓",
    "Fehlgeschlagen": "Échec",
    "Design gespeichert und aktiviert.": "Design enregistré et appliqué.",
    "Wird wiederhergestellt …": "Restauration…",
    "Wiederhergestellt ✓": "Restauré ✓",
    "Wiederherstellung fehlgeschlagen": "Échec de la restauration",
    "Standarddesign wird aktiviert …": "Application du thème par défaut…",
    "Home-Assistant-Standard aktiv ✓": "Thème Home Assistant par défaut actif ✓",
    "Hintergrundbild ausgewählt": "Image d’arrière-plan sélectionnée",
    "Vorschau: heller Modus": "Aperçu : mode clair",
    "Vorschau: dunkler Modus": "Aperçu : mode sombre",
    "Profilformat": "Format du profil",
    "Speicherung": "Enregistrement",
    "Hellmodus": "Mode clair",
    "Dunkelmodus": "Mode sombre",
    "Keine lokalen Hintergrundbild-Pfade oder Entitätszuordnungen gefunden.": "Aucun chemin d’image d’arrière-plan local ni association d’entité trouvé.",
    "Das gewählte Galerie-Design wurde nicht gefunden.": "Le design sélectionné dans la galerie est introuvable.",
    "Bitte ein Profil wählen und einen Namen eingeben.": "Veuillez sélectionner un profil et saisir un nom.",
    "Noch keine eigenen Bilder gespeichert.": "Aucune image personnalisée n’a encore été enregistrée.",
    "Neuer Name des Hintergrundbildes:": "Nouveau nom de l’image d’arrière-plan :",
    "Bitte mindestens eine Entität für Status Pulse auswählen.": "Veuillez sélectionner au moins une entité pour Status Pulse.",
    "Bitte mindestens einen Leistungssensor auswählen.": "Veuillez sélectionner au moins un capteur de puissance.",
    "Bitte mindestens einen Klimasensor auswählen.": "Veuillez sélectionner au moins un capteur climatique.",
    "Bitte mindestens einen Alarm- oder Statussensor auswählen.": "Veuillez sélectionner au moins un capteur d’alarme ou d’état.",
    "Das zuletzt gesicherte Design wurde aktiviert.": "Le dernier design enregistré a été activé.",
    "Der zuvor gesicherte Home-Assistant-Standard wurde aktiviert.": "Le thème Home Assistant par défaut précédemment enregistré a été activé.",
    "Der Vorgang ist fehlgeschlagen.": "L’opération a échoué."
  },
  es: {
    "Zur Übersicht": "Volver al resumen",
    "Community-Design wählen oder individuell gestalten.": "Elige un diseño de la comunidad o crea el tuyo.",
    "Version wird geladen …": "Cargando versión…",
    "Änderungsverlauf": "Historial de cambios",
    "Letzte Änderung rückgängig machen": "Deshacer el último cambio",
    "Rückgängig": "Deshacer",
    "Änderung wiederholen": "Rehacer cambio",
    "Wiederholen": "Rehacer",
    "☀ Hell": "☀ Claro",
    "☾ Dunkel": "☾ Oscuro",
    "Beide Modi anwenden": "Aplicar ambos modos",
    "Erzeugt aus dem gewählten Modus einen farblich passenden Gegenmodus": "Crea un modo de color opuesto a juego a partir del modo seleccionado",
    "Passenden Hellmodus erzeugen": "Generar modo claro a juego",
    "Passenden Dunkelmodus erzeugen": "Generar modo oscuro a juego",
    "Aktiviert das zuletzt gesicherte Design": "Activa el último diseño guardado",
    "Noch kein vorheriges Design gespeichert": "Todavía no se ha guardado ningún diseño anterior",
    "Letztes Design wiederherstellen": "Restaurar último diseño",
    "● Nicht angewendete Änderungen": "● Cambios sin aplicar",
    "Import prüfen": "Revisar importación",
    "Abbrechen": "Cancelar",
    "Profil importieren": "Importar perfil",
    "Community-Galerie": "Galería de la comunidad",
    "Geprüfte Designs ansehen und direkt als Profil importieren.": "Explora diseños verificados e impórtalos directamente como perfil.",
    "Aktualisieren": "Actualizar",
    "Galerie öffnen": "Abrir galería",
    "Galerie wird geladen …": "Cargando galería…",
    "Vorherige Designs anzeigen": "Mostrar diseños anteriores",
    "Weitere Designs anzeigen": "Mostrar más diseños",
    "Eigene Designprofile": "Mis perfiles de diseño",
    "Komplette Designs speichern, laden oder weitergeben.": "Guarda, carga o comparte diseños completos.",
    "Gespeichertes Profil": "Perfil guardado",
    "Neues Profil anlegen": "Crear nuevo perfil",
    "Profilname": "Nombre del perfil",
    "Zum Beispiel: Abend": "Por ejemplo: Noche",
    "Profil speichern": "Guardar perfil",
    "Profil aktualisieren": "Actualizar perfil",
    "Umbenennen": "Renombrar",
    "Duplizieren": "Duplicar",
    "JSON exportieren": "Exportar JSON",
    "JSON importieren": "Importar JSON",
    "Löschen": "Eliminar",
    "Es können bis zu 32 Profile gespeichert werden. Eigene Hintergrundbilder werden als lokaler Pfad, nicht als Bilddatei exportiert.": "Se pueden guardar hasta 32 perfiles. Las imágenes de fondo personalizadas se exportan como una ruta local, no como archivo de imagen.",
    "Feineinstellungen": "Ajustes detallados",
    "Einstellungen für den oben gewählten Modus.": "Ajustes para el modo seleccionado arriba.",
    "Farben": "Colores",
    "Türkis": "Turquesa",
    "Blau": "Azul",
    "Grün": "Verde",
    "Rot": "Rojo",
    "Violett": "Violeta",
    "Hauptfarbe": "Color principal",
    "Hintergrundfarbe": "Color de fondo",
    "Karten": "Tarjetas",
    "Kartenfarbe": "Color de las tarjetas",
    "Textfarbe": "Color del texto",
    "Symbolfarbe": "Color de los iconos",
    "Rahmenfarbe": "Color del borde",
    "Kartendeckkraft": "Opacidad de las tarjetas",
    "Rahmenstärke": "Grosor del borde",
    "Schattenstärke": "Intensidad de la sombra",
    "Runde Ecken": "Esquinas redondeadas",
    "Navigation": "Navegación",
    "Kopfzeile": "Encabezado",
    "Text- und Symbolfarbe": "Color del texto y los iconos",
    "Seitenleiste": "Barra lateral",
    "Aktive Navigation": "Navegación activa",
    "Die Einstellungen gelten getrennt für den oben ausgewählten hellen oder dunklen Modus.": "Los ajustes se aplican por separado al modo claro u oscuro seleccionado arriba.",
    "Hintergrund": "Fondo",
    "Farbe": "Color",
    "Wellen": "Ondas",
    "Eigenes Bild": "Imagen personalizada",
    "JPG, PNG oder WebP bis 5 MB.": "JPG, PNG o WebP de hasta 5 MB.",
    "Bildname (optional)": "Nombre de imagen (opcional)",
    "Bild auswählen": "Seleccionar imagen",
    "Bild hinzufügen": "Añadir imagen",
    "Bildbibliothek": "Biblioteca de imágenes",
    "Hintergrund abdunkeln": "Oscurecer fondo",
    "Dashboard-Effekte": "Efectos del panel",
    "Hintergrundeffekt": "Efecto de fondo",
    "Kein Effekt": "Sin efecto",
    "Ruhige Oberfläche ohne Animation": "Interfaz tranquila sin animación",
    "Sternenfeld, Raster und Lichtakzente": "Campo de estrellas, cuadrícula y acentos de luz",
    "Bewegung": "Movimiento",
    "Leuchtstärke": "Intensidad del brillo",
    "Karteneffekte (Mehrfachauswahl)": "Efectos de tarjeta (selección múltiple)",
    "Kein Karteneffekt": "Sin efecto de tarjeta",
    "Alle Karteneffekte ausschalten": "Desactivar todos los efectos de tarjeta",
    "Farbiges Leuchten bei Zustandsänderungen": "Brillo de color al cambiar de estado",
    "Verbrauchsabhängige Farben für Energiekarten": "Colores según el consumo para tarjetas de energía",
    "Temperatur und Luftfeuchtigkeit als Farbaura": "Temperatura y humedad como aura de color",
    "Alarm-Fokus": "Enfoque de alarma",
    "Warnfarben für Sicherheit, Zugänge und Batterien": "Colores de aviso para seguridad, accesos y baterías",
    "Effektstärke": "Intensidad del efecto",
    "Entitäten für Status Pulse": "Entidades para Status Pulse",
    "Entität suchen …": "Buscar entidad…",
    "Keine passende Entität gefunden.": "No se encontró ninguna entidad coincidente.",
    "Leistungssensoren": "Sensores de potencia",
    "Leistungssensor suchen …": "Buscar sensor de potencia…",
    "Kein passender Leistungssensor gefunden.": "No se encontró ningún sensor de potencia coincidente.",
    "Gelb ab (W)": "Amarillo desde (W)",
    "Rot ab (W)": "Rojo desde (W)",
    "Klimasensoren": "Sensores climáticos",
    "Klimasensor suchen …": "Buscar sensor climático…",
    "Kein passender Klimasensor gefunden.": "No se encontró ningún sensor climático coincidente.",
    "Angenehm ab (°C)": "Confortable desde (°C)",
    "Warm ab (°C)": "Cálido desde (°C)",
    "Heiß ab (°C)": "Caluroso desde (°C)",
    "Alarm- und Statussensoren": "Sensores de alarma y estado",
    "Alarm- oder Statussensor suchen …": "Buscar sensor de alarma o estado…",
    "Batterie-Warnung unter (%)": "Aviso de batería por debajo de (%)",
    "Beide Effekte gelten für den hellen und dunklen Modus. Bei aktivierter Systemoption „Bewegung reduzieren“ bleibt er automatisch aus.": "Ambos efectos se aplican a los modos claro y oscuro. Permanecen desactivados automáticamente cuando está activa la opción del sistema «Reducir movimiento».",
    "Home-Assistant-Standard wiederherstellen": "Restaurar diseño predeterminado de Home Assistant",
    "Übersicht": "Resumen",
    "Karte": "Mapa",
    "Energie": "Energía",
    "Verlauf": "Historial",
    "Einstellungen": "Ajustes",
    "Mein Zuhause": "Mi casa",
    "Stromverbrauch": "Consumo eléctrico",
    "Heute 8,4 kWh": "Hoy 8,4 kWh",
    "Wohnzimmer": "Salón",
    "Deckenlicht": "Luz de techo",
    "Stehlampe": "Lámpara de pie",
    "Temperatur": "Temperatura",
    "Luftfeuchtigkeit 48 %": "Humedad 48 %",
    "Keine Entitäten gefunden.": "No se encontraron entidades.",
    "Keine Temperatur- oder Feuchtigkeitssensoren gefunden.": "No se encontraron sensores de temperatura o humedad.",
    "Keine passenden Alarm- oder Statussensoren gefunden.": "No se encontraron sensores de alarma o estado coincidentes.",
    "Mit einem Klick importieren": "Importar con un clic",
    "Aktuell sind keine veröffentlichten Designs verfügbar.": "Actualmente no hay diseños publicados disponibles.",
    "Wird importiert …": "Importando…",
    "Bitte einen Profilnamen eingeben.": "Introduce un nombre de perfil.",
    "Name eingeben und das aktuelle Design als neues Profil speichern.": "Introduce un nombre y guarda el diseño actual como un perfil nuevo.",
    "Die Profildatei darf höchstens 1 MB groß sein.": "El archivo de perfil no debe superar 1 MB.",
    "Übernommen": "Incluido",
    "Farben, Karten, Navigation und Hintergrundeinstellungen": "Colores, tarjetas, navegación y ajustes de fondo",
    "Nicht übernommen": "No incluido",
    "Lokale Bildpfade, Dashboard-Effekte und Entitätszuordnungen": "Rutas de imagen locales, efectos del panel y asignaciones de entidades",
    "Erst nach Bestätigung als neues lokales Profil": "Solo se guarda como perfil local nuevo después de confirmarlo",
    "Prüfergebnis": "Resultado de la validación",
    "Die Einstellungen konnten nicht geladen werden.": "No se pudieron cargar los ajustes.",
    "Version unbekannt": "Versión desconocida",
    "Wird hochgeladen …": "Subiendo…",
    "Bitte JPG, PNG oder WebP auswählen.": "Selecciona una imagen JPG, PNG o WebP.",
    "Das Bild darf höchstens 5 MB groß sein.": "La imagen no debe superar 5 MB.",
    "Bild hochgeladen. Bitte anwenden.": "Imagen subida. Aplica los cambios.",
    "Datei konnte nicht gelesen werden.": "No se pudo leer el archivo.",
    "Wird aktiviert …": "Aplicando…",
    "Aktiviert ✓": "Aplicado ✓",
    "Fehlgeschlagen": "Error",
    "Design gespeichert und aktiviert.": "Diseño guardado y aplicado.",
    "Wird wiederhergestellt …": "Restaurando…",
    "Wiederhergestellt ✓": "Restaurado ✓",
    "Wiederherstellung fehlgeschlagen": "Error al restaurar",
    "Standarddesign wird aktiviert …": "Aplicando diseño predeterminado…",
    "Home-Assistant-Standard aktiv ✓": "Diseño predeterminado de Home Assistant activo ✓",
    "Hintergrundbild ausgewählt": "Imagen de fondo seleccionada",
    "Vorschau: heller Modus": "Vista previa: modo claro",
    "Vorschau: dunkler Modus": "Vista previa: modo oscuro",
    "Profilformat": "Formato del perfil",
    "Speicherung": "Almacenamiento",
    "Hellmodus": "Modo claro",
    "Dunkelmodus": "Modo oscuro",
    "Keine lokalen Hintergrundbild-Pfade oder Entitätszuordnungen gefunden.": "No se encontraron rutas de imagen de fondo locales ni asignaciones de entidades.",
    "Das gewählte Galerie-Design wurde nicht gefunden.": "No se encontró el diseño seleccionado de la galería.",
    "Bitte ein Profil wählen und einen Namen eingeben.": "Selecciona un perfil e introduce un nombre.",
    "Noch keine eigenen Bilder gespeichert.": "Todavía no se han guardado imágenes personalizadas.",
    "Neuer Name des Hintergrundbildes:": "Nuevo nombre de la imagen de fondo:",
    "Bitte mindestens eine Entität für Status Pulse auswählen.": "Selecciona al menos una entidad para Status Pulse.",
    "Bitte mindestens einen Leistungssensor auswählen.": "Selecciona al menos un sensor de potencia.",
    "Bitte mindestens einen Klimasensor auswählen.": "Selecciona al menos un sensor climático.",
    "Bitte mindestens einen Alarm- oder Statussensor auswählen.": "Selecciona al menos un sensor de alarma o estado.",
    "Das zuletzt gesicherte Design wurde aktiviert.": "Se ha activado el último diseño guardado.",
    "Der zuvor gesicherte Home-Assistant-Standard wurde aktiviert.": "Se ha activado el diseño predeterminado de Home Assistant guardado anteriormente.",
    "Der Vorgang ist fehlgeschlagen.": "La operación ha fallado."
  }
};

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
      [/^(\d+) von (\d+) Bildern$/, "$1 of $2 images"],
      [/^(\d+) gewählt$/, "$1 selected"],
      [/^Ausgewählt: (.+)$/, "Selected: $1"],
      [/^(.+) auswählen$/, "Select $1"],
      [/^(\d+)–(\d+) von (\d+)$/, "$1–$2 of $3"],
      [/^(.+) wurde aus der Galerie importiert und als Profil gespeichert\.$/, "$1 was imported from the gallery and saved as a profile."],
      [/^(.+) geladen\. Zum Aktivieren „Beide Modi anwenden“ drücken\.$/, "$1 loaded. Press “Apply both modes” to activate it."],
      [/^(.+) wurde aktualisiert\.$/, "$1 was updated."],
      [/^(.+) wurde gespeichert\.$/, "$1 was saved."],
      [/^Profil wurde in (.+) umbenannt\.$/, "Profile was renamed to $1."],
      [/^(.+) wurde angelegt\.$/, "$1 was created."],
      [/^(.+) wurde geprüft und importiert\. Zum Aktivieren „Beide Modi anwenden“ drücken\.$/, "$1 was verified and imported. Press “Apply both modes” to activate it."],
      [/^Profil „(.+)“ wirklich löschen\?$/, "Really delete profile “$1”?"],
      [/^(.+) wurde gelöscht\. Das aktuelle Design bleibt erhalten\.$/, "$1 was deleted. The current design is retained."],
      [/^(.+) ausgewählt\. Bitte beide Modi anwenden\.$/, "$1 selected. Please apply both modes."],
      [/^Bild wurde in (.+) umbenannt\.$/, "Image was renamed to $1."],
      [/^Bild „(.+)“ wirklich löschen\?$/, "Really delete image “$1”?"],
      [/^(.+) wurde dauerhaft gelöscht\.$/, "$1 was permanently deleted."],
      [/^(.+) wurde ohne lokale Bildpfade, Effekte und Entitätszuordnungen als JSON exportiert\.$/, "$1 was exported as JSON without local image paths, effects, or entity assignments."],
      [/^Galerie konnte nicht geladen werden: (.+)$/, "The gallery could not be loaded: $1"],
      [/^Designprofile konnten nicht geladen werden: (.+)$/, "Design profiles could not be loaded: $1"],
      [/^Bildbibliothek konnte nicht geladen werden: (.+)$/, "The image library could not be loaded: $1"]
    ],
    fr: [
      [/^(\d+) von (\d+) Bildern$/, "$1 image(s) sur $2"],
      [/^(\d+) gewählt$/, "$1 sélectionné(s)"],
      [/^Ausgewählt: (.+)$/, "Sélection : $1"],
      [/^(.+) auswählen$/, "Sélectionner $1"],
      [/^(\d+)–(\d+) von (\d+)$/, "$1–$2 sur $3"],
      [/^(.+) wurde aus der Galerie importiert und als Profil gespeichert\.$/, "$1 a été importé depuis la galerie et enregistré comme profil."],
      [/^(.+) geladen\. Zum Aktivieren „Beide Modi anwenden“ drücken\.$/, "$1 chargé. Appuyez sur « Appliquer les deux modes » pour l’activer."],
      [/^(.+) wurde aktualisiert\.$/, "$1 a été mis à jour."],
      [/^(.+) wurde gespeichert\.$/, "$1 a été enregistré."],
      [/^Profil wurde in (.+) umbenannt\.$/, "Le profil a été renommé $1."],
      [/^(.+) wurde angelegt\.$/, "$1 a été créé."],
      [/^(.+) wurde geprüft und importiert\. Zum Aktivieren „Beide Modi anwenden“ drücken\.$/, "$1 a été vérifié et importé. Appuyez sur « Appliquer les deux modes » pour l’activer."],
      [/^Profil „(.+)“ wirklich löschen\?$/, "Supprimer réellement le profil « $1 » ?"],
      [/^(.+) wurde gelöscht\. Das aktuelle Design bleibt erhalten\.$/, "$1 a été supprimé. Le design actuel est conservé."],
      [/^(.+) ausgewählt\. Bitte beide Modi anwenden\.$/, "$1 sélectionné. Veuillez appliquer les deux modes."],
      [/^Bild wurde in (.+) umbenannt\.$/, "L’image a été renommée $1."],
      [/^Bild „(.+)“ wirklich löschen\?$/, "Supprimer réellement l’image « $1 » ?"],
      [/^(.+) wurde dauerhaft gelöscht\.$/, "$1 a été supprimé définitivement."],
      [/^(.+) wurde ohne lokale Bildpfade, Effekte und Entitätszuordnungen als JSON exportiert\.$/, "$1 a été exporté en JSON sans chemins d’images locaux, effets ni associations d’entités."],
      [/^Galerie konnte nicht geladen werden: (.+)$/, "Impossible de charger la galerie : $1"],
      [/^Designprofile konnten nicht geladen werden: (.+)$/, "Impossible de charger les profils de design : $1"],
      [/^Bildbibliothek konnte nicht geladen werden: (.+)$/, "Impossible de charger la bibliothèque d’images : $1"]
    ],
    es: [
      [/^(\d+) von (\d+) Bildern$/, "$1 de $2 imágenes"],
      [/^(\d+) gewählt$/, "$1 seleccionadas"],
      [/^Ausgewählt: (.+)$/, "Seleccionado: $1"],
      [/^(.+) auswählen$/, "Seleccionar $1"],
      [/^(\d+)–(\d+) von (\d+)$/, "$1–$2 de $3"],
      [/^(.+) wurde aus der Galerie importiert und als Profil gespeichert\.$/, "$1 se importó desde la galería y se guardó como perfil."],
      [/^(.+) geladen\. Zum Aktivieren „Beide Modi anwenden“ drücken\.$/, "$1 cargado. Pulsa «Aplicar ambos modos» para activarlo."],
      [/^(.+) wurde aktualisiert\.$/, "$1 se actualizó."],
      [/^(.+) wurde gespeichert\.$/, "$1 se guardó."],
      [/^Profil wurde in (.+) umbenannt\.$/, "El perfil se renombró como $1."],
      [/^(.+) wurde angelegt\.$/, "$1 se creó."],
      [/^(.+) wurde geprüft und importiert\. Zum Aktivieren „Beide Modi anwenden“ drücken\.$/, "$1 se verificó e importó. Pulsa «Aplicar ambos modos» para activarlo."],
      [/^Profil „(.+)“ wirklich löschen\?$/, "¿Eliminar realmente el perfil «$1»?"],
      [/^(.+) wurde gelöscht\. Das aktuelle Design bleibt erhalten\.$/, "$1 se eliminó. El diseño actual se conserva."],
      [/^(.+) ausgewählt\. Bitte beide Modi anwenden\.$/, "$1 seleccionado. Aplica ambos modos."],
      [/^Bild wurde in (.+) umbenannt\.$/, "La imagen se renombró como $1."],
      [/^Bild „(.+)“ wirklich löschen\?$/, "¿Eliminar realmente la imagen «$1»?"],
      [/^(.+) wurde dauerhaft gelöscht\.$/, "$1 se eliminó permanentemente."],
      [/^(.+) wurde ohne lokale Bildpfade, Effekte und Entitätszuordnungen als JSON exportiert\.$/, "$1 se exportó como JSON sin rutas de imagen locales, efectos ni asignaciones de entidades."],
      [/^Galerie konnte nicht geladen werden: (.+)$/, "No se pudo cargar la galería: $1"],
      [/^Designprofile konnten nicht geladen werden: (.+)$/, "No se pudieron cargar los perfiles de diseño: $1"],
      [/^Bildbibliothek konnte nicht geladen werden: (.+)$/, "No se pudo cargar la biblioteca de imágenes: $1"]
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

    if (this.language === "de" || !root) {
      return;
    }

    this.observer = new MutationObserver((mutations) => {
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
      || document.documentElement.lang
      || navigator.language
  );
}

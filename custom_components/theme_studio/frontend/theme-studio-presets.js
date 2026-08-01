export const THEME_STUDIO_PRESETS = {
  design_1: {
    id: "design_1",
    name: "Design 1",
    description: "Hell, weich und freundlich",
    preview: {
      background:
        "linear-gradient(145deg, #f5f5f7, #dfe7f2)",
      card: "rgba(255, 255, 255, 0.88)",
      accent: "#007aff",
      text: "#1c1c1e",
      border: "#d1d1d6",
      radius: "24px",
    },
    settings: {
      light: {
        primaryColor: "#007aff",
        backgroundColor: "#f2f2f7",
        cardColor: "#ffffff",
        cardTextColor: "#1c1c1e",
        cardIconColor: "#007aff",
        cardBorderColor: "#d1d1d6",
        cardOpacity: 90,
        cardBorderWidth: 1,
        cardShadow: 18,
        borderRadius: 24,
        darkening: 5,
        background: "color",
        backgroundImage: "",
      },
      dark: {
        primaryColor: "#0a84ff",
        backgroundColor: "#000000",
        cardColor: "#1c1c1e",
        cardTextColor: "#ffffff",
        cardIconColor: "#0a84ff",
        cardBorderColor: "#38383a",
        cardOpacity: 94,
        cardBorderWidth: 1,
        cardShadow: 22,
        borderRadius: 24,
        darkening: 20,
        background: "color",
        backgroundImage: "",
      },
    },
  },

  design_2: {
    id: "design_2",
    name: "Design 2",
    description: "Dunkel, farbig und leuchtend",
    preview: {
      background:
        "linear-gradient(145deg, #100820, #311353 55%, #130b25)",
      card: "rgba(25, 15, 42, 0.84)",
      accent: "#ffb000",
      text: "#ffffff",
      border: "#663c99",
      radius: "20px",
    },
    settings: {
      light: {
        primaryColor: "#7b2cbf",
        backgroundColor: "#f7f2ff",
        cardColor: "#ffffff",
        cardTextColor: "#251638",
        cardIconColor: "#7b2cbf",
        cardBorderColor: "#d9c2ed",
        cardOpacity: 94,
        cardBorderWidth: 1,
        cardShadow: 24,
        borderRadius: 20,
        darkening: 8,
        background: "aurora",
        backgroundImage: "",
      },
      dark: {
        primaryColor: "#ffb000",
        backgroundColor: "#100820",
        cardColor: "#19102b",
        cardTextColor: "#ffffff",
        cardIconColor: "#ffb000",
        cardBorderColor: "#663c99",
        cardOpacity: 86,
        cardBorderWidth: 1,
        cardShadow: 34,
        borderRadius: 20,
        darkening: 24,
        background: "aurora",
        backgroundImage: "",
      },
    },
  },

  design_3: {
    id: "design_3",
    name: "Design 3",
    description: "Transparent und wie Glas",
    preview: {
      background:
        "linear-gradient(135deg, #126b78, #493d8f 52%, #101927)",
      card: "rgba(255, 255, 255, 0.22)",
      accent: "#75efff",
      text: "#ffffff",
      border: "rgba(255, 255, 255, 0.55)",
      radius: "26px",
    },
    settings: {
      light: {
        primaryColor: "#168ea0",
        backgroundColor: "#dceff3",
        cardColor: "#ffffff",
        cardTextColor: "#16343a",
        cardIconColor: "#168ea0",
        cardBorderColor: "#ffffff",
        cardOpacity: 58,
        cardBorderWidth: 1,
        cardShadow: 28,
        borderRadius: 26,
        darkening: 4,
        background: "waves",
        backgroundImage: "",
      },
      dark: {
        primaryColor: "#75efff",
        backgroundColor: "#101927",
        cardColor: "#d7f8ff",
        cardTextColor: "#ffffff",
        cardIconColor: "#75efff",
        cardBorderColor: "#b8f4ff",
        cardOpacity: 30,
        cardBorderWidth: 1,
        cardShadow: 36,
        borderRadius: 26,
        darkening: 22,
        background: "aurora",
        backgroundImage: "",
      },
    },
  },

  design_4: {
    id: "design_4",
    name: "Design 4",
    description: "Klar, reduziert und kontrastreich",
    preview: {
      background: "#eeeeee",
      card: "#ffffff",
      accent: "#222222",
      text: "#111111",
      border: "#bbbbbb",
      radius: "8px",
    },
    settings: {
      light: {
        primaryColor: "#222222",
        backgroundColor: "#eeeeee",
        cardColor: "#ffffff",
        cardTextColor: "#111111",
        cardIconColor: "#222222",
        cardBorderColor: "#c7c7c7",
        cardOpacity: 100,
        cardBorderWidth: 1,
        cardShadow: 0,
        borderRadius: 8,
        darkening: 0,
        background: "color",
        backgroundImage: "",
      },
      dark: {
        primaryColor: "#f2f2f2",
        backgroundColor: "#111111",
        cardColor: "#1d1d1d",
        cardTextColor: "#ffffff",
        cardIconColor: "#f2f2f2",
        cardBorderColor: "#444444",
        cardOpacity: 100,
        cardBorderWidth: 1,
        cardShadow: 0,
        borderRadius: 8,
        darkening: 0,
        background: "color",
        backgroundImage: "",
      },
    },
  },
};

export function cloneThemeStudioPreset(presetId) {
  const preset = THEME_STUDIO_PRESETS[presetId];

  if (!preset) {
    throw new Error(
      `Unbekannte Theme-Studio-Vorlage: ${presetId}`
    );
  }

  return JSON.parse(
    JSON.stringify(preset.settings)
  );
}
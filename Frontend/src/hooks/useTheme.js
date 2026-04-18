import { useEffect, useState } from "react";

const THEMES = ["light", "dark"];

export const useTheme = () => {
  const currentTheme = localStorage.getItem("selectedTheme");

  const [theme, setTheme] = useState(currentTheme);

  document.querySelector("body").setAttribute("data-theme", theme);
  localStorage.setItem("selectedTheme", theme);

  const handleSetTheme = (selectedTheme) => {
    if (THEMES.includes(selectedTheme)) {
      document.querySelector("body").setAttribute("data-theme", theme);
      localStorage.setItem("selectedTheme", theme);
      setTheme(selectedTheme);
    }
  };

  return {
    theme,
    handleSetTheme,
  };
};

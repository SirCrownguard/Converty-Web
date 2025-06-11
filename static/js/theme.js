// static/js/theme.js
import { DEFAULT_MAIN_THEME, OTHER_MAIN_THEME_CLASSES } from './config.js';

let bodyElement;
let themeToggleButtonElement;
let mainThemeSelectElement;

/**
 * Kayıtlı tema ve renk şeması tercihlerini uygular.
 */
function applySavedPreferences() {
    // 1. Ana Tema Tercihi
    const savedMainTheme = localStorage.getItem('mainTheme') || DEFAULT_MAIN_THEME;

    // 2. Renk Şeması (Açık/Koyu Mod) Tercihi
    const savedColorScheme = localStorage.getItem('colorScheme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    // Ana Tema CSS Sınıfını Uygula:
    bodyElement.classList.remove(...OTHER_MAIN_THEME_CLASSES);
    if (savedMainTheme !== DEFAULT_MAIN_THEME && OTHER_MAIN_THEME_CLASSES.includes(savedMainTheme)) {
        bodyElement.classList.add(savedMainTheme);
    }

    // Koyu/Açık Modu Uygula:
    if (savedColorScheme === 'dark') {
        bodyElement.classList.add('app-dark-mode');
        if (themeToggleButtonElement) themeToggleButtonElement.selected = true;
    } else {
        bodyElement.classList.remove('app-dark-mode');
        if (themeToggleButtonElement) themeToggleButtonElement.selected = false;
    }

    if (mainThemeSelectElement) {
        mainThemeSelectElement.value = savedMainTheme;
    }
}

function handleThemeToggleClick() {
    if (!themeToggleButtonElement || !bodyElement) return;
    const isDarkMode = themeToggleButtonElement.selected; // md-icon-button 'selected' durumu toggle sonrası güncel olur.
    localStorage.setItem('colorScheme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
        bodyElement.classList.add('app-dark-mode');
    } else {
        bodyElement.classList.remove('app-dark-mode');
    }
}

function handleMainThemeChange(event) {
    if (!mainThemeSelectElement || !bodyElement) return;
    const newMainTheme = event.target.value;

    if (newMainTheme === null || newMainTheme === undefined) return;

    localStorage.setItem('mainTheme', newMainTheme);

    bodyElement.classList.remove(...OTHER_MAIN_THEME_CLASSES);
    if (newMainTheme !== DEFAULT_MAIN_THEME && OTHER_MAIN_THEME_CLASSES.includes(newMainTheme)) {
        bodyElement.classList.add(newMainTheme);
    }
}

export function initTheme(body, themeToggleBtn, mainThemeSel) {
    bodyElement = body;
    themeToggleButtonElement = themeToggleBtn;
    mainThemeSelectElement = mainThemeSel;

    applySavedPreferences(); // Başlangıçta kayıtlı tercihleri uygula

    if (themeToggleButtonElement) {
        themeToggleButtonElement.addEventListener('click', handleThemeToggleClick);
    }

    if (mainThemeSelectElement) {
        mainThemeSelectElement.addEventListener('change', handleMainThemeChange);
    }
}
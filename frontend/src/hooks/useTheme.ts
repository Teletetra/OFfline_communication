import {useSettingsStore} from '../store/settingsStore';
export const useTheme=()=>({darkMode:useSettingsStore(s=>s.darkMode),toggle:()=>useSettingsStore.getState().setSetting('darkMode',!useSettingsStore.getState().darkMode)});

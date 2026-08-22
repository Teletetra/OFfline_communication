import {create} from 'zustand';
import {persist} from 'zustand/middleware';
export interface SettingsState{darkMode:boolean;notifications:boolean;sound:boolean;autoReconnect:boolean;setSetting:<K extends keyof Omit<SettingsState,'setSetting'|'reset'>>(key:K,value:SettingsState[K])=>void;reset:()=>void;}
const defaults={darkMode:false,notifications:true,sound:true,autoReconnect:true};
export const useSettingsStore=create<SettingsState>()(persist((set)=>({ ...defaults,setSetting:(key,value)=>set({[key]:value} as Pick<SettingsState,K>),reset:()=>set(defaults)}),{name:'offline-chat-settings'}));

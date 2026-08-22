import {useCallback} from 'react';
import {useNotificationStore} from '../store/notificationStore';
export const useNotification=()=>{const store=useNotificationStore();const requestPermission=store.requestPermission;const notify=useCallback((title:string,body:string,data?:Record<string,unknown>)=>store.showNotification({title,body,data}),[store]);return {...store,notify,requestPermission};};

import {useEffect} from 'react';
import socketService from '../services/socketService';
export const useSocket=(userId?:string,token?:string)=>{useEffect(()=>{if(userId&&token)socketService.connect(userId,token);return()=>{if(!userId)socketService.disconnect();};},[userId,token]);return socketService;};

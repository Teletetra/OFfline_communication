import {useEffect} from 'react';
import {useBluetoothStore} from '../store/bluetoothStore';
import {bluetoothService} from '../services/bluetooth.service';
export const useBluetooth=()=>{const state=useBluetoothStore();useEffect(()=>{state.setSupported(bluetoothService.isSupported());},[]);return {...state,service:bluetoothService};};

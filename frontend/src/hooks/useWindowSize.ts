import {useEffect,useState} from 'react';
export const useWindowSize=()=>{const read=()=>({width:window.innerWidth,height:window.innerHeight});const [size,setSize]=useState(read);useEffect(()=>{const on=()=>setSize(read());window.addEventListener('resize',on);return()=>window.removeEventListener('resize',on);},[]);return size;};

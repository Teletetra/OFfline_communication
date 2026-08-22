import {useEffect,useState} from 'react';
export const useMediaQuery=(query:string)=>{const [matches,setMatches]=useState(()=>typeof window!=='undefined'&&window.matchMedia(query).matches);useEffect(()=>{const m=window.matchMedia(query),sync=()=>setMatches(m.matches);sync();m.addEventListener?.('change',sync);return()=>m.removeEventListener?.('change',sync);},[query]);return matches;};

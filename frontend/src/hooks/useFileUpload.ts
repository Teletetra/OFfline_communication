import {useCallback,useState} from 'react';
import {fileService} from '../services/file.service';
export const useFileUpload=()=>{const [uploading,setUploading]=useState(false);const [error,setError]=useState<string|null>(null);const upload=useCallback(async(file:File)=>{setUploading(true);setError(null);try{return await fileService.upload(file);}catch(e){setError(e instanceof Error?e.message:'Upload failed');throw e;}finally{setUploading(false);}},[]);return {upload,uploading,error};};

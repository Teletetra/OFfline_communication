import {API_URL} from '../config/constants';
import {FileUploadResult} from '../types/file.types';
export const fileService={upload:async(file:File):Promise<FileUploadResult>=>{const form=new FormData();form.append('file',file);const auth=localStorage.getItem('offline-chat-auth');let token='';try{token=JSON.parse(auth||'').state?.token||'';}catch{}const res=await fetch(`${API_URL}/files/upload`,{method:'POST',body:form,headers:token?{Authorization:`Bearer ${token}`}:{}});if(!res.ok)throw new Error('File upload failed');return res.json();}};

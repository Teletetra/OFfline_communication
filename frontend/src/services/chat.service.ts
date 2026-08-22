import {apiService} from './api.service';
export const chatService={conversations:()=>apiService.get('/conversations'),messages:(conversationId:string)=>apiService.get(`/conversations/${conversationId}/messages`),send:(payload:unknown)=>apiService.post('/messages',payload),createConversation:(payload:unknown)=>apiService.post('/conversations',payload)};

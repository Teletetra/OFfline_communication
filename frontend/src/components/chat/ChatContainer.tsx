import React from 'react';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import {useChatStore} from '../../store/chatStore';
import {useAuthStore} from '../../store/authStore';
export default function ChatContainer(){const s=useChatStore();const user=useAuthStore(s=>s.user);const active=s.conversations.find(c=>c.id===s.activeConversationId);const receiver=active?(active.participant1Id===user?.id?active.participant2Id:active.participant1Id):'';return <div className="chat-container"><aside><ChatSidebar conversations={s.conversations} activeConversationId={s.activeConversationId} onSelectConversation={s.setActiveConversation}/></aside><section>{s.activeConversationId?<ChatWindow messages={s.messages[s.activeConversationId]||[]} currentUserId={user?.id||''} onSend={text=>receiver?s.sendMessage(receiver,text):Promise.resolve()} disabled={s.connectionStatus==='disconnected'&&!s.bluetoothMode}/>:<p>Select a conversation</p>}</section></div>}

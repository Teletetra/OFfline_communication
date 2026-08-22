import React from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { Message } from '../../store/chatStore';
const ChatWindow:React.FC<{messages:Message[];currentUserId:string;onSend:(text:string)=>void|Promise<void>;onTyping?:()=>void;disabled?:boolean}>=({messages,currentUserId,onSend,onTyping,disabled})=><section className="chat-window"><MessageList messages={messages} currentUserId={currentUserId}/><MessageInput onSendMessage={onSend} onTyping={onTyping} disabled={disabled}/></section>;
export default ChatWindow;

import React, { FormEvent, useState } from 'react';
import './MessageInput.css';
interface Props { onSendMessage:(content:string)=>void|Promise<void>; onTyping?:()=>void; disabled?:boolean; }
const MessageInput:React.FC<Props>=({onSendMessage,onTyping,disabled})=>{const [value,setValue]=useState(''); const submit=async(e:FormEvent)=>{e.preventDefault();const text=value.trim();if(!text||disabled)return;await onSendMessage(text);setValue('');};return <form className="message-input" onSubmit={submit}><input value={value} disabled={disabled} placeholder={disabled?'Connection unavailable':'Type a message…'} onChange={e=>{setValue(e.target.value);onTyping?.();}}/><button disabled={disabled||!value.trim()} type="submit">Send</button></form>;};export default MessageInput;

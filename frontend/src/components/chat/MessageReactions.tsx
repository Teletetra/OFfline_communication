import React from 'react';
const reactions=['👍','❤️','😂','😮','😢'];
export default function MessageReactions({onReact}:{onReact?:(emoji:string)=>void}){return <div className="message-reactions">{reactions.map(r=><button type="button" key={r} onClick={()=>onReact?.(r)}>{r}</button>)}</div>}

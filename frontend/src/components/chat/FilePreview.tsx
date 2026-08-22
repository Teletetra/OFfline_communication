import React from 'react';
export default function FilePreview({file,onRemove}:{file:File;onRemove?:()=>void}){const url=URL.createObjectURL(file);return <div className="file-preview"><span>{file.name}</span><small>{Math.round(file.size/1024)} KB</small>{file.type.startsWith('image/')&&<img src={url} alt={file.name} />}{onRemove&&<button type="button" onClick={onRemove}>Remove</button>}</div>}

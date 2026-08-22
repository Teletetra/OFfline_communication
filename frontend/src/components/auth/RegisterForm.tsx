import React, { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import './AuthForms.css';

const RegisterForm: React.FC = () => {
 const navigate=useNavigate(); const registerUser=useAuthStore(s=>s.register); const [username,setUsername]=useState(''); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [confirm,setConfirm]=useState(''); const [error,setError]=useState(''); const [loading,setLoading]=useState(false);
 const submit=async(e:FormEvent)=>{e.preventDefault(); if(password!==confirm){setError('Passwords do not match');return;} setLoading(true);setError('');try{await registerUser(username,email,password);navigate('/chat',{replace:true});}catch(err){setError(err instanceof Error?err.message:'Unable to register');}finally{setLoading(false);}};
 return <form className="auth-form" onSubmit={submit}><h2>Create account</h2><p>Set up your secure offline communication account.</p><label>Username<input value={username} onChange={e=>setUsername(e.target.value)} required minLength={3}/></label><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8}/></label><label>Confirm password<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required/></label>{error&&<div className="auth-error">{error}</div>}<button disabled={loading}>{loading?'Creating…':'Create account'}</button></form>;
}; export default RegisterForm;

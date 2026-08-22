import React from 'react';
import { Link } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';
import './Login.css';
const Login: React.FC = () => <main className="auth-page"><section className="auth-card"><LoginForm/><p>New here? <Link to="/register">Create an account</Link></p></section></main>;
export default Login;

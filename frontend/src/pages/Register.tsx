import React from 'react';
import { Link } from 'react-router-dom';
import RegisterForm from '../components/auth/RegisterForm';
import './Register.css';
const Register: React.FC = () => <main className="auth-page"><section className="auth-card"><RegisterForm/><p>Already have an account? <Link to="/login">Sign in</Link></p></section></main>;
export default Register;

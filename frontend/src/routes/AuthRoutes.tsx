import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PublicRoute from './PublicRoute';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
export default function AuthRoutes(){return <Routes><Route path="/login" element={<PublicRoute><Login/></PublicRoute>}/><Route path="/register" element={<PublicRoute><Register/></PublicRoute>}/><Route path="/forgot-password" element={<PublicRoute><ForgotPassword/></PublicRoute>}/><Route path="/reset-password" element={<PublicRoute><ResetPassword/></PublicRoute>}/></Routes>;}

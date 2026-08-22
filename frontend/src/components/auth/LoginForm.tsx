// frontend-web/src/components/auth/LoginForm.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import './AuthForms.css';

const loginSchema = yup.object().shape({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
  rememberMe: yup.boolean(),
});

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

const LoginForm: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setLoginError(null);
      await login(data.email, data.password);
      navigate('/chat');
    } catch (error: any) {
      setLoginError(error.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
      <h2>Welcome Back</h2>
      <p className="auth-subtitle">Login to continue to your secure chat</p>

      {loginError && (
        <div className="error-alert">
          <i className="fas fa-exclamation-circle" />
          <span>{loginError}</span>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <div className="input-wrapper">
          <i className="fas fa-envelope" />
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            {...register('email')}
          />
        </div>
        {errors.email && <span className="error-text">{errors.email.message}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <div className="input-wrapper">
          <i className="fas fa-lock" />
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            {...register('password')}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
          >
            <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
          </button>
        </div>
        {errors.password && <span className="error-text">{errors.password.message}</span>}
      </div>

      <div className="form-options">
        <label className="checkbox-label">
          <input type="checkbox" {...register('rememberMe')} />
          <span>Remember me</span>
        </label>
        <button type="button" className="forgot-password">
          Forgot Password?
        </button>
      </div>

      <button type="submit" className="submit-button" disabled={isLoading}>
        {isLoading ? (
          <span className="loading-spinner">
            <i className="fas fa-spinner fa-spin" /> Logging in...
          </span>
        ) : (
          'Login'
        )}
      </button>

      <div className="auth-footer">
        <span>Don't have an account?</span>
        <button
          type="button"
          className="link-button"
          onClick={() => navigate('/register')}
        >
          Sign Up
        </button>
      </div>
    </form>
  );
};

export default LoginForm;
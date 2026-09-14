import React, { useState } from 'react';
import AuthInput from './AuthInput';
import SocialButtons from './SocialButtons';
import { login } from '../../api/authApi';
import { setAccessToken, setCurrentUser } from '../../api/httpClient';
import './LoginForm.css';

/**
 * LoginForm Component - handles user login and authentication state
 */
export default function LoginForm({ onLoginSuccess }) {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await login(usernameOrEmail.trim(), password);
      setAccessToken(result.accessToken);
      setCurrentUser(result);
      if (onLoginSuccess) {
        onLoginSuccess(result);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-form-container">
      <h1 className="login-form-title">Login</h1>

      <form className="login-form-body" onSubmit={handleSubmit}>
        <AuthInput
          id="login-username"
          type="text"
          placeholder="Username or email"
          value={usernameOrEmail}
          onChange={(e) => setUsernameOrEmail(e.target.value)}
          required
          autoComplete="username"
          icon="user"
        />

        <AuthInput
          id="login-password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          icon="lock"
        />

        <a
          href="#forgot-password"
          className="forgot-password-link"
          onClick={(e) => {
            e.preventDefault();
            alert('Password reset link has been requested. Check your email or contact system admin.');
          }}
        >
          Forgot Password
        </a>

        {errorMessage && (
          <div className="login-error-alert" role="alert">
            {errorMessage}
          </div>
        )}

        <button type="submit" className="login-submit-btn" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in…' : 'Login'}
        </button>

        <SocialButtons mode="login" />
      </form>
    </div>
  );
}

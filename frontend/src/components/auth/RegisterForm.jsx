import React, { useState } from 'react';
import AuthInput from './AuthInput';
import SocialButtons from './SocialButtons';
import { register } from '../../api/authApi';
import './RegisterForm.css';

/**
 * RegisterForm Component - handles user registration form and mockup state
 */
export default function RegisterForm({ onRegisterSuccess, onSwitchToLogin }) {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setNotice(null);
    setErrorMessage(null);

    try {
      await register({
        username: username.trim(),
        password,
        fullName: fullName.trim(),
        email: email.trim(),
      });
      setIsSubmitting(false);
      setNotice('Account created successfully. You can now login.');
      setTimeout(() => {
        if (onSwitchToLogin) onSwitchToLogin();
      }, 1500);
    } catch (err) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    }
  }

  return (
    <div className="register-form-container">
      <h1 className="register-form-title">Registration</h1>

      <form className="register-form-body" onSubmit={handleSubmit}>
        <AuthInput
          id="register-username"
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
          icon="user"
        />

        <AuthInput
          id="register-full-name"
          type="text"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
          icon="user"
        />

        <AuthInput
          id="register-email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          icon="mail"
        />

        <AuthInput
          id="register-password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          icon="lock"
        />

        {notice && (
          <div className="register-info-alert">
            {notice}
          </div>
        )}

        {errorMessage && (
          <div className="register-info-alert" role="alert">
            {errorMessage}
          </div>
        )}

        <button type="submit" className="register-submit-btn" disabled={isSubmitting}>
          {isSubmitting ? 'Registering…' : 'Register'}
        </button>

        <SocialButtons mode="register" />
      </form>
    </div>
  );
}

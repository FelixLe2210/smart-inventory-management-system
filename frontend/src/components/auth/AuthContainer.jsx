import React, { useState } from 'react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import TogglePanels from './TogglePanels';
import './AuthContainer.css';

/**
 * AuthContainer Component - coordinates sliding animation between Login and Register
 */
export default function AuthContainer({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div className="auth-wrapper">
      <div className={`auth-container ${isSignUp ? 'active' : ''}`}>
        {/* Login Form Box */}
        <div className="form-box login-box">
          <div style={{ width: '100%' }}>
            <LoginForm onLoginSuccess={onLoginSuccess} />
            <button
              type="button"
              className="mobile-auth-switch"
              onClick={() => setIsSignUp(true)}
            >
              Don't have an account? Register
            </button>
          </div>
        </div>

        {/* Register Form Box */}
        <div className="form-box register-box">
          <div style={{ width: '100%' }}>
            <RegisterForm
              onRegisterSuccess={() => setIsSignUp(false)}
              onSwitchToLogin={() => setIsSignUp(false)}
            />
            <button
              type="button"
              className="mobile-auth-switch"
              onClick={() => setIsSignUp(false)}
            >
              Already have an account? Login
            </button>
          </div>
        </div>

        {/* Toggle overlay panels for desktop sliding effect */}
        <TogglePanels isSignUp={isSignUp} onToggle={setIsSignUp} />
      </div>
    </div>
  );
}

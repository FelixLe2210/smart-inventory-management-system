import React, { useState } from 'react';
import './AuthInput.css';

/**
 * Reusable Auth Input with right-aligned icon and optional password toggle
 */
export default function AuthInput({
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  required = false,
  autoComplete,
  icon = 'user',
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordType = type === 'password';
  const effectiveType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

  const renderIcon = () => {
    if (isPasswordType) {
      return (
        <span
          className="auth-input-icon clickable"
          onClick={() => setShowPassword(!showPassword)}
          title={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            // Eye slash / unlocked icon
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
            </svg>
          ) : (
            // Lock icon
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          )}
        </span>
      );
    }

    if (icon === 'mail') {
      return (
        <span className="auth-input-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
        </span>
      );
    }

    // Default user icon
    return (
      <span className="auth-input-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
        </svg>
      </span>
    );
  };

  return (
    <div className="auth-input-group">
      <input
        id={id}
        type={effectiveType}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        className="auth-input-field"
      />
      {renderIcon()}
    </div>
  );
}

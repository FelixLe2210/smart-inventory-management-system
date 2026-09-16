import React from 'react';
import './TogglePanels.css';

/**
 * TogglePanels Component - contains the animated overlay and switch buttons
 */
export default function TogglePanels({ isSignUp, onToggle }) {
  return (
    <div className="toggle-box">
      {/* Left panel visible in Login mode: invites user to Register */}
      <div className="toggle-panel toggle-left">
        <h2 className="toggle-panel-title">Hello, Welcome</h2>
        <p className="toggle-panel-subtitle">Don't have an Account</p>
        <button
          type="button"
          className="toggle-panel-btn"
          onClick={() => onToggle(true)}
        >
          Register
        </button>
      </div>

      {/* Right panel visible in SignUp mode: invites user to Login */}
      <div className="toggle-panel toggle-right">
        <h2 className="toggle-panel-title">Welcome Back!</h2>
        <p className="toggle-panel-subtitle">Already have an Account</p>
        <button
          type="button"
          className="toggle-panel-btn"
          onClick={() => onToggle(false)}
        >
          Login
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import AuthContainer from '../components/auth/AuthContainer';
import { getCurrentUser, clearAccessToken, clearCurrentUser } from '../api/httpClient';
import './LoginPage.css';

/**
 * LoginPage entry point - delegates presentation to the modular AuthContainer
 */
export default function LoginPage() {
  const [loggedInUser, setLoggedInUser] = useState(() => getCurrentUser());

  const handleLogout = () => {
    clearAccessToken();
    clearCurrentUser();
    setLoggedInUser(null);
  };

  if (loggedInUser) {
    return (
      <div className="auth-wrapper">
        <div className="login-success-card">
          <div className="login-success-badge">Authentication Successful</div>
          <h1>Welcome, {loggedInUser.username}</h1>
          <div className="login-success-details">
            <p><strong>Email:</strong> {loggedInUser.email}</p>
            <p><strong>Roles:</strong> {loggedInUser.roles?.join(', ') || 'none'}</p>
            <p><strong>User ID:</strong> {loggedInUser.id}</p>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Connected end-to-end (React → Spring Boot → MySQL).
          </p>
          <button type="button" className="logout-btn" onClick={handleLogout}>
            Log out / Switch account
          </button>
        </div>
      </div>
    );
  }

  return <AuthContainer onLoginSuccess={(user) => setLoggedInUser(user)} />;
}

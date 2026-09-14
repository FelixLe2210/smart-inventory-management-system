import { useState } from 'react';
import { login } from '../api/authApi';
import { setAccessToken } from '../api/httpClient';
import './LoginPage.css';

export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loggedInUser, setLoggedInUser] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const result = await login(usernameOrEmail, password);
      setAccessToken(result.accessToken);
      setLoggedInUser(result);
    } catch (err) {
      // err is always an ApiClientError here (see httpClient.js), so
      // err.message is already a safe, user-facing string for every
      // failure case: invalid credentials, validation error, or network error.
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loggedInUser) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>Welcome, {loggedInUser.username}</h1>
          <p>Email: {loggedInUser.email}</p>
          <p>Roles: {loggedInUser.roles.join(', ') || 'none'}</p>
          <p className="login-hint">
            Login succeeded end-to-end (React → Spring Boot → MySQL). Dashboard UI
            comes in a later milestone.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Sign in</h1>

        <label htmlFor="usernameOrEmail">Username or email</label>
        <input
          id="usernameOrEmail"
          type="text"
          value={usernameOrEmail}
          onChange={(e) => setUsernameOrEmail(e.target.value)}
          autoComplete="username"
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {errorMessage && <p className="login-error">{errorMessage}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="login-hint">Dev demo account: admin / Admin@123</p>
      </form>
    </div>
  );
}

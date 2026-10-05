import React, { useState } from 'react';
import AuthInput from './AuthInput';
import SocialButtons from './SocialButtons';
import { login } from '../../api/authApi';
import { setAccessToken, setCurrentUser } from '../../api/httpClient';
import './LoginForm.css';

/**
 * LoginForm Component - xử lý đăng nhập người dùng qua backend.
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
      if (!result?.accessToken) {
        throw new Error('Backend không trả về access token hợp lệ.');
      }
      setAccessToken(result.accessToken);
      setCurrentUser(result);
      if (onLoginSuccess) {
        onLoginSuccess(result);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản & mật khẩu.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-form-container">
      <h1 className="login-form-title">Đăng nhập Smart Inventory</h1>
      <p className="font-body-sm text-[13px] text-secondary text-center mb-4">
        Demand Forecasting & Reorder Recommendation System
      </p>

      <form className="login-form-body" onSubmit={handleSubmit}>
        <AuthInput
          id="login-username"
          type="text"
          placeholder="Tên đăng nhập hoặc Email"
          value={usernameOrEmail}
          onChange={(e) => setUsernameOrEmail(e.target.value)}
          required
          autoComplete="username"
          icon="user"
        />

        <AuthInput
          id="login-password"
          type="password"
          placeholder="Mật khẩu"
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
            alert('Yêu cầu đặt lại mật khẩu đã được gửi đến quản trị viên hệ thống.');
          }}
        >
          Quên mật khẩu?
        </a>

        {errorMessage && (
          <div className="login-error-alert" role="alert">
            {errorMessage}
          </div>
        )}

        <button type="submit" className="login-submit-btn" disabled={isSubmitting}>
          {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>

        <SocialButtons mode="login" />
      </form>
    </div>
  );
}

import React, { useState } from 'react';
import AuthInput from './AuthInput';
import SocialButtons from './SocialButtons';
import { login } from '../../api/authApi';
import { setAccessToken, setCurrentUser } from '../../api/httpClient';
import './LoginForm.css';

export const DEMO_ACCOUNTS = {
  admin: {
    username: 'admin',
    password: 'Admin@123',
    name: 'Quản trị viên Hệ thống',
    email: 'admin@smartinventory.vn',
    roles: ['ROLE_ADMIN'],
  },
  tester: {
    username: 'tester',
    password: 'Tester@123',
    name: 'Lý Nguyễn (Quản lý kho)',
    email: 'tester@smartinventory.vn',
    roles: ['ROLE_MANAGER'],
  },
  staff: {
    username: 'staff',
    password: 'Staff@123',
    name: 'Trần Văn Nhân (Nhân viên)',
    email: 'staff@smartinventory.vn',
    roles: ['ROLE_STAFF'],
  },
};

/**
 * LoginForm Component - xử lý đăng nhập người dùng với hỗ trợ kết nối backend & fallback tài khoản test.
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

    const u = usernameOrEmail.trim();
    const p = password;

    try {
      // 1. Thử gọi API xác thực với Backend
      const result = await login(u, p);
      setAccessToken(result.accessToken || 'jwt-backend-token');
      setCurrentUser(result);
      if (onLoginSuccess) {
        onLoginSuccess(result);
      }
    } catch (err) {
      // 2. Nếu Backend offline hoặc không có kết nối, kiểm tra tài khoản test mẫu
      const matchedDemo = Object.values(DEMO_ACCOUNTS).find(
        (acc) => (acc.username === u || acc.email === u) && acc.password === p
      );

      if (matchedDemo) {
        const demoSession = {
          id: matchedDemo.username === 'admin' ? 1 : matchedDemo.username === 'tester' ? 2 : 3,
          username: matchedDemo.username,
          name: matchedDemo.name,
          email: matchedDemo.email,
          roles: matchedDemo.roles,
          accessToken: `demo-token-${matchedDemo.username}`,
        };
        setAccessToken(demoSession.accessToken);
        setCurrentUser(demoSession);
        if (onLoginSuccess) {
          onLoginSuccess(demoSession);
        }
        return;
      }

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

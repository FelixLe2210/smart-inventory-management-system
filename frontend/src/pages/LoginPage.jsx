import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../api/httpClient';
import AuthPanel from '../components/auth/AuthPanel';
import ThemeToggle from '../components/ThemeToggle';
import ForecastScene from './auth/ForecastScene';
import './auth/auth.css';

const DEFAULT_LANDING = '/dashboard';
const EXIT_MS = 380;

/** Trang đăng nhập: thẻ kính nổi trên nền biểu đồ dự báo, chỉ có tên dự án. */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || DEFAULT_LANDING;
  const [loggedInUser, setLoggedInUser] = useState(() => getCurrentUser());
  const [leaving, setLeaving] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (loggedInUser) navigate(from, { replace: true });
  }, [loggedInUser, navigate, from]);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Đăng nhập xong: thẻ mờ dần rồi mới chuyển trang cho mượt.
  function handleAuthenticated(user) {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setLoggedInUser(user);
      return;
    }
    setLeaving(true);
    timer.current = setTimeout(() => setLoggedInUser(user), EXIT_MS);
  }

  return (
    <div className="auth-root relative isolate flex min-h-screen flex-col overflow-hidden bg-surface text-on-surface">
      <div className="auth-glow pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <ForecastScene />

      <header className="relative z-10 flex justify-end p-4 sm:p-5">
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-start px-5 pb-16 pt-[clamp(8px,10vh,110px)]">
        <div className={`w-full max-w-[400px] ${leaving ? 'auth-exit' : 'auth-card-in'}`}>
          <div className="mb-7 flex items-center justify-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-on-primary shadow-card">
              <span className="material-symbols-outlined text-[26px]" aria-hidden="true">deployed_code</span>
            </div>
            <h1 className="text-[24px] font-bold tracking-tight text-on-surface">Smart Inventory</h1>
          </div>

          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest/80 p-6 shadow-lift backdrop-blur-xl sm:p-7">
            <AuthPanel onAuthenticated={handleAuthenticated} />
          </div>
        </div>
      </main>
    </div>
  );
}

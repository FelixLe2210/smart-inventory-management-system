import { useEffect, useState } from 'react';
import { getAuthProviders } from '../../api/authApi';
import AnimatedHeight from './AnimatedHeight';
import AuthAlert from './AuthAlert';
import LoginForm from './LoginForm';
import PhoneAuth from './PhoneAuth';
import RegisterForm from './RegisterForm';
import SocialButtons from './SocialButtons';

const TABS = [
  { id: 'login', label: 'Đăng nhập' },
  { id: 'register', label: 'Đăng ký' },
];
const ORDER = { login: 0, register: 1, phone: 2 };
// Tài khoản mẫu chỉ hiện khi chạy `npm run dev`, không có trong bản build.
const DEV_ACCOUNTS = import.meta.env.DEV
  ? [
      { key: 'admin', identity: 'admin', password: 'Admin@123' },
      { key: 'tester', identity: 'tester', password: 'Tester@123' },
      { key: 'staff', identity: 'staff', password: 'Staff@123' },
    ]
  : [];

/**
 * Khung đăng nhập/đăng ký: hai tab, ba nút đăng nhập nhanh (Google, Facebook, điện thoại) và biểu mẫu.
 * Máy chủ cho biết cách đăng nhập nào đang bật (GET /api/auth/providers).
 */
export default function AuthPanel({ onAuthenticated }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [method, setMethod] = useState('password'); // 'password' | 'phone'
  const [dir, setDir] = useState(0); // hướng trượt của nội dung mới: -1 trái, 1 phải
  const [providers, setProviders] = useState(null);
  const [providersFailed, setProvidersFailed] = useState(false);
  const [notice, setNotice] = useState(null); // { kind, text }
  const [prefill, setPrefill] = useState(null);

  useEffect(() => {
    let alive = true;
    getAuthProviders()
      .then((data) => alive && setProviders(data))
      .catch(() => alive && setProvidersFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const canRegister = providers?.registrationEnabled !== false;
  const activeMode = canRegister ? mode : 'login';
  const view = method === 'phone' ? 'phone' : activeMode;

  function go(nextMode, nextMethod) {
    const next = nextMethod === 'phone' ? 'phone' : nextMode;
    setDir(Math.sign(ORDER[next] - ORDER[view]));
    setMode(nextMode);
    setMethod(nextMethod);
    setNotice(null);
  }

  function handleTabKeyDown(event) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    go(activeMode === 'login' ? 'register' : 'login', 'password');
    event.currentTarget.parentElement?.querySelector('[aria-selected="false"]')?.focus();
  }

  return (
    <div>
      {canRegister && (
        <div
          role="tablist"
          aria-label="Đăng nhập hoặc đăng ký"
          className="relative grid grid-cols-2 rounded-xl bg-surface-container p-1"
          onKeyDown={handleTabKeyDown}
        >
          <span
            aria-hidden="true"
            className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-lg bg-surface-bright shadow-card transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              activeMode === 'register' ? 'translate-x-full' : 'translate-x-0'
            }`}
          />
          {TABS.map((tab) => {
            const selected = activeMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => go(tab.id, 'password')}
                className={`relative z-10 h-9 rounded-lg text-[14px] font-semibold transition-colors duration-200 ${
                  selected ? 'text-on-surface' : 'text-secondary hover:text-on-surface'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      <div className={canRegister ? 'mt-5' : ''}>
        <AnimatedHeight>
          <div key={view} className="auth-swap" style={{ '--dx': `${dir * 18}px`, '--dy': dir ? '0px' : '8px' }}>
            {view === 'phone' ? (
              <>
                <button
                  type="button"
                  onClick={() => go(mode, 'password')}
                  className="mb-4 inline-flex items-center gap-1 rounded-md pr-2 text-[13px] font-medium text-secondary transition-colors hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
                  Quay lại
                </button>
                <PhoneAuth enabled={providers?.phoneEnabled !== false} onAuthenticated={onAuthenticated} />
              </>
            ) : (
              <>
                {activeMode === 'login' ? (
                  <LoginForm onAuthenticated={onAuthenticated} prefill={prefill} />
                ) : (
                  <RegisterForm onAuthenticated={onAuthenticated} />
                )}

                <div className="my-5 flex items-center gap-3 text-[12px] text-secondary" aria-hidden="true">
                  <span className="h-px flex-1 bg-outline-variant" />
                  hoặc
                  <span className="h-px flex-1 bg-outline-variant" />
                </div>

                <SocialButtons
                  providers={providers}
                  providersFailed={providersFailed}
                  onAuthenticated={onAuthenticated}
                  onPhone={() => go(mode, 'phone')}
                  onNotice={setNotice}
                />
                {notice && (
                  <div className="mt-3">
                    <AuthAlert kind={notice.kind}>{notice.text}</AuthAlert>
                  </div>
                )}

                {activeMode === 'login' && DEV_ACCOUNTS.length > 0 && (
                  <div className="mt-4 flex justify-center gap-1.5" aria-label="Tài khoản mẫu (chỉ khi chạy dev)">
                    {DEV_ACCOUNTS.map((d) => (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => setPrefill({ ...d, n: Date.now() })}
                        className="rounded-full border border-outline-variant px-2.5 py-1 text-[11px] font-medium text-secondary transition-colors hover:border-primary hover:text-primary"
                      >
                        {d.key}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </AnimatedHeight>
      </div>
    </div>
  );
}

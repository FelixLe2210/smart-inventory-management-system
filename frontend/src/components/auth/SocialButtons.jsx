import React from 'react';
import './SocialButtons.css';

/**
 * Social Media login/register buttons row
 */
export default function SocialButtons({ mode = 'login' }) {
  const text = mode === 'login' ? 'or login with social platforms' : 'or register with social platforms';

  return (
    <div className="social-auth-wrapper">
      <span className="social-auth-text">{text}</span>
      <div className="social-icons-container">
        {/* Google (always available or on register) */}
        {mode === 'register' && (
          <button type="button" className="social-icon-btn" title="Google" aria-label="Google">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.35 11.1h-9.17v2.98h5.27c-.23 1.25-.94 2.31-2 3.02v2.51h3.24c1.89-1.74 2.98-4.31 2.98-7.39 0-.71-.06-1.4-.32-2.12z" />
              <path d="M12.18 21c2.7 0 4.96-.9 6.62-2.45l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.59-4.12H3.25v2.59C4.89 18.71 8.27 21 12.18 21z" />
              <path d="M6.59 12.88c-.2-.6-.31-1.24-.31-1.88 0-.64.11-1.28.31-1.88V6.53H3.25C2.59 7.84 2.22 9.38 2.22 11s.37 3.16 1.03 4.47l3.34-2.59z" />
              <path d="M12.18 5.92c1.47 0 2.79.51 3.82 1.5l2.87-2.87C17.13 2.94 14.87 2 12.18 2 8.27 2 4.89 4.29 3.25 7.53l3.34 2.59c.78-2.36 2.99-4.12 5.59-4.12z" />
            </svg>
          </button>
        )}

        {/* Facebook */}
        <button type="button" className="social-icon-btn" title="Facebook" aria-label="Facebook">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8v-6.93H7.5v-2.87H10V9.8c0-2.47 1.47-3.83 3.72-3.83 1.08 0 2.21.19 2.21.19v2.43h-1.25c-1.22 0-1.6.76-1.6 1.54v1.87h2.74l-.44 2.87h-2.3V21.8c4.56-.93 8-4.96 8-9.8z" />
          </svg>
        </button>

        {/* GitHub */}
        <button type="button" className="social-icon-btn" title="GitHub" aria-label="GitHub">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
        </button>

        {/* LinkedIn */}
        <button type="button" className="social-icon-btn" title="LinkedIn" aria-label="LinkedIn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76c-.97 0-1.75-.79-1.75-1.76s.78-1.76 1.75-1.76c.97 0 1.76.79 1.76 1.76s-.79 1.76-1.76 1.76m1.39 9.74v-8.37H5.07v8.37h2.78z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

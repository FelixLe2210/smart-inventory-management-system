import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Phông tự lưu trong ứng dụng (chạy được khi không có Internet): chữ Việt có dấu, mã/số lượng, biểu tượng.
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource-variable/material-symbols-outlined/wght.css';
import App from './App.jsx';
import { ThemeProvider } from './theme/ThemeProvider.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);

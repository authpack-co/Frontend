import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { NotificationsProvider } from './components/Notifications.jsx';
import { AuthProvider } from './lib/auth.jsx';
import AppRoutes from './app/routes.jsx';
import './app/base.css';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <BrowserRouter>
            <NotificationsProvider>
                <AuthProvider>
                    <AppRoutes />
                </AuthProvider>
            </NotificationsProvider>
        </BrowserRouter>
    </StrictMode>
);

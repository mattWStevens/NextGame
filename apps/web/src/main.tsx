import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import './index.css';
import { TrpcProvider } from './providers/TrpcProvider';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <TrpcProvider>
            <RouterProvider router={router} />
        </TrpcProvider>
    </React.StrictMode>,
);

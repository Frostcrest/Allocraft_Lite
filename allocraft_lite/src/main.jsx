import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from '@/App.jsx'
import { queryClient } from '@/api/enhancedClient'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <App />
            {/* ReactQueryDevtools disabled to reduce console noise */}
            {/* <ReactQueryDevtools initialIsOpen={false} /> */}
        </QueryClientProvider>
    </React.StrictMode>
)
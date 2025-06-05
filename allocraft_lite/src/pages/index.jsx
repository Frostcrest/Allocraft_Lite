import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Stocks from "./Stocks";

import Options from "./Options";

import Wheels from "./Wheels";

import Login from "./Login.jsx";

import Register from "./Register.jsx";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";

const PAGES = {
    
    Dashboard: Dashboard,
    
    Stocks: Stocks,
    
    Options: Options,
    
    Wheels: Wheels,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                
                <Route path="/Stocks" element={<Stocks />} />
                
                <Route path="/Options" element={<Options />} />
                
                <Route path="/Wheels" element={<Wheels />} />
                
                <Route path="/login" element={<Login />} />
                
                <Route path="/register" element={<Register />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

<link rel="icon" type="image/png" href="/src/assets/allocraft_logo.png" />
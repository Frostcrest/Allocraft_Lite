import Layout from "./Layout.jsx";
import Dashboard from "./Dashboard";
import Stocks from "./Stocks";
import Options from "./Options";
import Wheels from "./Wheels";
import Login from "./Login.jsx";
import Register from "./Register.jsx";
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from "@/context/AuthContext";

const PAGES = {
    Dashboard: Dashboard,
    Stocks: Stocks,
    Options: Options,
    Wheels: Wheels,
};

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

// Splash screen that blocks access until logged in
function AuthGate({ children }) {
    const { token } = useAuth();
    const location = useLocation();

    if (!token && location.pathname !== "/login" && location.pathname !== "/register") {
        return <Navigate to="/login" replace />;
    }
    return children;
}

function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);

    return (
        <AuthGate>
            <Layout currentPageName={currentPage}>
                <Routes>
                    <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                    <Route path="/Dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                    <Route path="/Stocks" element={<PrivateRoute><Stocks /></PrivateRoute>} />
                    <Route path="/Options" element={<PrivateRoute><Options /></PrivateRoute>} />
                    <Route path="/Wheels" element={<PrivateRoute><Wheels /></PrivateRoute>} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                </Routes>
            </Layout>
        </AuthGate>
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
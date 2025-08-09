import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Stocks from "./Stocks";

import Options from "./Options";

import Wheels from "./Wheels";
import WheelsLotsMock from "./WheelsLotsMock.jsx";
import LotTimelinePage from "@/features/wheels/LotTimelinePage";
import Profile from "./Profile";

import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import Login from "../pages/Login.jsx";
import Signup from "../pages/Signup.jsx";

function isAuthed() {
    return !!sessionStorage.getItem("allocraft_token");
}

function RequireAuth({ children }) {
    if (!isAuthed()) {
        return <Navigate to="/login" replace />;
    }
    return children;
}

const PAGES = {

    Dashboard: Dashboard,

    Stocks: Stocks,

    Options: Options,

    Wheels: Wheels,
    Profile: Profile,

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
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            {/* Public mock route for easy design preview */}
            <Route path="/WheelsLotsMock" element={<WheelsLotsMock />} />
            <Route path="/LotTimelineMock" element={<LotTimelinePage />} />
            <Route
                path="/*"
                element={
                    <RequireAuth>
                        <Layout currentPageName={currentPage}>
                            <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/Dashboard" element={<Dashboard />} />
                                <Route path="/Stocks" element={<Stocks />} />
                                <Route path="/Options" element={<Options />} />
                                <Route path="/Wheels" element={<Wheels />} />
                                <Route path="/Profile" element={<Profile />} />
                            </Routes>
                        </Layout>
                    </RequireAuth>
                }
            />
        </Routes>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}

<link rel="icon" type="image/png" href="/src/assets/allocraft_logo.png" />
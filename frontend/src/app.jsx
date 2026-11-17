
import { useEffect, useState } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet
} from "react-router-dom";

import { apiRequest } from "./services/api.js";

import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import SubstationLocations from "./pages/SubstationLocations.jsx";
import LocationEquipment from "./pages/LocationEquipment.jsx";
import EquipmentDetails from "./pages/EquipmentDetails.jsx";
import Inventory from "./pages/Inventory.jsx";
import MainLayout from "./layouts/MainLayout.jsx";
import Reports from "./pages/Reports.jsx";
import UserManagement from "./pages/UserManagement.jsx";


// ==========================================
// Verify JWT and retrieve user from FastAPI
// ==========================================

function useAuth() {
  const [status, setStatus] = useState("checking");
  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;

    const checkAuthentication = async () => {
      const token = localStorage.getItem("access_token");

      if (!token) {
        if (active) {
          setUser(null);
          setStatus("unauthenticated");
        }
        return;
      }

      try {
        // Validate JWT and retrieve current role
        const userData = await apiRequest("/auth/me");

        if (active) {
          setUser(userData);
          setStatus("authenticated");
        }
      } catch {
        // Remove invalid or expired session
        localStorage.removeItem("access_token");
        localStorage.removeItem("isLoggedIn");

        if (active) {
          setUser(null);
          setStatus("unauthenticated");
        }
      }
    };

    checkAuthentication();

    return () => {
      active = false;
    };
  }, []);

  return { status, user };
}


// ==========================================
// Protect all application pages
// ==========================================

function ProtectedRoute() {
  const { status } = useAuth();

  if (status === "checking") {
    return <p>Checking authentication...</p>;
  }

  return status === "authenticated"
    ? <Outlet />
    : <Navigate to="/" replace />;
}


// ==========================================
// Handle login page access
// ==========================================

function LoginRoute() {
  const { status } = useAuth();

  if (status === "checking") {
    return <p>Checking authentication...</p>;
  }

  return status === "authenticated"
    ? <Navigate to="/dashboard" replace />
    : <Login />;
}


// ==========================================
// Admin-only route protection
// ==========================================

function AdminRoute() {
  const { status, user } = useAuth();

  if (status === "checking") {
    return <p>Checking administrator access...</p>;
  }

  if (status !== "authenticated") {
    return <Navigate to="/" replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}


// ==========================================
// Application routing
// ==========================================

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Login Page */}
        <Route
          path="/"
          element={<LoginRoute />}
        />

        {/* Authenticated Pages */}
        <Route element={<ProtectedRoute />}>

          <Route element={<MainLayout />}>

            {/* Dashboard */}
            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            {/* Substation Locations */}
            <Route
              path="/substations"
              element={<SubstationLocations />}
            />

            {/* Equipment List */}
            <Route
              path="/substations/:locationId/equipment"
              element={<LocationEquipment />}
            />

            {/* Equipment Details */}
            <Route
              path="/substations/:locationId/equipment/:equipmentId"
              element={<EquipmentDetails />}
            />

            {/* Inventory */}
            <Route
              path="/inventory"
              element={<Inventory />}
            />

            {/* Reports */}
            <Route
              path="/reports"
              element={<Reports />}
            />

            {/* Administrator-only Pages */}
            <Route element={<AdminRoute />}>

              <Route
                path="/users"
                element={<UserManagement />}
              />

            </Route>

          </Route>

        </Route>

        {/* Invalid Routes */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;


import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet
} from "react-router-dom";

import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import SubstationLocations from "./pages/SubstationLocations.jsx";
import LocationEquipment from "./pages/LocationEquipment.jsx";
import EquipmentDetails from "./pages/EquipmentDetails.jsx";
import Inventory from "./pages/Inventory.jsx";
import MainLayout from "./layouts/MainLayout.jsx";
import Reports from "./pages/Reports.jsx";

// Protect application pages
function ProtectedRoute() {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  return isLoggedIn ? <Outlet /> : <Navigate to="/" replace />;
}

// Handle login page access
function LoginRoute() {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  return isLoggedIn
    ? <Navigate to="/dashboard" replace />
    : <Login />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Login */}
        <Route path="/" element={<LoginRoute />} />

        {/* Protected Pages */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>

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

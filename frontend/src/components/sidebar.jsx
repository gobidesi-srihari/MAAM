
import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { apiRequest } from "../services/api.js";

function Sidebar() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);

  // Get logged-in user's role from FastAPI
  useEffect(() => {
    let active = true;

    const fetchUser = async () => {
      try {
        const user = await apiRequest("/auth/me");

        if (active) {
          setUserRole(user.role);
        }
      } catch (error) {
        console.error("Unable to retrieve user role:", error);

        if (active) {
          setUserRole(null);
        }
      }
    };

    fetchUser();

    return () => {
      active = false;
    };
  }, []);

  // Common menu items for all logged-in users
  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: "📊" },
    { name: "Substation Locations", path: "/substations", icon: "📍" },
    { name: "Inventory", path: "/inventory", icon: "📦" },
    { name: "Reports", path: "/reports", icon: "📑" }
  ];

  // Add User Management only for administrators
  if (userRole === "admin") {
    menuItems.push({
      name: "User Management",
      path: "/users",
      icon: "👥"
    });
  }

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("isLoggedIn");

    navigate("/", { replace: true });
    window.location.reload();
  };

  return (
    <aside className="sidebar">

      <div className="sidebar-brand">
        <h2>IGCAR</h2>
        <p>Electrical Inventory</p>
        <span>Inspection & Condition Monitoring</span>
      </div>

      <nav className="sidebar-menu">
        <p className="menu-heading">MAIN MENU</p>

        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive ? "sidebar-link active" : "sidebar-link"
            }
          >
            <span>{item.icon}</span>
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className="sidebar-logout"
          onClick={handleLogout}
        >
          <span>🚪</span>
          Logout
        </button>
      </div>

    </aside>
  );
}

export default Sidebar;


import { NavLink, useNavigate } from "react-router-dom";

function Sidebar() {
  const navigate = useNavigate();

  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: "📊" },
    { name: "Substation Locations", path: "/substations", icon: "📍" },
    { name: "Inventory", path: "/inventory", icon: "📦" },
    { name: "Reports", path: "/reports", icon: "📑" }
  ];

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    navigate("/");
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

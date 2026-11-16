
import { useLocation } from "react-router-dom";

function Header() {
  const location = useLocation();

  const pageTitles = {
    "/dashboard": "Dashboard",
    "/substations": "Substation Locations",
    "/inventory": "Equipment Inventory",
    "/reports": "Reports"
  };

  const pageTitle = pageTitles[location.pathname] || "IGCAR Electrical Inventory";

  return (
    <header className="main-header">
      <div className="header-title">
        <h2>{pageTitle}</h2>
        <p>Electrical Equipment Inspection & Condition Monitoring</p>
      </div>

      <div className="header-user">
        <div className="user-avatar">A</div>
        <div>
          <strong>Administrator</strong>
          <p>System User</p>
        </div>
      </div>
    </header>
  );
}

export default Header;


import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { apiRequest } from "../services/api";

function Header() {
  const location = useLocation();

  const [user, setUser] = useState(null);

  const pageTitles = {
    "/dashboard": "Dashboard",
    "/substations": "Substation Locations",
    "/inventory": "Equipment Inventory",
    "/reports": "Reports",
    "/users": "User Management",
  };

  const pageTitle =
    pageTitles[location.pathname] ||
    "IGCAR Electrical Inventory";

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await apiRequest("/auth/me");
        setUser(data);
      } catch (error) {
        console.error(
          "Failed to fetch logged-in user:",
          error
        );
      }
    };

    fetchUser();
  }, []);

  const displayName = user?.full_name || "Loading...";

  const displayRole = user?.role
    ? user.role.charAt(0).toUpperCase() +
      user.role.slice(1)
    : "";

  const avatarLetter = user?.full_name
    ? user.full_name.charAt(0).toUpperCase()
    : "?";

  return (
    <header className="main-header">
      <div className="header-title">
        <h2>{pageTitle}</h2>
        <p>
          Electrical Equipment Inspection &amp;
          Condition Monitoring
        </p>
      </div>

      <div className="header-user">
        <div className="user-avatar">
          {avatarLetter}
        </div>

        <div>
          <strong>{displayName}</strong>
          <p>{displayRole}</p>
        </div>
      </div>
    </header>
  );
}

export default Header;


import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAssetSchedules } from "../services/api";

function Dashboard() {
  const navigate = useNavigate();
  const [upcomingTests, setUpcomingTests] = useState([]);
  const [scheduleError, setScheduleError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadUpcomingTests() {
      try {
        const schedules = await getAssetSchedules(7);
        if (active) {
          setUpcomingTests(schedules);
          setScheduleError("");
        }
      } catch (error) {
        if (active) setScheduleError(error.message);
      }
    }

    loadUpcomingTests();
    const timer = window.setInterval(loadUpcomingTests, 60_000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const openTest = (schedule) => {
    navigate(
      `/substations/${encodeURIComponent(schedule.substation_id)}` +
      `/transformer/${encodeURIComponent(schedule.equipment_id)}` +
      `?section=${encodeURIComponent(schedule.parameter_key)}`
    );
  };

  const formatDate = (value) =>
    new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
    }).format(new Date(`${value}T00:00:00`));

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    window.location.href = "/";
  };

  return (
    <div className="dashboard-container">



      {/* Welcome */}
      <section className="dashboard-welcome">
        <h2>Welcome, Admin!</h2>
        <p>Here's an overview of your electrical inventory.</p>
      </section>

      {/* Statistics */}
      <section className="stats-grid">

        <div className="stat-card">
          <h3>Total Items</h3>
          <h2>0</h2>
          <p>All inventory items</p>
        </div>

        <div className="stat-card">
          <h3>Available Items</h3>
          <h2>0</h2>
          <p>Items available in stock</p>
        </div>

        <div className="stat-card">
          <h3>Issued Items</h3>
          <h2>0</h2>
          <p>Items currently issued</p>
        </div>

        <div className="stat-card">
          <h3>Low Stock Items</h3>
          <h2>0</h2>
          <p>Items requiring attention</p>
        </div>

      </section>

      <section className="dashboard-schedule-section">
        <div className="dashboard-schedule-heading">
          <div>
            <h2>Transformer Tests Due This Week</h2>
            <p>Upcoming test reminders appear here during the seven days before they are due.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/asset-scheduling")}
          >
            View all schedules
          </button>
        </div>

        {scheduleError ? (
          <p className="dashboard-schedule-error" role="alert">
            Could not load upcoming tests: {scheduleError}
          </p>
        ) : upcomingTests.length ? (
          <div className="dashboard-schedule-list">
            {upcomingTests.map((schedule) => (
              <button
                type="button"
                className="dashboard-schedule-item"
                key={schedule.id}
                onClick={() => openTest(schedule)}
              >
                <span>
                  <strong>{schedule.substation_name}</strong>
                  {" — "}
                  {schedule.equipment_name} ({schedule.equipment_id})
                  <small>{schedule.activity}</small>
                </span>
                <span className="dashboard-schedule-date">
                  Due {formatDate(schedule.scheduled_date)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="dashboard-schedule-empty">
            No transformer tests are due in the next seven days.
          </p>
        )}
      </section>

      {/* Quick Actions */}
      <section className="dashboard-actions">
        <h2>Inventory Management</h2>

        <div className="action-grid">
          <button>+ Add New Item</button>
          <button>View Inventory</button>
          <button>Issue Item</button>
          <button>Return Item</button>
        </div>
      </section>

      {/* Footer */}
      <footer className="dashboard-footer">
        IGCAR Electrical Inventory Management System
      </footer>

    </div>
  );
}

export default Dashboard;

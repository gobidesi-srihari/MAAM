
function Dashboard() {
  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    window.location.href = "/";
  };

  return (
    <div className="dashboard-container">

      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1>IGCAR</h1>
          <p>Electrical Inventory Management System</p>
        </div>

        <button onClick={handleLogout}>
          Logout
        </button>
      </header>

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

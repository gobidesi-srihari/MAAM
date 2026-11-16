
import Sidebar from "../components/Sidebar.jsx";
import Header from "../components/Header.jsx";
import { Outlet } from "react-router-dom";

function MainLayout() {
  return (
    <div className="app-layout">

      <Sidebar />

      <div className="main-content">

        <Header />

        <main className="page-content">
          <Outlet />
        </main>

        <footer className="copyright-footer">
          <p>
            © 2026 Indira Gandhi Centre for Atomic Research.
            All rights reserved.
          </p>
          <span>Electrical Equipment Management System</span>
        </footer>

      </div>

    </div>
  );
}

export default MainLayout;

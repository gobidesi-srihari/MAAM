
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";

function App() {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";

  return (
    <div>
      {isLoggedIn ? <Dashboard /> : <Login />}
    </div>
  );
}

export default App;

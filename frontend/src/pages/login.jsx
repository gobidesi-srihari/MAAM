
import { useState } from "react";
import { apiRequest } from "../services/api.js";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      // Authenticate using PostgreSQL through FastAPI
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username,
          password,
        }),
      });

      // Store JWT token for subsequent API requests
      localStorage.setItem("access_token", data.access_token);

      // Temporary compatibility with existing route protection
      localStorage.setItem("isLoggedIn", "true");

      // Redirect to dashboard
      window.location.href = "/dashboard";

    } catch (error) {
      setMessage(error.message || "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>IGCAR</h1>
        <p>Electrical Inventory Management System</p>

        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        {message && <p className="login-error">{message}</p>}
      </div>
    </div>
  );
}

export default Login;

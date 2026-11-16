
import { useState } from "react";
import { apiRequest } from "../services/api.js";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      await apiRequest("/login", {
        method: "POST",
        body: JSON.stringify({
          username,
          password,
        }),
      });

      localStorage.setItem("isLoggedIn", "true");
      window.location.href = "/dashboard";

    } catch (error) {
      setMessage(error.message || "Login failed");
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

          <button type="submit">Sign In</button>
        </form>

        {message && <p className="login-error">{message}</p>}
      </div>
    </div>
  );
}

export default Login;

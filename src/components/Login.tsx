import React, { useState } from "react";
import axios from "axios";

interface LoginProps {
  onLogin: (userData: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        "http://72.60.101.240:5005/api/auth/login",
        {
          username,
          password,
        }
      );
      onLogin(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  const handleDemoLogin = (demoUser: string, demoPass: string) => {
    setUsername(demoUser);
    setPassword(demoPass);
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>Project Management Tool</h2>
        {error && <div className="error-message">{error}</div>}
        <div className="form-group">
          <label>Username:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="login-button">
          Login
        </button>

        <div className="demo-logins">
          <h3>Demo Logins (Click to auto-fill):</h3>
          <div className="demo-buttons">
            <button
              type="button"
              className="demo-btn manager"
              onClick={() => handleDemoLogin("john.manager", "password123")}
            >
              Manager Login
            </button>
            <button
              type="button"
              className="demo-btn teamlead"
              onClick={() => handleDemoLogin("sarah.lead", "password123")}
            >
              Team Lead Login
            </button>
            <button
              type="button"
              className="demo-btn employee"
              onClick={() => handleDemoLogin("mike.dev", "password123")}
            >
              Employee Login
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Login;

import React, { useState } from "react";
import { authAPI } from "../services/api";
import Toast from "./Toast";
import { useToast } from "../hooks/useToast";

interface LoginProps {
  onLogin: (userData: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await authAPI.login(username, password);
      onLogin(response);
    } catch (err: any) {
      const msg = err?.message || "Login failed";
      setError(msg);
      showToast(msg, "error");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier) {
      showToast("Please enter your email or username", "warning");
      return;
    }
    setIsSubmitting(true);
    try {
      await authAPI.startReset(forgotIdentifier);
      showToast("New password sent to your registered email. Please check your inbox.", "success");
      setShowForgot(false);
      setForgotIdentifier("");
    } catch (err: any) {
      showToast(err?.message || "Failed to reset password", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      {toast.isVisible && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
      {!showForgot ? (
        <form onSubmit={handleSubmit} className="login-form">
          <h2>Project management tool</h2>
          {/* {error && <div className="error-message">{error}</div>} */}
          <div className="form-group">
            <label>Email or Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter email or username"
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
          <div style={{ marginTop: "12px", textAlign: "right" }}>
            <button
              type="button"
              onClick={() => {
                setShowForgot(true);
                setForgotIdentifier("");
              }}
              style={{
                background: "none",
                border: "none",
                color: "#2563eb",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Forgot password?
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleForgotPassword} className="login-form">
          <h2>Reset your password</h2>
          <p style={{ color: "#666", fontSize: "14px", marginBottom: "20px" }}>
            Enter your email or username. A new password will be generated and sent to your registered email address.
          </p>
          <div className="form-group">
            <label>Email or Username:</label>
            <input
              type="text"
              value={forgotIdentifier}
              onChange={(e) => setForgotIdentifier(e.target.value)}
              placeholder="Enter email or username"
              required
            />
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button type="submit" className="login-button" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Reset Password"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForgot(false);
                setForgotIdentifier("");
              }}
              className="login-button"
              style={{ backgroundColor: "#6b7280" }}
            >
              Back to Login
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Login;

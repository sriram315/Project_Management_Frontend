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
  const [showPassword, setShowPassword] = useState(false);
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
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  width: '32px',
                  height: '32px',
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  // Hidden eye icon - eye with diagonal slash
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  // Visible eye icon - open eye
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
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

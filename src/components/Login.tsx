import React, { useState } from "react";
import { authAPI } from "../services/api";
import Toast from "./Toast";
import { useToast } from "../hooks/useToast";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import Lottie from "lottie-react";
import loginAnimation from "./Login.json";

interface LoginProps {
  onLogin: (userData: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await authAPI.login(email, password);
      onLogin(response);
    } catch (err: any) {
      const msg = err?.message || "Login failed";
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
    <div className="login-wrapper">
      {toast.isVisible && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}

      <div className="login-animation-section">
        <Lottie animationData={loginAnimation} loop={true} className="login-lottie" />
      </div>

      <div className="login-form-container">
        {!showForgot ? (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-header">
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem'
              }}>
                <div
                  style={{
                    width: "50px",
                    height: "50px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "800",
                    fontSize: "24px",
                    boxShadow: "0 4px 15px rgba(102, 126, 234, 0.5)",
                    border: "3px solid rgba(255, 255, 255, 0.2)",
                    textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  }}
                >
                  N
                </div>
                <span style={{
                  fontSize: '1.8rem',
                  fontWeight: '800',
                  color: '#1f2937',
                  background: 'linear-gradient(135deg, #1f2937 0%, #4b5563 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.5px'
                }}>NexTrack</span>
              </div>
              <p>Please enter your details to sign in</p>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <div className="input-with-icon">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-with-icon">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setShowForgot(true);
                  setForgotIdentifier("");
                }}
                className="forgot-password-link"
              >
                Forgot password?
              </button>
            </div>

            <button type="submit" className="login-button">
              Sign In
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="login-form">
            <div className="login-header">
              <h2>Reset Password</h2>
              <p>We'll send you a new password to your email</p>
            </div>

            <div className="form-group">
              <label>Email or Username</label>
              <div className="input-with-icon">
                <User className="input-icon" size={20} />
                <input
                  type="text"
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  placeholder="Enter email or username"
                  required
                />
              </div>
            </div>

            <button type="submit" className="login-button" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Reset Password"}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowForgot(false);
                setForgotIdentifier("");
              }}
              className="back-to-login-btn"
            >
              Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;

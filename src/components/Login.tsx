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
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  const resetForgotState = () => {
    setForgotStep(1);
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleStartForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
      showToast("Please enter your username", "warning");
      return;
    }
    setIsSubmitting(true);
    try {
      await authAPI.startReset(username);
      showToast("OTP sent to your registered email", "success");
      setForgotStep(2);
    } catch (err: any) {
      showToast(err?.message || "Failed to send OTP", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      showToast("Please enter the OTP", "warning");
      return;
    }
    setIsSubmitting(true);
    try {
      await authAPI.verifyOtp(username, otp);
      showToast("OTP verified. Please enter new password.", "success");
      setForgotStep(3);
    } catch (err: any) {
      showToast(err?.message || "Invalid OTP", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      showToast("Please fill both password fields", "warning");
      return;
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-={}\[\]|;:'",.<>\/?`~]).{8,15}$/;
    if (!passwordRegex.test(newPassword)) {
      showToast(
        "Password must be 8-15 chars, include 1 uppercase, 1 lowercase, and 1 special character",
        "error"
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      await authAPI.resetPassword(username, otp, newPassword);
      showToast("Password updated. You can now log in.", "success");
      setShowForgot(false);
      resetForgotState();
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
          <div style={{ marginTop: "12px", textAlign: "right" }}>
            <button
              type="button"
              onClick={() => {
                setShowForgot(true);
                resetForgotState();
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
        <form
          onSubmit={
            forgotStep === 1
              ? handleStartForgot
              : forgotStep === 2
              ? handleVerifyOtp
              : handleResetPassword
          }
          className="login-form"
        >
          <h2>Reset your password</h2>
          <div className="form-group">
            <label>Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={forgotStep !== 1}
            />
          </div>
          {forgotStep >= 2 && (
            <div className="form-group">
              <label>OTP:</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                placeholder="Enter the 6-digit code"
                disabled={forgotStep === 3}
              />
            </div>
          )}
          {forgotStep === 3 && (
            <>
              <div className="form-group">
                <label>New Password:</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Confirm Password:</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </>
          )}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button type="submit" className="login-button" disabled={isSubmitting}>
              {forgotStep === 1
                ? isSubmitting ? "Sending..." : "Send OTP"
                : forgotStep === 2
                ? isSubmitting ? "Verifying..." : "Verify OTP"
                : isSubmitting ? "Updating..." : "Set New Password"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForgot(false);
                resetForgotState();
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

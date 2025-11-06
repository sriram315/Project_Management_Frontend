import React, { useState } from 'react';
import { authAPI, userAPI } from '../services/api';
import Toast from './Toast';
import { useToast } from '../hooks/useToast';

interface ProfileSettingsProps {
  user: { id: number; username: string; role: string; email?: string };
  onUserUpdated?: (user: { id: number; username: string; role: string; email?: string }) => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ user, onUserUpdated }) => {
  const { toast, showToast, hideToast } = useToast();
  const [form, setForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
  });
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [changePwd, setChangePwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await userAPI.update(user.id, {
        username: form.username,
        email: form.email,
        role: user.role,
        available_hours_per_week: undefined,
      });
      showToast('Profile updated successfully', 'success');
      onUserUpdated?.({ ...user, username: form.username, email: form.email });
    } catch (err: any) {
      showToast(err?.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setResetting(true);
      const identifier = form.email || form.username;
      await authAPI.startReset(identifier);
      showToast('A new password has been emailed to your registered address.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to reset password', 'error');
    } finally {
      setResetting(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changePwd.currentPassword || !changePwd.newPassword || !changePwd.confirmPassword) {
      showToast('Please fill all password fields', 'error');
      return;
    }
    if (changePwd.newPassword !== changePwd.confirmPassword) {
      showToast('New password and confirm password do not match', 'error');
      return;
    }
    try {
      setSaving(true);
      await authAPI.changePassword(user.id, changePwd.currentPassword, changePwd.newPassword);
      showToast('Password changed successfully', 'success');
      setChangePwd({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      showToast(err?.message || 'Failed to change password', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="users-page">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#000', marginBottom: '0.5rem' }}>Profile Settings</h1>
          <p style={{ color: '#6b7280', fontSize: '0.95rem', marginTop: '0.25rem' }}>Manage your account details and password</p>
        </div>
      </div>

      <div className="page-content" style={{ display: 'grid', gap: '1.5rem' }}>
        <form onSubmit={handleSave} className="user-form" style={{ maxWidth: 560 }}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input id="username" name="username" type="text" value={form.username} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" value={form.email} onChange={handleChange} />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-enterprise btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        <div className="card" style={{ maxWidth: 560, padding: '1.25rem', border: '1px solid #e5e7eb', borderRadius: 8, background: 'white' }}>
          <h3 style={{ margin: 0, marginBottom: 12 }}>Change Password</h3>
          <form onSubmit={handleChangePasswordSubmit} className="user-form">
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <input id="currentPassword" type="password" value={changePwd.currentPassword} onChange={(e) => setChangePwd(prev => ({ ...prev, currentPassword: e.target.value }))} />
            </div>
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input id="newPassword" type="password" value={changePwd.newPassword} onChange={(e) => setChangePwd(prev => ({ ...prev, newPassword: e.target.value }))} />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input id="confirmPassword" type="password" value={changePwd.confirmPassword} onChange={(e) => setChangePwd(prev => ({ ...prev, confirmPassword: e.target.value }))} />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-enterprise btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Change Password'}
              </button>
              <button type="button" onClick={handleResetPassword} className="btn-enterprise btn-secondary" disabled={resetting}>
                {resetting ? 'Sending...' : 'Reset via Email (Alt)'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {toast.isVisible && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </div>
  );
};

export default ProfileSettings;



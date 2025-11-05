import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          headerBg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          confirmBg: '#ef4444',
          confirmBgHover: '#dc2626',
        };
      case 'warning':
        return {
          headerBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          confirmBg: '#f59e0b',
          confirmBgHover: '#d97706',
        };
      case 'info':
        return {
          headerBg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          confirmBg: '#3b82f6',
          confirmBgHover: '#2563eb',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div
        className="modal"
        style={{
          maxWidth: '500px',
          animation: 'modalScaleIn 0.2s ease-out',
        }}
      >
        <div
          className="modal-header"
          style={{
            background: styles.headerBg,
            color: 'white',
            margin: '-2rem -2rem 1.5rem -2rem',
            padding: '1.5rem 2rem',
            borderRadius: '12px 12px 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <AlertTriangle size={28} />
          <h2 style={{ margin: 0, color: 'white', flex: 1 }}>{title}</h2>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <p
            style={{
              fontSize: '1rem',
              color: '#374151',
              lineHeight: '1.6',
              margin: 0,
            }}
          >
            {message}
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              borderRadius: '8px',
              border: '2px solid #e5e7eb',
              backgroundColor: 'white',
              color: '#374151',
              cursor: 'pointer',
              transition: 'all 0.2s',
              minWidth: '100px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: styles.confirmBg,
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
              minWidth: '100px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = styles.confirmBgHover;
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = styles.confirmBg;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }}
          >
            {confirmText}
          </button>
        </div>

        <style>
          {`
            @keyframes modalScaleIn {
              from {
                transform: scale(0.95);
                opacity: 0;
              }
              to {
                transform: scale(1);
                opacity: 1;
              }
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default ConfirmationModal;


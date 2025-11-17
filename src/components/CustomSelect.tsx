import React, { useState, useRef, useEffect } from 'react';
import './CustomSelect.css';

interface CustomSelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  tooltip?: string;
}

interface CustomSelectProps {
  value: number | string | undefined | null;
  onChange: (value: string) => void;
  options: Array<CustomSelectOption | { value: string | number; label: string }>;
  placeholder?: string;
  className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(opt => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  // Filter options based on search
  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input when dropdown opens
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string | number, disabled?: boolean) => {
    if (disabled) return; // Don't allow selection of disabled options
    onChange(String(optionValue));
    setIsOpen(false);
    setSearchTerm('');
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      setSearchTerm('');
    }
  };

  return (
    <div className={`custom-select-container ${className}`} ref={containerRef}>
      <div 
        className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
        onClick={toggleDropdown}
      >
        <span className="custom-select-value">{displayText}</span>
        <span className="custom-select-arrow">▼</span>
      </div>

      {isOpen && (
        <div className="custom-select-dropdown">
          <div className="custom-select-search">
            <input
              ref={searchInputRef}
              type="text"
              className="custom-select-search-input"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="custom-select-options">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isDisabled = 'disabled' in option ? option.disabled : false;
                const tooltip = 'tooltip' in option ? option.tooltip : undefined;
                return (
                  <div
                    key={option.value}
                    className={`custom-select-option ${option.value === value ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(option.value, isDisabled);
                    }}
                    onMouseEnter={(e) => {
                      if (isDisabled && tooltip) {
                        e.currentTarget.setAttribute('title', tooltip);
                      }
                    }}
                    title={tooltip || (isDisabled ? 'Dropped' : undefined)}
                    style={{
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.6 : 1,
                    }}
                  >
                    {option.label}
                    {isDisabled && <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: '#ef4444' }}>(Dropped)</span>}
                  </div>
                );
              })
            ) : (
              <div className="custom-select-no-options">No options found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;


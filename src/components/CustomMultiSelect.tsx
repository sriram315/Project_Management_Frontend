import React, { useState, useRef, useEffect } from 'react';
import './CustomSelect.css';

interface CustomMultiSelectProps {
  value: (string | number)[] | undefined | null;
  onChange: (value: (string | number)[]) => void;
  options: Array<{ value: string | number; label: string }>;
  placeholder?: string;
  className?: string;
}

const CustomMultiSelect: React.FC<CustomMultiSelectProps> = ({
  value = [],
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedValues = Array.isArray(value) ? value : [];
  // Normalize values to strings for comparison to avoid type mismatch issues
  const normalizedSelectedValues = selectedValues.map(v => String(v));
  const selectedOptions = options.filter(opt => {
    const optValue = String(opt.value);
    return normalizedSelectedValues.includes(optValue);
  });
  
  // Ensure we only show valid selected options
  const validSelectedOptions = selectedOptions.filter(opt => opt && opt.label);
  
  const displayText = validSelectedOptions.length > 0 
    ? validSelectedOptions.length === 1
      ? validSelectedOptions[0].label
      : `${validSelectedOptions.length} selected`
    : placeholder;

  // Filter options based on search - ensure options have valid labels
  const filteredOptions = options.filter(opt => {
    if (!opt || !opt.label || typeof opt.label !== 'string') return false;
    return opt.label.toLowerCase().includes(searchTerm.toLowerCase());
  });

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

  const handleToggle = (optionValue: string | number) => {
    const newValues = [...selectedValues];
    // Normalize both values to strings for comparison
    const normalizedOptionValue = String(optionValue);
    const index = newValues.findIndex(v => String(v) === normalizedOptionValue);
    
    if (index >= 0) {
      // Remove if already selected
      newValues.splice(index, 1);
    } else {
      // Add if not selected - preserve original type (number if it was a number)
      const valueToAdd = typeof optionValue === 'number' ? optionValue : optionValue;
      newValues.push(valueToAdd);
    }
    
    onChange(newValues);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
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
        {selectedValues.length > 0 && (
          <span 
            className="custom-select-clear"
            onClick={handleClearAll}
            title="Clear selection"
            style={{ marginRight: '8px', cursor: 'pointer', fontSize: '12px' }}
          >
            ✕
          </span>
        )}
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
                // Normalize both values to strings for comparison
                const isSelected = normalizedSelectedValues.includes(String(option.value));
                return (
                  <div
                    key={option.value}
                    className={`custom-select-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleToggle(option.value)}
                  >
                    <span style={{ marginRight: '8px' }}>
                      {isSelected ? '✓' : '○'}
                    </span>
                    <span>{option.label || String(option.value)}</span>
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

export default CustomMultiSelect;


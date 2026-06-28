import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface Option {
  id: string | number;
  name: string;
}

interface SearchableDropdownProps {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SearchableDropdown({ label, options, value, onChange, placeholder = 'Select...', disabled = false }: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(o => o.name === value);

  return (
    <div className="auth-field" style={{ position: 'relative' }} ref={wrapperRef}>
      <label className="auth-label">{label}</label>

      {/* Trigger */}
      <div
        className="auth-input"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          userSelect: 'none',
        }}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
      >
        <span style={{ color: selectedOption ? '#1A1A18' : 'rgba(26,26,24,0.4)', fontSize: '0.875rem' }}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDown
          size={15}
          style={{
            color: '#2A7C75',
            flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </div>

      {/* Dropdown panel */}
      {isOpen && !disabled && (
        <div style={{
          position: 'absolute',
          zIndex: 50,
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          background: '#F7F3EC',
          border: '1px solid rgba(26,26,24,0.15)',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(26,26,24,0.12)',
          maxHeight: '220px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>

          {/* Search bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderBottom: '1px solid rgba(26,26,24,0.1)',
          }}>
            <Search size={13} style={{ color: '#2A7C75', flexShrink: 0 }} />
            <input
              type="text"
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '0.8125rem',
                color: '#1A1A18',
                width: '100%',
                fontFamily: 'inherit',
              }}
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>

          {/* Options */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, index) => (
                <div
                  // Use label + index to guarantee unique keys across all dropdown instances
                  key={`${label}-${index}`}
                  style={{
                    padding: '9px 14px',
                    fontSize: '0.8125rem',
                    color: '#1A1A18',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    borderBottom: '1px solid rgba(26,26,24,0.04)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(42,124,117,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => {
                    onChange(opt.name);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  {opt.name}
                </div>
              ))
            ) : (
              <div style={{ padding: '12px 14px', fontSize: '0.8125rem', color: 'rgba(26,26,24,0.45)', textAlign: 'center' }}>
                No results found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { USERS } from '@/lib/endpoints';

interface UserResult {
  id: string;
  email: string;
  role: string;
}

interface UserSearchInputProps {
  id: string;
  value: string;
  onChange: (userId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function UserSearchInput({ id, value, onChange, placeholder, disabled }: UserSearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch users with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    
    // If the query exactly matches the current ID (e.g. they selected someone), don't search again
    if (query === value) return;

    setLoading(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const data = await apiFetch<UserResult[]>(USERS.SEARCH(query));
        setResults(data);
        setIsOpen(true);
      } catch (e) {
        console.error('Failed to search users', e);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, value]);

  const handleSelect = (user: UserResult) => {
    setQuery(user.email);
    onChange(user.id);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onChange(''); // clear selected ID when typing new search
    setIsOpen(true);
  };

  return (
    <div className="user-search-wrapper" ref={wrapperRef} style={{ position: 'relative' }}>
      <input
        id={id}
        type="text"
        className="auth-input"
        placeholder={placeholder || "Search by email..."}
        value={query}
        onChange={handleInputChange}
        onFocus={() => { if (query) setIsOpen(true); }}
        disabled={disabled}
        autoComplete="off"
      />
      {loading && <span className="user-search-spinner">◌</span>}
      
      {isOpen && results.length > 0 && (
        <ul className="user-search-dropdown">
          {results.map((user) => (
            <li key={user.id} onClick={() => handleSelect(user)}>
              <span className="usd-email">{user.email}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

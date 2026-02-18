import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { jobService } from '../../services/jobService';
import { StatusBadge } from './Badge';
import { STATUS_LABELS } from '../../lib/constants';
import type { Job } from '../../types';

interface SearchBarProps {
  /** Header color scheme to match icon styling */
  variant?: 'light' | 'dark' | 'blue';
  onSelectJob?: (job: Job) => void;
}

export default function SearchBar({ variant = 'dark', onSelectJob }: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isOpen) {
      // Small delay so the input is rendered before focusing
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const jobs = await jobService.searchJobs(value);
        setResults(jobs);
      } catch {
        setResults([]);
      }
      setLoading(false);
      setSearched(true);
    }, 300);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setSearched(false);
  }, []);

  const handleSelect = useCallback((job: Job) => {
    onSelectJob?.(job);
    handleClose();
  }, [onSelectJob, handleClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, handleClose]);

  const iconClass = variant === 'light'
    ? 'bg-grey-bg hover:bg-grey-border text-grey-muted'
    : 'bg-white/15 hover:bg-white/25';

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${iconClass}`}
        title="Search jobs"
      >
        <Search size={18} />
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-50" onClick={handleClose} />

      {/* Search panel */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-lg">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search size={20} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by Service ID, name, or phone..."
            className="flex-1 text-sm text-gray-900 outline-none placeholder:text-gray-400"
            autoComplete="off"
          />
          {loading && <Loader2 size={18} className="text-blue-500 animate-spin shrink-0" />}
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 cursor-pointer">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {results.length > 0 ? (
            <ul className="divide-y divide-gray-50">
              {results.map((job) => (
                <li
                  key={String(job.id)}
                  onClick={() => handleSelect(job)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {job.serviceId && (
                        <span className="text-xs font-mono font-bold text-blue-600">{job.serviceId}</span>
                      )}
                      <span className="text-xs text-gray-400">{job.date}</span>
                    </div>
                    <div className="text-sm font-medium text-gray-900 truncate">{job.customerName}</div>
                    <div className="text-xs text-gray-500 truncate">{job.bike} &middot; {STATUS_LABELS[job.status]}</div>
                  </div>
                  <StatusBadge status={job.status} />
                </li>
              ))}
            </ul>
          ) : searched && !loading ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No jobs found for "{query}"
            </div>
          ) : query.length < 2 && !loading ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Type at least 2 characters to search
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

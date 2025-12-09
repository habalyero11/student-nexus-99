import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  delay?: number; // debounce delay in milliseconds
  enabled?: boolean;
  storageKey?: string; // localStorage key for backup
}

interface AutoSaveStatus {
  status: 'idle' | 'pending' | 'saving' | 'saved' | 'error';
  lastSaved?: Date;
  error?: string;
}

export function useAutoSave<T>({
  data,
  onSave,
  delay = 2000,
  enabled = true,
  storageKey
}: UseAutoSaveOptions<T>) {
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>({ status: 'idle' });
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastDataRef = useRef<string>();
  const isInitialMount = useRef(true);
  const { toast } = useToast();

  // Save to localStorage as backup
  const saveToLocalStorage = (data: T) => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          data,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.warn('Failed to save to localStorage:', error);
      }
    }
  };

  // Load from localStorage
  const loadFromLocalStorage = (): T | null => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          return parsed.data;
        }
      } catch (error) {
        console.warn('Failed to load from localStorage:', error);
      }
    }
    return null;
  };

  // Clear localStorage backup
  const clearLocalStorage = () => {
    if (storageKey && typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
  };

  // Perform the actual save
  const performSave = async (dataToSave: T) => {
    setAutoSaveStatus({ status: 'saving' });

    try {
      await onSave(dataToSave);
      setAutoSaveStatus({
        status: 'saved',
        lastSaved: new Date()
      });

      // Clear localStorage backup after successful save
      clearLocalStorage();

      // Reset to idle after a brief moment
      setTimeout(() => {
        setAutoSaveStatus(prev => ({ ...prev, status: 'idle' }));
      }, 2000);

    } catch (error: any) {
      setAutoSaveStatus({
        status: 'error',
        error: error.message
      });

      toast({
        variant: "destructive",
        title: "Auto-save Failed",
        description: "Your changes are backed up locally. " + error.message
      });
    }
  };

  useEffect(() => {
    if (!enabled) return;

    const currentDataString = JSON.stringify(data);

    // Skip auto-save on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      lastDataRef.current = currentDataString;
      return;
    }

    // Skip if data hasn't changed
    if (currentDataString === lastDataRef.current) {
      return;
    }

    // Update last data reference
    lastDataRef.current = currentDataString;

    // Save to localStorage immediately as backup
    saveToLocalStorage(data);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set status to pending
    setAutoSaveStatus({ status: 'pending' });

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(() => {
      performSave(data);
    }, delay);

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, enabled, delay, onSave]);

  // Manual save function
  const saveNow = async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    await performSave(data);
  };

  // Force clear function
  const clearAutoSave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setAutoSaveStatus({ status: 'idle' });
    clearLocalStorage();
  };

  return {
    autoSaveStatus,
    saveNow,
    clearAutoSave,
    loadFromLocalStorage,
    clearLocalStorage
  };
}
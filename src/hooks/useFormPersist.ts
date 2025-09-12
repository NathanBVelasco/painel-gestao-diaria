import { useState, useEffect, useCallback } from "react";

interface FormPersistOptions<T> {
  key: string;
  initialState: T;
  onReset?: () => void;
}

export function useFormPersist<T extends Record<string, any>>({
  key,
  initialState,
  onReset
}: FormPersistOptions<T>) {
  const [isLoading, setIsLoading] = useState(true);
  
  // Load initial state from localStorage or use provided initial state
  const [formData, setFormData] = useState<T>(initialState);

  // Load persisted data on mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(key);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        // Merge saved data with initial state to handle new fields
        setFormData({ ...initialState, ...parsed });
      }
    } catch (error) {
      console.error('Error loading persisted form data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [key]);

  // Save to localStorage whenever formData changes
  useEffect(() => {
    try {
      // Only save if there's actual data (not just empty strings/zeros)
      const hasData = Object.values(formData).some(value => {
        if (typeof value === 'string') return value.trim() !== '';
        if (typeof value === 'number') return value !== 0;
        return Boolean(value);
      });

      if (hasData) {
        localStorage.setItem(key, JSON.stringify(formData));
      } else {
        // If all fields are empty, remove from localStorage
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Error saving form data to localStorage:', error);
    }
  }, [key, formData]);

  // Clear persisted data
  const clearPersistedData = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setFormData(initialState);
      onReset?.();
    } catch (error) {
      console.error('Error clearing persisted form data:', error);
    }
  }, [key, initialState, onReset]);

  // Update specific field
  const updateField = useCallback((field: keyof T, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Update multiple fields at once
  const updateFields = useCallback((updates: Partial<T>) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  return {
    formData,
    setFormData,
    updateField,
    updateFields,
    clearPersistedData,
    isLoading
  };
}
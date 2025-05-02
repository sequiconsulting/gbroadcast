import { useState, useEffect, useCallback } from 'react';
import { secureStorage } from '../utils/secureStorage';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ViewMode = 'list' | 'grid' | 'compact';

interface FilterPreferences {
  nameFilter?: string;
  emailFilter?: string;
  includeLabels?: string[];
  excludeLabels?: string[];
  orgFilter?: string;
  lastUsed?: string; // ISO date string
}

export interface UserPreferences {
  theme: ThemePreference;
  viewMode: ViewMode;
  filters: FilterPreferences;
}

export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'system',
    viewMode: 'list',
    filters: {}
  });
  const [loaded, setLoaded] = useState(false);

  // Load all preferences on mount
  useEffect(() => {
    const loadPreferences = () => {
      try {
        const theme = secureStorage.preferences.getTheme();
        const viewMode = secureStorage.preferences.getViewMode() as ViewMode;
        const filters = secureStorage.preferences.getFilters() || {};
        
        setPreferences({
          theme,
          viewMode,
          filters
        });
        
        setLoaded(true);
      } catch (error) {
        console.error('Error loading user preferences:', error);
        // Continue with defaults if there's an error
        setLoaded(true);
      }
    };
    
    loadPreferences();
  }, []);

  // Update theme preference
  const setTheme = useCallback((theme: ThemePreference) => {
    setPreferences(prev => ({ ...prev, theme }));
    secureStorage.preferences.saveTheme(theme);
  }, []);

  // Update view mode preference
  const setViewMode = useCallback((viewMode: ViewMode) => {
    setPreferences(prev => ({ ...prev, viewMode }));
    secureStorage.preferences.saveViewMode(viewMode);
  }, []);

  // Save filter preferences
  const saveFilters = useCallback((filters: FilterPreferences) => {
    // Add timestamp
    const filtersWithTimestamp = {
      ...filters,
      lastUsed: new Date().toISOString()
    };
    
    setPreferences(prev => ({ 
      ...prev, 
      filters: filtersWithTimestamp
    }));
    
    secureStorage.preferences.saveFilters(filtersWithTimestamp);
  }, []);

  // Clear all filter preferences
  const clearFilters = useCallback(() => {
    const emptyFilters = {};
    setPreferences(prev => ({ ...prev, filters: emptyFilters }));
    secureStorage.preferences.saveFilters(emptyFilters);
  }, []);

  return {
    preferences,
    loaded,
    setTheme,
    setViewMode,
    saveFilters,
    clearFilters
  };
};
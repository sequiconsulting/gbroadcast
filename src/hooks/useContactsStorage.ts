import { useState, useEffect, useCallback, useRef } from 'react';
import { secureStorage } from '../utils/secureStorage';
import { useSecureApi } from './useSecureApi';
import { Contact, ContactGroup, ContactsMetadata } from '../types/contacts';

const STORAGE_KEY_CONTACTS = 'google_contacts';
const STORAGE_KEY_GROUPS = 'google_contact_groups';
const STORAGE_KEY_METADATA = 'google_contacts_metadata';
const SYNC_INTERVAL = 30 * 60 * 1000; // 30 minutes (increased from 5 minutes)
const SYNC_ERROR_BACKOFF = 15 * 60 * 1000; // 15 minutes backoff after error

// Constants for filtering out system groups
const SYSTEM_GROUP_PREFIXES = ['contactGroups/myContacts', 'contactGroups/starred'];

export const useContactsStorage = () => {
  const { fetchWithToken, isLoading: isApiLoading, error: apiError } = useSecureApi();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactGroups, setContactGroups] = useState<Record<string, ContactGroup>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [lastSyncAttempt, setLastSyncAttempt] = useState<number | null>(null);
  const [syncInProgress, setSyncInProgress] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number, total: number } | null>(null);
  const [syncError, setSyncError] = useState<boolean>(false);
  
  // Use a ref to track sync status to prevent race conditions with effect cleanup
  const syncInProgressRef = useRef(false);
  
  // Use this ref to prevent scheduling a sync while unmounting
  const isMountedRef = useRef(true);

  // Load contacts from local storage
  const loadFromStorage = useCallback(() => {
    try {
      let hasCorruptedData = false;
      
      // Load contacts
      const storedContacts = secureStorage.getItem(STORAGE_KEY_CONTACTS) as Contact[] | null;
      if (storedContacts) {
        setContacts(storedContacts);
      } else if (localStorage.getItem(STORAGE_KEY_CONTACTS)) {
        // If item exists but couldn't be decrypted, mark as corrupted
        hasCorruptedData = true;
      }

      // Load contact groups
      const storedGroups = secureStorage.getItem(STORAGE_KEY_GROUPS) as Record<string, ContactGroup> | null;
      if (storedGroups) {
        setContactGroups(storedGroups);
      } else if (localStorage.getItem(STORAGE_KEY_GROUPS)) {
        hasCorruptedData = true;
      }

      // Load metadata
      const metadata = secureStorage.getItem(STORAGE_KEY_METADATA) as ContactsMetadata | null;
      if (metadata) {
        setLastSyncTime(metadata.lastSyncTime);
      } else if (localStorage.getItem(STORAGE_KEY_METADATA)) {
        hasCorruptedData = true;
      }

      // If any data was corrupted, clear all contact-related data for consistency
      if (hasCorruptedData) {
        console.warn('Corrupted contact data detected. Clearing all contact data.');
        secureStorage.clearContactsData();
        setError('Some contact data was corrupted and has been cleared. Syncing from server...');
      }

      setIsInitialized(true);
      
      // If we have loaded contacts, we can set loading to false
      if (storedContacts && storedContacts.length > 0) {
        setIsLoading(false);
      }
      
    } catch (err) {
      console.error('Error loading contacts from storage:', err);
      setError('Failed to load contacts from local storage');
      // Clear all contact data if any error occurs during loading
      secureStorage.clearContactsData();
      setIsLoading(false); // Still set loading to false to avoid infinite loading
    }
  }, []);

  // Save contacts to local storage - improved to handle large data sets
  const saveToStorage = useCallback((newContacts?: Contact[], newGroups?: Record<string, ContactGroup>) => {
    try {
      // Save contacts if provided, otherwise save current state
      if (newContacts) {
        // Store data in a single operation to avoid partial writes
        secureStorage.setItem(STORAGE_KEY_CONTACTS, newContacts);
        console.log(`Saved ${newContacts.length} contacts to storage`);
      } else if (contacts.length > 0) {
        secureStorage.setItem(STORAGE_KEY_CONTACTS, contacts);
        console.log(`Saved ${contacts.length} contacts to storage`);
      }

      // Save groups if provided, otherwise save current state
      if (newGroups) {
        secureStorage.setItem(STORAGE_KEY_GROUPS, newGroups);
      } else if (Object.keys(contactGroups).length > 0) {
        secureStorage.setItem(STORAGE_KEY_GROUPS, contactGroups);
      }

      // Update metadata
      const now = Date.now();
      const metadata: ContactsMetadata = {
        lastSyncTime: now,
        totalCount: newContacts?.length || contacts.length,
        version: 1
      };
      secureStorage.setItem(STORAGE_KEY_METADATA, metadata);
      setLastSyncTime(now);
      setSyncError(false);
      
      // Save last sync timestamp for contacts in preferences
      secureStorage.preferences.saveLastSync('contacts', now);
    } catch (err) {
      console.error('Error saving contacts to storage:', err);
      
      // If storage error occurs, try to clear and save with fewer contacts
      try {
        secureStorage.clearContactsData();
        console.warn('Storage error occurred. Cleared contacts data.');
      } catch (clearErr) {
        console.error('Failed to clear contacts data:', clearErr);
      }
    }
  }, [contacts, contactGroups]);

  // Fetch contact groups from Google API
  const fetchContactGroups = useCallback(async (force = false) => {
    // Skip if already loaded from storage and not forced
    if (Object.keys(contactGroups).length > 0 && !force) {
      return contactGroups;
    }

    try {
      // Use a larger page size to get more groups at once
      const data = await fetchWithToken<{ contactGroups?: ContactGroup[] }>(
        'https://people.googleapis.com/v1/contactGroups?pageSize=200'
      );

      if (data?.contactGroups) {
        const groups: Record<string, ContactGroup> = {};
        data.contactGroups.forEach(group => {
          groups[group.resourceName] = group;
        });

        setContactGroups(groups);
        console.log(`Fetched ${Object.keys(groups).length} contact groups`);
        return groups;
      }
      return null;
    } catch (err) {
      console.error('Error fetching contact groups:', err);
      setError('Failed to fetch contact groups. Please try again later.');
      return null;
    }
  }, [fetchWithToken, contactGroups]);

  // Fetch all contacts using robust pagination
  const fetchAllContacts = useCallback(async (): Promise<Contact[]> => {
    let allContacts: Contact[] = [];
    let nextPageToken: string | undefined = undefined;
    let pageCount = 0;
    const maxPages = 100; // Safety limit to prevent infinite loops
    let totalEstimated = 0;
    
    try {
      do {
        // Check if component is still mounted before continuing
        if (!isMountedRef.current) {
          console.log("Component unmounted during contact fetching, aborting");
          return allContacts;
        }
        
        // Increased page size to 2000 to reduce number of API calls
        const pageUrl = nextPageToken 
          ? `https://people.googleapis.com/v1/people/me/connections?personFields=names,photos,emailAddresses,phoneNumbers,memberships,userDefined,organizations&pageSize=2000&pageToken=${encodeURIComponent(nextPageToken)}`
          : 'https://people.googleapis.com/v1/people/me/connections?personFields=names,photos,emailAddresses,phoneNumbers,memberships,userDefined,organizations&pageSize=2000';
        
        pageCount++;
        console.log(`Fetching contacts page ${pageCount}`);
        
        const response = await fetchWithToken<{ connections?: Contact[], nextPageToken?: string, totalItems?: number, totalPeople?: number }>(pageUrl);
        
        if (!response) {
          throw new Error("Failed to fetch contacts page");
        }
        
        if (response.connections) {
          const newContacts = response.connections;
          console.log(`Page ${pageCount}: Got ${newContacts.length} contacts`);
          allContacts = [...allContacts, ...newContacts];
          
          // Update total estimate if available
          if (response.totalPeople && !totalEstimated) {
            totalEstimated = response.totalPeople;
          }
          
          // Check if component is still mounted before updating state
          if (isMountedRef.current) {
            // Update progress
            setSyncProgress({
              current: allContacts.length,
              total: totalEstimated || allContacts.length * 2 // Estimate if no total provided
            });
          }
        } else {
          console.warn(`Page ${pageCount}: No connections returned`);
        }
        
        nextPageToken = response.nextPageToken;
        
        // Log progress
        console.log(`Loaded ${allContacts.length} contacts${response.totalPeople ? ` of approximately ${response.totalPeople}` : ''}`);
        
        // Safety check to prevent infinite loops
        if (pageCount >= maxPages) {
          console.warn(`Reached max page limit (${maxPages}). Stopping pagination.`);
          break;
        }
        
        // Short delay to avoid rate limiting
        if (nextPageToken && isMountedRef.current) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } while (nextPageToken && isMountedRef.current);
      
      // Clear progress when done
      if (isMountedRef.current) {
        setSyncProgress(null);
      }
      
      console.log(`Finished fetching contacts. Total: ${allContacts.length} contacts`);
      return allContacts;
      
    } catch (error) {
      console.error(`Error fetching contacts:`, error);
      if (isMountedRef.current) {
        setSyncProgress(null);
      }
      throw error; // Propagate error to caller
    }
  }, [fetchWithToken]);

  // Fetch contacts from Google API with pagination
  const fetchContacts = useCallback(async (force = false) => {
    // Prevent multiple simultaneous sync operations
    if (syncInProgressRef.current) {
      console.log("Sync already in progress, skipping request");
      return;
    }
    
    // Implement backoff if last attempt failed
    if (syncError && lastSyncAttempt && (Date.now() - lastSyncAttempt < SYNC_ERROR_BACKOFF)) {
      console.log("Skipping sync due to recent error, waiting for backoff period");
      return;
    }
    
    // Skip if already loaded from storage and not forced
    if (contacts.length > 0 && !force) {
      console.log(`Using ${contacts.length} cached contacts. Set force=true to refresh.`);
      setIsLoading(false); // Ensure loading is set to false
      return;
    }

    // Set loading and sync state
    setIsLoading(true);
    setSyncInProgress(true);
    syncInProgressRef.current = true;
    setLastSyncAttempt(Date.now());
    setError(null);
    
    try {
      console.log("Starting full contacts refresh...");
      
      // Fetch contact groups first
      const groups = await fetchContactGroups(force);
      
      // Check if component is still mounted
      if (!isMountedRef.current) {
        console.log("Component unmounted during contact fetching, aborting");
        return;
      }
      
      // Fetch all contacts using pagination
      console.log("Fetching all contacts with pagination...");
      const allContacts = await fetchAllContacts();
      
      // Check if component is still mounted again
      if (!isMountedRef.current) {
        console.log("Component unmounted after fetching contacts, aborting");
        return;
      }
      
      if (allContacts.length > 0) {
        // Filter contacts with email addresses
        console.log(`Filtering contacts with email addresses (from ${allContacts.length} total contacts)...`);
        const contactsWithEmail = allContacts.filter(
          contact => contact.emailAddresses && contact.emailAddresses.length > 0
        );
        
        console.log(`Found ${contactsWithEmail.length} contacts with email addresses`);
        
        const newContacts = contactsWithEmail.map(contact => ({
          ...contact,
          _localUpdatedAt: Date.now(),
          _isDirty: false
        }));

        // Update state
        setContacts(newContacts);
        console.log(`Saving ${newContacts.length} contacts to storage...`);
        
        // Save to storage
        saveToStorage(newContacts, groups || undefined);
        setError(null);
        setSyncError(false);
        
        console.log(`Contact sync complete: ${newContacts.length} contacts with email addresses (out of ${allContacts.length} total contacts)`);
      } else {
        console.warn('No contacts returned from API');
        setError('No contacts returned from API. Please try again later.');
        setSyncError(true);
        
        // If we have cached contacts, keep using them
        if (contacts.length > 0) {
          console.log(`Using ${contacts.length} cached contacts due to API failure`);
        }
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError('Failed to load contacts. Please try again later.');
      setSyncError(true);
      
      // Still update last sync time to prevent continuous retries
      const now = Date.now();
      const metadata: ContactsMetadata = {
        lastSyncTime: now,
        totalCount: contacts.length,
        version: 1
      };
      secureStorage.setItem(STORAGE_KEY_METADATA, metadata);
      setLastSyncTime(now);
    } finally {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setIsLoading(false);
        setSyncInProgress(false);
        setSyncProgress(null);
      }
      
      // Always update the ref to ensure we don't get stuck
      syncInProgressRef.current = false;
    }
  }, [fetchWithToken, contacts.length, fetchContactGroups, fetchAllContacts, saveToStorage, syncError, lastSyncAttempt]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      syncInProgressRef.current = false;
    };
  }, []);

  // Initialize: Load from storage and check if sync is needed
  useEffect(() => {
    if (!isInitialized) {
      loadFromStorage();
    }
  }, [isInitialized, loadFromStorage]);

  // Sync contacts if needed - only once on initialization
  useEffect(() => {
    // Only run this effect once when initialized
    if (isInitialized && !syncInProgressRef.current) {
      const shouldSync = !lastSyncTime || (Date.now() - lastSyncTime > SYNC_INTERVAL);
      
      if (shouldSync || contacts.length === 0) {
        console.log("Triggering contact sync on initialization...");
        fetchContacts(contacts.length === 0); // Force refresh only if no contacts
      } else {
        setIsLoading(false);
      }
    }
  }, [isInitialized, lastSyncTime, contacts.length, fetchContacts]);

  // Sync at interval - but prevent overlapping syncs
  useEffect(() => {
    // Clear any existing timers to avoid duplicates
    let syncTimer: number | undefined;
    
    if (isInitialized) {
      // Use an interval to check if sync is needed
      syncTimer = window.setInterval(() => {
        // Only sync if not already in progress
        if (!syncInProgressRef.current && isMountedRef.current) {
          // Only sync if the last sync was more than SYNC_INTERVAL ago
          if (lastSyncTime && (Date.now() - lastSyncTime > SYNC_INTERVAL)) {
            // Don't sync if we recently had an error
            if (syncError && lastSyncAttempt && (Date.now() - lastSyncAttempt < SYNC_ERROR_BACKOFF)) {
              console.log("Skipping scheduled sync due to recent error");
              return;
            }
            
            console.log("Triggering scheduled contact sync...");
            fetchContacts(false); // Don't force refresh for scheduled syncs
          }
        }
      }, 300000); // Check every 5 minutes
    }
    
    // Clean up interval on unmount
    return () => {
      if (syncTimer) {
        window.clearInterval(syncTimer);
      }
    };
  }, [isInitialized, lastSyncTime, fetchContacts, syncError, lastSyncAttempt]);

  // Update error from API
  useEffect(() => {
    if (apiError) {
      setError(apiError.message);
    }
  }, [apiError]);

  // Filter contacts with email addresses
  const getContactsWithEmail = useCallback(() => {
    return contacts.filter(contact => 
      contact.emailAddresses && contact.emailAddresses.length > 0
    );
  }, [contacts]);

  // Get contact labels (ONLY groups, no user-defined or other tags)
  const getContactLabels = useCallback((contact: Contact) => {
    const labels = [];
    
    // Only add group memberships, skip user-defined fields
    if (contact.memberships) {
      for (const membership of contact.memberships) {
        // Check if contactGroupMembership exists and has contactGroupResourceName
        if (!membership.contactGroupMembership || !membership.contactGroupMembership.contactGroupResourceName) {
          continue; // Skip this membership if it doesn't have the required properties
        }
        
        const groupResourceName = membership.contactGroupMembership.contactGroupResourceName;
        
        // Skip system groups like "myContacts"
        if (SYSTEM_GROUP_PREFIXES.some(prefix => groupResourceName.startsWith(prefix))) {
          continue;
        }
        
        const group = contactGroups[groupResourceName];
        if (group) {
          labels.push({ 
            name: group.name || `Group ${groupResourceName.split('/')[1]}`, 
            type: 'group' 
          });
        } else {
          const groupId = groupResourceName.split('/')[1];
          labels.push({ name: `Group ${groupId}`, type: 'group' });
        }
      }
    }
    
    return labels;
  }, [contactGroups]);

  // Get primary organization details or first available
  const getOrganizationDetails = useCallback((contact: Contact) => {
    if (!contact.organizations || contact.organizations.length === 0) {
      return null;
    }
    
    // Try to find primary organization
    const primaryOrg = contact.organizations.find(org => org.metadata?.primary);
    const org = primaryOrg || contact.organizations[0];
    
    return {
      name: org.name || '',
      title: org.title || '',
      department: org.department || ''
    };
  }, []);

  // Force refresh all contacts
  const refreshContacts = useCallback(() => {
    if (syncInProgressRef.current) {
      console.log("Sync already in progress, skipping manual refresh");
      return Promise.resolve();
    }
    
    console.log("Manual refresh triggered - clearing all contacts data...");
    // Clear stored contacts to ensure a full reload
    secureStorage.clearContactsData();
    setContacts([]);
    setContactGroups({});
    setSyncError(false);
    return fetchContacts(true);
  }, [fetchContacts]);

  // Save user filter preferences
  const saveFilterPreferences = useCallback((filters: {
    nameFilter?: string;
    emailFilter?: string;
    includeLabels?: string[];
    excludeLabels?: string[];
    orgFilter?: string;
  }) => {
    secureStorage.preferences.saveFilters(filters);
  }, []);
  
  // Get user filter preferences
  const getFilterPreferences = useCallback(() => {
    return secureStorage.preferences.getFilters();
  }, []);

  return {
    contacts,
    contactGroups,
    isLoading: isLoading || isApiLoading,
    error,
    lastSyncTime,
    syncProgress,
    getContactsWithEmail,
    getContactLabels,
    getOrganizationDetails,
    refreshContacts,
    saveFilterPreferences,
    getFilterPreferences
  };
};
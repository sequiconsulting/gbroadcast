import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useContactsStorage } from '../hooks/useContactsStorage';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { Search, User, X, ExternalLink, Briefcase, AlertCircle, ChevronDown, Check, Filter, Save, RotateCw } from 'lucide-react';
import { Contact, ContactLabel } from '../types/contacts';

// Increased from 50 to 100 for better initial loading
const CONTACTS_PER_PAGE = 100; 

const ContactsPage = () => {
  const { 
    getContactsWithEmail, 
    getContactLabels, 
    getOrganizationDetails, 
    isLoading, 
    error,
    refreshContacts,
    syncProgress,
    saveFilterPreferences,
    getFilterPreferences
  } = useContactsStorage();
  
  const { preferences, saveFilters } = useUserPreferences();
  
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  
  // Filters
  const [nameFilter, setNameFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [includeLabels, setIncludeLabels] = useState<string[]>([]);
  const [excludeLabels, setExcludeLabels] = useState<string[]>([]);
  const [orgFilter, setOrgFilter] = useState('');
  
  // Dropdown states
  const [includeLabelDropdownOpen, setIncludeLabelDropdownOpen] = useState(false);
  const [excludeLabelDropdownOpen, setExcludeLabelDropdownOpen] = useState(false);
  
  // Select all
  const [selectAll, setSelectAll] = useState(false);

  // Infinite scrolling
  const [visibleCount, setVisibleCount] = useState(CONTACTS_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const contactListRef = useRef<HTMLDivElement>(null);
  const includeDropdownRef = useRef<HTMLDivElement>(null);
  const excludeDropdownRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Get all contacts with email from local storage
  const allContactsWithEmail = useMemo(() => getContactsWithEmail(), [getContactsWithEmail]);

  // Extract all unique group labels from contacts (only group labels, no photo tags)
  const allGroupLabels = useMemo(() => {
    const labelSet = new Set<string>();
    
    allContactsWithEmail.forEach(contact => {
      const contactLabels = getContactLabels(contact);
      // getContactLabels now only returns group labels
      contactLabels.forEach(label => {
        labelSet.add(label.name);
      });
    });
    
    return Array.from(labelSet).sort((a, b) => a.localeCompare(b));
  }, [allContactsWithEmail, getContactLabels]);

  // Apply filters to contacts
  const filteredContacts = useMemo(() => {
    return allContactsWithEmail.filter(contact => {
      const displayName = contact.names?.[0]?.displayName || '';
      
      // Email filtering - check all email addresses
      const emails = contact.emailAddresses || [];
      const emailValues = emails.map(email => email.value.toLowerCase());
      const hasMatchingEmail = emailFilter.trim() === '' || 
        emailValues.some(email => email.includes(emailFilter.toLowerCase()));
      
      // Label filtering with include/exclude logic
      const contactLabels = getContactLabels(contact);
      const contactLabelNames = contactLabels.map(label => label.name);
      
      // For include labels: contact must have AT LEAST ONE of the selected include labels (if any are selected)
      const matchesIncludeLabels = includeLabels.length === 0 || 
        includeLabels.some(label => contactLabelNames.includes(label));
      
      // For exclude labels: contact must NOT have ANY of the selected exclude labels
      const matchesExcludeLabels = excludeLabels.length === 0 || 
        !excludeLabels.some(label => contactLabelNames.includes(label));
      
      // Organization filtering
      const orgDetails = getOrganizationDetails(contact);
      const orgSearch = orgFilter.toLowerCase();
      const hasMatchingOrg = orgFilter.trim() === '' || (
        orgDetails && (
          (orgDetails.name && orgDetails.name.toLowerCase().includes(orgSearch)) ||
          (orgDetails.title && orgDetails.title.toLowerCase().includes(orgSearch)) ||
          (orgDetails.department && orgDetails.department.toLowerCase().includes(orgSearch))
        )
      );
      
      return (
        displayName.toLowerCase().includes(nameFilter.toLowerCase()) &&
        hasMatchingEmail &&
        matchesIncludeLabels &&
        matchesExcludeLabels &&
        hasMatchingOrg
      );
    });
  }, [allContactsWithEmail, nameFilter, emailFilter, includeLabels, excludeLabels, orgFilter, getContactLabels, getOrganizationDetails]);

  // Current visible contacts (for infinite scrolling)
  const visibleContacts = useMemo(() => {
    return filteredContacts.slice(0, visibleCount);
  }, [filteredContacts, visibleCount]);

  // Load more contacts when scrolling
  const loadMoreContacts = useCallback(() => {
    if (visibleCount < filteredContacts.length && !isLoadingMore) {
      setIsLoadingMore(true);
      
      // Increased batch size for faster loading
      const newCount = Math.min(visibleCount + CONTACTS_PER_PAGE * 2, filteredContacts.length);
      
      // Use setTimeout to prevent UI freezing when loading many contacts
      setTimeout(() => {
        setVisibleCount(newCount);
        setIsLoadingMore(false);
      }, 50); // Reduced delay for snappier response
    }
  }, [visibleCount, filteredContacts.length, isLoadingMore]);

  // Handle intersection observer for infinite scrolling
  const observerCallback = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry && entry.isIntersecting) {
        loadMoreContacts();
      }
    },
    [loadMoreContacts]
  );

  // Set up intersection observer for infinite scrolling with improved options
  useEffect(() => {
    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: '100px', // Increased margin to load earlier before scrolling to the bottom
      threshold: 0.1,
    });

    const loaderElement = loaderRef.current;
    if (loaderElement) {
      observer.observe(loaderElement);
    }

    return () => {
      if (loaderElement) {
        observer.unobserve(loaderElement);
      }
    };
  }, [observerCallback]);

  // Check if we need to load more contacts when filtered contacts change
  useEffect(() => {
    // If we have very few visible contacts compared to what's filtered,
    // load more contacts automatically
    if (visibleContacts.length < 100 && filteredContacts.length > visibleContacts.length) {
      loadMoreContacts();
    }
  }, [filteredContacts, visibleContacts.length, loadMoreContacts]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (includeDropdownRef.current && !includeDropdownRef.current.contains(event.target as Node)) {
        setIncludeLabelDropdownOpen(false);
      }
      if (excludeDropdownRef.current && !excludeDropdownRef.current.contains(event.target as Node)) {
        setExcludeLabelDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load saved filters on component mount
  useEffect(() => {
    const savedFilters = getFilterPreferences();
    if (savedFilters) {
      if (savedFilters.nameFilter) setNameFilter(savedFilters.nameFilter);
      if (savedFilters.emailFilter) setEmailFilter(savedFilters.emailFilter);
      if (savedFilters.includeLabels) setIncludeLabels(savedFilters.includeLabels);
      if (savedFilters.excludeLabels) setExcludeLabels(savedFilters.excludeLabels);
      if (savedFilters.orgFilter) setOrgFilter(savedFilters.orgFilter);
    }
  }, [getFilterPreferences]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(CONTACTS_PER_PAGE);
  }, [nameFilter, emailFilter, includeLabels, excludeLabels, orgFilter]);

  // Handle scroll events to ensure all contacts are loaded
  useEffect(() => {
    const handleScroll = () => {
      if (contactListRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = contactListRef.current;
        // If we're near the bottom and have more contacts to show, load more
        if (scrollHeight - scrollTop - clientHeight < 200 && 
            visibleContacts.length < filteredContacts.length && 
            !isLoadingMore) {
          loadMoreContacts();
        }
      }
    };

    const contactListElement = contactListRef.current;
    if (contactListElement) {
      contactListElement.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (contactListElement) {
        contactListElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [visibleContacts.length, filteredContacts.length, isLoadingMore, loadMoreContacts]);

  const toggleSelectContact = (resourceName: string) => {
    setSelectedContacts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(resourceName)) {
        newSet.delete(resourceName);
      } else {
        newSet.add(resourceName);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedContacts(new Set());
    } else {
      const newSet = new Set<string>();
      visibleContacts.forEach(contact => {
        newSet.add(contact.resourceName);
      });
      setSelectedContacts(newSet);
    }
    setSelectAll(!selectAll);
  };

  const getContactUrl = (contact: Contact) => {
    // Extract contact ID from resourceName (format: "people/{contact_id}")
    const contactId = contact.resourceName.split('/')[1];
    return `https://contacts.google.com/person/${contactId}`;
  };

  const toggleIncludeLabel = (label: string) => {
    setIncludeLabels(prev => {
      if (prev.includes(label)) {
        return prev.filter(l => l !== label);
      } else {
        return [...prev, label];
      }
    });
  };

  const toggleExcludeLabel = (label: string) => {
    setExcludeLabels(prev => {
      if (prev.includes(label)) {
        return prev.filter(l => l !== label);
      } else {
        return [...prev, label];
      }
    });
  };

  const clearNameFilter = () => setNameFilter('');
  const clearEmailFilter = () => setEmailFilter('');
  const clearOrgFilter = () => setOrgFilter('');
  const clearIncludeLabels = () => setIncludeLabels([]);
  const clearExcludeLabels = () => setExcludeLabels([]);
  const clearLabelFilters = () => {
    setIncludeLabels([]);
    setExcludeLabels([]);
  };

  const handleRefresh = () => {
    refreshContacts();
  };
  
  // Save current filters to preferences
  const handleSaveFilters = () => {
    const currentFilters = {
      nameFilter,
      emailFilter,
      includeLabels,
      excludeLabels,
      orgFilter
    };
    
    saveFilters(currentFilters);
    saveFilterPreferences(currentFilters);
    
    // Show temporary saved message
    const savedIndicator = document.getElementById('filters-saved-indicator');
    if (savedIndicator) {
      savedIndicator.classList.remove('opacity-0');
      setTimeout(() => {
        savedIndicator.classList.add('opacity-0');
      }, 2000);
    }
  };

  // Force load all contacts for small data sets
  const loadAllContacts = () => {
    setVisibleCount(filteredContacts.length);
  };

  return (
    <div className="animate-fadeIn">
      <div className="mb-3 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Contact Groups</h1>
          <p className="text-xs text-gray-600">
            {selectedContacts.size > 0 ? 
              `${selectedContacts.size} ${selectedContacts.size === 1 ? 'contact' : 'contacts'} selected` : 
              isLoading ? 
                'Loading contacts...' : 
                `${allContactsWithEmail.length} contacts with email addresses${
                  filteredContacts.length !== allContactsWithEmail.length ? 
                    ` (${filteredContacts.length} shown with current filters)` : 
                    ''
                }`
            }
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {selectedContacts.size > 0 && (
            <button 
              className="text-xs bg-green-50 hover:bg-green-100 text-green-600 px-2 py-1 rounded flex items-center"
              disabled={true}
            >
              <span>Broadcast</span>
              <span className="ml-1 bg-blue-100 text-blue-800 text-xs rounded-full px-2">Soon</span>
            </button>
          )}
          {/* Filter save button */}
          {(nameFilter || emailFilter || includeLabels.length > 0 || excludeLabels.length > 0 || orgFilter) && (
            <button 
              onClick={handleSaveFilters}
              className="text-xs bg-primary-50 hover:bg-primary-100 text-primary-600 px-2 py-1 rounded flex items-center"
            >
              <Save className="w-3 h-3 mr-1" />
              <span>Save Filters</span>
            </button>
          )}
          <button 
            onClick={handleRefresh}
            className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-1 rounded flex items-center"
            disabled={isLoading}
          >
            <RotateCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>
      
      {/* Saved filters indicator */}
      <div id="filters-saved-indicator" className="mb-2 text-xs text-green-600 opacity-0 transition-opacity duration-300">
        Filters saved successfully
      </div>

      {/* Sync progress indicator */}
      {syncProgress && (
        <div className="mb-3 bg-blue-50 p-2 rounded-lg">
          <div className="flex items-center text-xs text-blue-600">
            <RotateCw className="w-3 h-3 mr-1 animate-spin" />
            <span>Syncing contacts: {syncProgress.current} of {syncProgress.total} ({Math.round((syncProgress.current / syncProgress.total) * 100)}%)</span>
          </div>
          <div className="mt-1 w-full bg-blue-100 rounded-full h-1.5">
            <div 
              className="bg-blue-600 h-1.5 rounded-full" 
              style={{ width: `${Math.round((syncProgress.current / syncProgress.total) * 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Fixed table header with search filters */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="grid grid-cols-12 gap-1 p-2 bg-gray-50">
            <div className="col-span-1 min-w-[20px]"></div>
            <div className="col-span-3 relative">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <Search className="h-3 w-3 text-gray-400" />
              </div>
              <input
                type="text"
                className="form-input block w-full pl-6 pr-6 py-1 text-xs rounded-md"
                placeholder="Search names..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
              />
              {nameFilter && (
                <button 
                  className="absolute inset-y-0 right-0 pr-2 flex items-center"
                  onClick={clearNameFilter}
                >
                  <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            <div className="col-span-2 relative">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <Search className="h-3 w-3 text-gray-400" />
              </div>
              <input
                type="text"
                className="form-input block w-full pl-6 pr-6 py-1 text-xs rounded-md"
                placeholder="Search organizations..."
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
              />
              {orgFilter && (
                <button 
                  className="absolute inset-y-0 right-0 pr-2 flex items-center"
                  onClick={clearOrgFilter}
                >
                  <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            <div className="col-span-3 relative">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <Search className="h-3 w-3 text-gray-400" />
              </div>
              <input
                type="text"
                className="form-input block w-full pl-6 pr-6 py-1 text-xs rounded-md"
                placeholder="Search emails..."
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
              />
              {emailFilter && (
                <button 
                  className="absolute inset-y-0 right-0 pr-2 flex items-center"
                  onClick={clearEmailFilter}
                >
                  <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            <div className="col-span-3 flex space-x-1">
              {/* Include dropdown */}
              <div className="relative flex-1" ref={includeDropdownRef}>
                <div className="flex">
                  <button
                    onClick={() => {
                      setIncludeLabelDropdownOpen(!includeLabelDropdownOpen);
                      setExcludeLabelDropdownOpen(false);
                    }}
                    className="form-input flex items-center justify-between w-full py-1 text-xs rounded-md bg-green-50 hover:bg-green-100 border-green-200"
                  >
                    <div className="flex items-center">
                      <Filter className="h-3 w-3 mr-1 text-green-600" />
                      <span className="text-green-800">
                        {includeLabels.length > 0 
                          ? `Include (${includeLabels.length})`
                          : "Include"}
                      </span>
                    </div>
                    <ChevronDown className="h-3 w-3 text-green-600" />
                  </button>
                  {includeLabels.length > 0 && (
                    <button
                      onClick={clearIncludeLabels}
                      className="ml-1 p-1 rounded-md bg-green-50 hover:bg-green-100 text-green-600"
                      title="Clear include labels"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                
                {includeLabelDropdownOpen && (
                  <div className="absolute mt-1 w-full z-20 bg-white border border-gray-200 rounded-md shadow-lg py-1 max-h-60 overflow-auto">
                    {includeLabels.length > 0 && (
                      <div className="px-2 py-1 border-b border-gray-200">
                        <button 
                          onClick={() => setIncludeLabels([])}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Clear all
                        </button>
                      </div>
                    )}
                    
                    {allGroupLabels.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-gray-500">No group labels available</div>
                    ) : (
                      allGroupLabels.map((label) => {
                        const isIncluded = includeLabels.includes(label);
                        const isExcluded = excludeLabels.includes(label);
                        
                        return (
                          <div 
                            key={`include-${label}`}
                            className={`px-3 py-1.5 text-xs flex items-center justify-between ${isExcluded ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
                            onClick={() => !isExcluded && toggleIncludeLabel(label)}
                          >
                            <span className="truncate pr-2">{label}</span>
                            {isIncluded && (
                              <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              
              {/* Exclude dropdown */}
              <div className="relative flex-1" ref={excludeDropdownRef}>
                <div className="flex">
                  <button
                    onClick={() => {
                      setExcludeLabelDropdownOpen(!excludeLabelDropdownOpen);
                      setIncludeLabelDropdownOpen(false);
                    }}
                    className="form-input flex items-center justify-between w-full py-1 text-xs rounded-md bg-red-50 hover:bg-red-100 border-red-200"
                  >
                    <div className="flex items-center">
                      <Filter className="h-3 w-3 mr-1 text-red-600" />
                      <span className="text-red-800">
                        {excludeLabels.length > 0 
                          ? `Exclude (${excludeLabels.length})`
                          : "Exclude"}
                      </span>
                    </div>
                    <ChevronDown className="h-3 w-3 text-red-600" />
                  </button>
                  {excludeLabels.length > 0 && (
                    <button
                      onClick={clearExcludeLabels}
                      className="ml-1 p-1 rounded-md bg-red-50 hover:bg-red-100 text-red-600"
                      title="Clear exclude labels"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                
                {excludeLabelDropdownOpen && (
                  <div className="absolute mt-1 w-full z-20 bg-white border border-gray-200 rounded-md shadow-lg py-1 max-h-60 overflow-auto">
                    {excludeLabels.length > 0 && (
                      <div className="px-2 py-1 border-b border-gray-200">
                        <button 
                          onClick={() => setExcludeLabels([])}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Clear all
                        </button>
                      </div>
                    )}
                    
                    {allGroupLabels.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-gray-500">No group labels available</div>
                    ) : (
                      allGroupLabels.map((label) => {
                        const isExcluded = excludeLabels.includes(label);
                        const isIncluded = includeLabels.includes(label);
                        
                        return (
                          <div 
                            key={`exclude-${label}`}
                            className={`px-3 py-1.5 text-xs flex items-center justify-between ${isIncluded ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
                            onClick={() => !isIncluded && toggleExcludeLabel(label)}
                          >
                            <span className="truncate pr-2">{label}</span>
                            {isExcluded && (
                              <Check className="h-3 w-3 text-red-600 flex-shrink-0" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-12 py-1 px-2 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-1 min-w-[20px] w-[28px] flex justify-center">
              <input
                type="checkbox"
                className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={selectAll}
                onChange={toggleSelectAll}
              />
            </div>
            <div className="col-span-3 text-xs">Name</div>
            <div className="col-span-2 text-xs">Organization</div>
            <div className="col-span-3 text-xs">Emails</div>
            <div className="col-span-3 text-xs">Groups</div>
          </div>
        </div>

        {isLoading && visibleContacts.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="mt-1 text-xs text-red-700">{error}</p>
            <button 
              onClick={handleRefresh}
              className="mt-3 text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded"
            >
              Try Again
            </button>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts found</h3>
            <p className="mt-1 text-xs text-gray-500">
              {nameFilter || emailFilter || includeLabels.length > 0 || excludeLabels.length > 0 || orgFilter ? 
                'Try different filter settings' : 
                'You don\'t have any contacts with email addresses'}
            </p>
          </div>
        ) : (
          <div ref={contactListRef} className="overflow-y-auto max-h-[calc(100vh-240px)]">
            {visibleContacts.map((contact) => {
              const displayName = contact.names?.[0]?.displayName || 'Unnamed Contact';
              const photoUrl = contact.photos?.[0]?.url || '';
              const emails = contact.emailAddresses || [];
              const labels = getContactLabels(contact);
              const isSelected = selectedContacts.has(contact.resourceName);
              const contactUrl = getContactUrl(contact);
              const orgDetails = getOrganizationDetails(contact);

              return (
                <div 
                  key={contact.resourceName} 
                  className={`grid grid-cols-12 py-1.5 px-2 border-b border-gray-200 text-xs ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <div className="col-span-1 min-w-[20px] w-[28px] flex justify-center items-center">
                    <input
                      type="checkbox"
                      className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={isSelected}
                      onChange={() => toggleSelectContact(contact.resourceName)}
                    />
                  </div>
                  <div className="col-span-3">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 mr-1">
                        {photoUrl ? (
                          <img className="h-6 w-6 rounded-full" src={photoUrl} alt="" />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-3 w-3 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div>
                        <a
                          href={contactUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center text-xs"
                        >
                          {displayName}
                          <ExternalLink className="ml-1 h-2.5 w-2.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2">
                    {orgDetails ? (
                      <div className="text-xs text-gray-600">
                        {orgDetails.title && (
                          <div className="flex items-center">
                            <Briefcase className="h-2.5 w-2.5 mr-1" />
                            <span className="font-medium">{orgDetails.title}</span>
                          </div>
                        )}
                        {orgDetails.name && (
                          <div className="mt-0.5">{orgDetails.name}</div>
                        )}
                        {orgDetails.department && (
                          <div className="italic text-gray-500 text-xs">{orgDetails.department}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-xs">No organization</span>
                    )}
                  </div>
                  <div className="col-span-3">
                    <div className="space-y-0.5">
                      {emails.map((email, idx) => (
                        <div key={idx} className="flex items-center text-xs">
                          <a href={`mailto:${email.value}`} className="text-gray-600 hover:text-gray-900 truncate">
                            {email.value}
                          </a>
                          {email.type && (
                            <span className="ml-1 inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {email.type}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-3">
                    {labels.length > 0 ? (
                      <div className="flex flex-wrap gap-0.5">
                        {labels.map((label, idx) => {
                          const isIncluded = includeLabels.includes(label.name);
                          const isExcluded = excludeLabels.includes(label.name);
                          // All labels are group type since getContactLabels now only returns group labels
                          let bgColor = 'bg-blue-100';
                          let textColor = 'text-blue-800';
                          
                          // Highlight included/excluded labels
                          if (isIncluded) {
                            bgColor = 'bg-green-200';
                            textColor = 'text-green-900';
                          } else if (isExcluded) {
                            bgColor = 'bg-red-200';
                            textColor = 'text-red-900';
                          }
                          
                          return (
                            <span 
                              key={idx}
                              className={`inline-flex items-center px-1 py-0.5 rounded text-xs font-medium ${bgColor} ${textColor}`}
                            >
                              {label.name}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-xs">No groups</span>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Improved infinite scroll loader element */}
            {visibleContacts.length < filteredContacts.length && (
              <div 
                ref={loaderRef}
                className="py-4 text-center text-sm text-gray-500"
                id="contacts-loader"
              >
                {isLoadingMore ? (
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary-500 mr-2"></div>
                    Loading more contacts...
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 flex flex-col items-center">
                    <div>Scroll to load more</div>
                    <div className="mt-1">
                      ({visibleContacts.length} of {filteredContacts.length} shown)
                    </div>
                    {/* Load all button for large data sets */}
                    {filteredContacts.length - visibleContacts.length > 100 && (
                      <button
                        onClick={loadAllContacts}
                        className="mt-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-1 rounded-md"
                      >
                        Load all contacts
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Show when all contacts are loaded */}
            {filteredContacts.length > 0 && visibleContacts.length === filteredContacts.length && (
              <div className="py-3 text-center text-xs text-gray-500">
                All contacts loaded ({filteredContacts.length} total)
              </div>
            )}
          </div>
        )}
      </div>
      
      {selectedContacts.size > 0 && (
        <div className="mt-3 bg-white p-2 rounded-lg shadow flex items-center justify-between">
          <span className="text-xs font-medium">
            {selectedContacts.size} {selectedContacts.size === 1 ? 'contact' : 'contacts'} selected
          </span>
          <div className="flex space-x-2">
            <button
              disabled={true}
              className="text-xs bg-primary-50 text-primary-600 px-3 py-1 rounded-md flex items-center opacity-75 cursor-not-allowed"
            >
              <span>Broadcast</span>
              <span className="ml-1 bg-blue-100 text-blue-800 text-xs rounded-full px-1.5">Soon</span>
            </button>
            <button
              onClick={() => setSelectedContacts(new Set())}
              className="text-xs text-red-600 hover:text-red-800"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsPage;
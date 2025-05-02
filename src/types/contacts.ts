export interface ContactLabel {
  name: string;
  type?: string;
}

export interface ContactGroup {
  resourceName: string;
  metadata: { updateTime: string };
  groupType: string;
  name: string;
  memberCount: number;
}

export interface ContactOrganization {
  name?: string; 
  title?: string; 
  department?: string;
  metadata?: { primary?: boolean };
}

export interface Contact {
  resourceName: string;
  names?: { displayName: string; metadata?: { source?: { id?: string } } }[];
  photos?: { url: string }[];
  emailAddresses?: { value: string; type?: string; metadata?: { primary?: boolean } }[];
  phoneNumbers?: { value: string }[];
  organizations?: ContactOrganization[];
  memberships?: { contactGroupMembership: { contactGroupResourceName: string } }[];
  userDefined?: { key: string; value: string }[];
  // Local tracking properties
  _localUpdatedAt?: number;
  _isDirty?: boolean;
}

export interface ContactsMetadata {
  lastSyncTime: number;
  totalCount: number;
  version: number;
}
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FolderOpen, File, FileText, FileImage, FileCode, FileSpreadsheet, Presentation as FilePresentation, AlertCircle, ExternalLink, Search } from 'lucide-react';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  thumbnailLink?: string;
  iconLink: string;
  modifiedTime: string;
}

const MIME_TYPE_ICONS: Record<string, any> = {
  'application/vnd.google-apps.folder': FolderOpen,
  'application/vnd.google-apps.document': FileText,
  'application/vnd.google-apps.spreadsheet': FileSpreadsheet,
  'application/vnd.google-apps.presentation': FilePresentation,
  'application/vnd.google-apps.script': FileCode,
  'image/': FileImage,
  'application/': File,
  'text/': FileText,
  'default': File
};

const DrivePage = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchDriveFiles = async () => {
      try {
        if (!user?.token) return;
        
        const response = await fetch(
          'https://www.googleapis.com/drive/v3/files?fields=files(id,name,mimeType,webViewLink,thumbnailLink,iconLink,modifiedTime)&pageSize=100',
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          }
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch Drive files');
        }
        
        const data = await response.json();
        setFiles(data.files || []);
      } catch (error) {
        console.error('Error fetching Drive files:', error);
        setError('Failed to load Drive files. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDriveFiles();
  }, [user]);

  const getFileIcon = (mimeType: string) => {
    // Check exact match
    if (MIME_TYPE_ICONS[mimeType]) {
      return MIME_TYPE_ICONS[mimeType];
    }
    
    // Check for partial match
    for (const key of Object.keys(MIME_TYPE_ICONS)) {
      if (mimeType.startsWith(key)) {
        return MIME_TYPE_ICONS[key];
      }
    }
    
    // Default icon
    return MIME_TYPE_ICONS.default;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Google Drive</h1>
        <p className="mt-1 text-sm text-gray-600">
          Access your Drive files
        </p>
      </div>

      <div className="mb-6">
        <div className="relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="form-input block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : error ? (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No files found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery ? 'Try a different search term' : 'Your Drive appears to be empty'}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Modified
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFiles.map((file) => {
                const FileIcon = getFileIcon(file.mimeType);
                
                return (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center">
                          <FileIcon className="h-6 w-6 text-gray-500" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {file.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                      <div className="text-sm text-gray-500">
                        {file.mimeType.split('/').pop()?.split('.').pop()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                      <div className="text-sm text-gray-500">
                        {formatDate(file.modifiedTime)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a 
                        href={file.webViewLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-900 inline-flex items-center"
                      >
                        Open
                        <ExternalLink className="ml-1 h-4 w-4" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DrivePage;
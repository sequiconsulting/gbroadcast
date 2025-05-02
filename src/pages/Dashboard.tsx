import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  MessageSquare,
  ChevronRight,
  Send,
  Zap,
  RefreshCw,
  Bell
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [contactsCount, setContactsCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContactsCount = async () => {
      try {
        if (!user?.token) return;
        
        const response = await fetch(
          'https://people.googleapis.com/v1/people/me/connections?personFields=names&pageSize=1',
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          }
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch contacts');
        }
        
        const data = await response.json();
        setContactsCount(data.totalPeople || 0);
      } catch (error) {
        console.error('Error fetching contacts count:', error);
        setContactsCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContactsCount();
  }, [user]);

  const services = [
    {
      name: 'Contacts',
      description: 'View and manage your Google contacts',
      icon: Users,
      path: '/contacts',
      count: contactsCount,
      bgColor: 'bg-blue-500',
      color: 'text-white',
    },
    {
      name: 'Broadcast',
      description: 'Send messages to contact groups',
      icon: MessageSquare,
      path: '/contacts',
      bgColor: 'bg-emerald-500',
      color: 'text-white',
      comingSoon: true
    },
    {
      name: 'Templates',
      description: 'Create reusable message templates',
      icon: Bell,
      path: '/templates',
      bgColor: 'bg-amber-500',
      color: 'text-white',
      comingSoon: true
    }
  ];

  return (
    <div className="animate-fadeIn">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {user?.name?.split(' ')[0]}</h1>
        <p className="mt-1 text-slate-600">
          Broadcast messages to your Google contact groups easily
        </p>
      </div>

      <div className="bg-white shadow-md rounded-xl overflow-hidden mb-8 border border-slate-200">
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-5 sm:px-8">
          <div className="flex items-center">
            {user?.picture && (
              <img
                src={user.picture}
                alt="Profile"
                className="h-14 w-14 rounded-full ring-2 ring-white/70"
              />
            )}
            <div className="ml-4 text-white">
              <h2 className="text-xl font-semibold tracking-tight">{user?.name}</h2>
              <p className="text-primary-100 text-sm">{user?.email}</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 sm:px-8 flex flex-wrap gap-4 justify-between">
          <div className="flex items-center">
            <Zap className="h-5 w-5 text-amber-500 mr-2" />
            <span className="text-slate-600 text-sm">Account Status: <span className="font-medium text-slate-800">Active</span></span>
          </div>
          <div className="flex items-center">
            <RefreshCw className="h-5 w-5 text-emerald-500 mr-2" />
            <span className="text-slate-600 text-sm">Last Sync: <span className="font-medium text-slate-800">Just now</span></span>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {services.map((service) => (
          <Link
            key={service.name}
            to={service.comingSoon ? '#' : service.path}
            className="group block rounded-xl bg-white shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all"
            onClick={service.comingSoon ? (e) => e.preventDefault() : undefined}
          >
            <div className={`${service.bgColor} p-4`}>
              <service.icon className={`h-7 w-7 ${service.color}`} />
            </div>
            <div className="p-4">
              <div className="flex items-center">
                <h3 className="text-base font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">
                  {service.name}
                </h3>
                {service.comingSoon && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                    Coming Soon
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {service.description}
              </p>
              {service.count !== null && service.count !== undefined && (
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {isLoading ? (
                    <span className="inline-block h-4 w-16 bg-slate-200 rounded animate-pulse"></span>
                  ) : (
                    <span className="flex items-center">
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-100 text-primary-800 text-xs mr-1">
                        <Users className="h-3 w-3" />
                      </span>
                      {service.count.toLocaleString()} contacts
                    </span>
                  )}
                </p>
              )}
              <div className="mt-3 flex justify-end">
                <span className="inline-flex items-center text-xs font-medium text-primary-600 group-hover:text-primary-700">
                  {service.comingSoon ? 'Coming soon' : 'Get started'} 
                  <ChevronRight className="ml-1 h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl p-6 mb-6 border border-blue-100">
        <div className="flex items-center mb-4">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Send className="h-5 w-5 text-primary-600" />
          </div>
          <h3 className="ml-3 text-lg font-semibold text-slate-900">How To Use gBroadcast</h3>
        </div>
        <ol className="list-decimal list-inside space-y-3 text-sm text-slate-700 ml-4">
          <li>Browse your contacts to view and organize group memberships</li>
          <li>Select contacts individually or by group to create recipient lists</li>
          <li>Compose your message with our rich text editor (coming soon)</li>
          <li>Preview and send your broadcast to selected contacts</li>
        </ol>
      </div>

      <div className="mt-8 rounded-xl bg-white p-6 border border-slate-200 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center">
          <Zap className="text-amber-500 mr-2 h-5 w-5" />
          Quick Tips
        </h3>
        <ul className="grid gap-2 text-sm text-slate-700">
          {[
            "Organize contacts into groups for easier broadcasting",
            "Use filters to quickly find specific contacts",
            "Include and exclude specific labels to refine your recipient list",
            "Schedule messages for future delivery (coming soon)"
          ].map((tip, index) => (
            <li key={index} className="flex items-start">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-100 text-primary-800 text-xs mr-2 flex-shrink-0 mt-0.5">
                {index + 1}
              </span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
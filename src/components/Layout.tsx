import { ReactNode, useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Home, 
  Users,
  LogOut, 
  Menu, 
  X,
  MessageSquare,
  Settings,
  Bell,
  Search,
  ChevronDown
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const navigation = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Contacts', path: '/contacts', icon: Users },
    { name: 'Messages', path: '/messages', icon: MessageSquare, comingSoon: true },
  ];

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const toggleProfileMenu = () => setProfileMenuOpen(!profileMenuOpen);
  
  const handleLogout = () => {
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
    logout();
  };

  // Add scroll detection for header shadow
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow overflow-y-auto bg-white shadow-lg rounded-r-xl">
          <div className="flex items-center h-16 flex-shrink-0 px-5 bg-gradient-to-r from-primary-600 to-primary-700 rounded-tr-xl">
            <h1 className="text-xl font-bold text-white tracking-tight">gBroadcast</h1>
          </div>
          <div className="flex flex-col flex-grow px-4 pt-6 pb-4">
            <nav className="flex-1 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.name}
                    to={item.comingSoon ? '#' : item.path}
                    className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                    onClick={item.comingSoon ? (e) => e.preventDefault() : undefined}
                  >
                    <Icon 
                      className={`mr-3 h-5 w-5 transition-colors ${isActive ? 'text-primary-500' : 'text-slate-400 group-hover:text-slate-500'}`} 
                      aria-hidden="true" 
                    />
                    <span className="flex-1">{item.name}</span>
                    {item.comingSoon && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Soon
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 p-4 border-t border-slate-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {user?.picture && (
                  <img
                    className="h-9 w-9 rounded-full ring-2 ring-white"
                    src={user.picture}
                    alt={user.name || "User profile"}
                  />
                )}
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-700 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              <button 
                className="ml-auto flex-shrink-0 p-1 text-slate-400 hover:text-slate-500 rounded-full hover:bg-slate-100 transition-colors"
                onClick={handleLogout}
                aria-label="Log out"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="lg:hidden">
        <div className={`fixed top-0 left-0 right-0 z-10 flex items-center justify-between h-16 px-4 bg-white ${scrolled ? 'shadow-md' : ''} transition-shadow duration-200`}>
          <div className="flex items-center">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              onClick={toggleMobileMenu}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
            <h1 className="ml-3 text-xl font-bold text-primary-600 tracking-tight">gBroadcast</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <button className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
              <Search className="h-5 w-5" />
            </button>
            <button className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
              <Bell className="h-5 w-5" />
            </button>
            {user?.picture && (
              <img
                src={user.picture}
                alt={user.name || "User profile"}
                className="h-8 w-8 rounded-full ring-2 ring-white"
                onClick={toggleProfileMenu}
              />
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 flex">
            <div 
              className="fixed inset-0 bg-slate-600 bg-opacity-75 transition-opacity"
              onClick={toggleMobileMenu}
            ></div>
            <div className="relative flex flex-col w-full max-w-xs bg-white">
              <div className="flex items-center h-16 flex-shrink-0 px-4 bg-gradient-to-r from-primary-600 to-primary-700">
                <h1 className="text-xl font-bold text-white tracking-tight">gBroadcast</h1>
                <button
                  className="ml-auto p-2 rounded-md text-white hover:bg-primary-800"
                  onClick={toggleMobileMenu}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pt-5 pb-4">
                <nav className="px-2 space-y-2">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <NavLink
                        key={item.name}
                        to={item.comingSoon ? '#' : item.path}
                        className={`group flex items-center px-3 py-3 text-base font-medium rounded-lg ${
                          isActive
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                        onClick={(e) => {
                          if (item.comingSoon) {
                            e.preventDefault();
                          } else {
                            toggleMobileMenu();
                          }
                        }}
                      >
                        <Icon 
                          className={`mr-4 h-6 w-6 ${isActive ? 'text-primary-500' : 'text-slate-400 group-hover:text-slate-500'}`} 
                          aria-hidden="true" 
                        />
                        <span className="flex-1">{item.name}</span>
                        {item.comingSoon && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Soon
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </nav>
              </div>
              <div className="flex-shrink-0 p-4 border-t border-slate-200">
                <div className="flex items-center">
                  <div>
                    {user?.picture && (
                      <img
                        className="h-10 w-10 rounded-full"
                        src={user.picture}
                        alt="User profile"
                      />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="text-base font-medium text-slate-700 truncate">{user?.name}</p>
                    <p className="text-sm text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <button 
                    className="ml-auto flex-shrink-0 p-1 text-slate-400 hover:text-slate-500 rounded-full hover:bg-slate-100"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
import { Link } from 'react-router-dom';
import { HomeIcon } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-6xl font-extrabold text-gray-900">404</h1>
          <p className="mt-2 text-3xl font-bold text-gray-900">Page not found</p>
          <p className="mt-2 text-sm text-gray-600">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>
        
        <div className="mt-8 text-center">
          <Link 
            to="/"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <HomeIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
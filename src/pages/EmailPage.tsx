import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Send, X, CheckCircle, AlertCircle } from 'lucide-react';

const EmailPage = () => {
  const { user } = useAuth();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!to || !subject || !body) {
      setStatus('error');
      setErrorMessage('Please fill in all fields');
      return;
    }
    
    setIsLoading(true);
    setStatus('idle');
    
    try {
      const message = [
        'To: ' + to,
        'Subject: ' + subject,
        'Content-Type: text/plain; charset=utf-8',
        '',
        body
      ].join('\r\n');
      
      // Base64 encode the message
      const encodedMessage = btoa(message)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      
      const response = await fetch(
        'https://www.googleapis.com/gmail/v1/users/me/messages/send',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${user?.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            raw: encodedMessage
          }),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to send email');
      }
      
      setStatus('success');
      // Reset form
      setTo('');
      setSubject('');
      setBody('');
    } catch (error: any) {
      console.error('Error sending email:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Failed to send email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetStatus = () => {
    setStatus('idle');
    setErrorMessage('');
  };

  return (
    <div className="animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Send Email</h1>
        <p className="mt-1 text-sm text-gray-600">
          Compose and send an email via Gmail
        </p>
      </div>

      {status === 'success' && (
        <div className="rounded-md bg-green-50 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Email sent successfully!
              </p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  type="button"
                  onClick={resetStatus}
                  className="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <span className="sr-only">Dismiss</span>
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-md bg-red-50 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{errorMessage}</p>
              </div>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  type="button"
                  onClick={resetStatus}
                  className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <span className="sr-only">Dismiss</span>
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            <div>
              <label htmlFor="to" className="block text-sm font-medium text-gray-700">
                To
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  name="to"
                  id="to"
                  className="form-input"
                  placeholder="recipient@example.com"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                Subject
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="subject"
                  id="subject"
                  className="form-input"
                  placeholder="Email subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="body" className="block text-sm font-medium text-gray-700">
                Message
              </label>
              <div className="mt-1">
                <textarea
                  id="body"
                  name="body"
                  rows={8}
                  className="form-input"
                  placeholder="Type your message here..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary inline-flex items-center"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="mt-8 bg-yellow-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-yellow-800">Important Note</h3>
        <div className="mt-2 text-sm text-yellow-700">
          <p>For this application to work properly, you need to:</p>
          <ol className="list-decimal ml-5 mt-2 space-y-1">
            <li>Set up your Google Cloud project with appropriate OAuth credentials</li>
            <li>Configure the VITE_GOOGLE_CLIENT_ID environment variable in your .env file</li>
            <li>Add the required API scopes (Gmail, Contacts, Drive) to your OAuth consent screen</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default EmailPage;
import React, { useState } from 'react';
import axios from 'axios';
import {
  Search,
  Globe,
  Calendar,
  User,
  Mail,
  Server,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
  Clock,
  Shield
} from 'lucide-react';

interface WhoisData {
  domainName?: string;
  registrar?: string;
  registrationDate?: string;
  expirationDate?: string;
  estimatedDomainAge?: string;
  hostnames?: string;
  registrantName?: string;
  technicalContactName?: string;
  administrativeContactName?: string;
  contactEmail?: string;
}

const App = () => {
  const [domain, setDomain] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'domain' | 'contact'>('domain');
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<WhoisData | null>(null);
  const [error, setError] = useState<string>('');

  // Validate domain name format
  const isValidDomain = (domain: string): boolean => {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Submit triggered'); 
    if (!domain.trim()) {
      setError('Please enter a domain name');
      return;
    }

    if (!isValidDomain(domain.trim())) {
      setError('Please enter a valid domain name (e.g., google.com)');
      return;
    }

    setLoading(true);
    setError('');
    setData(null);

    try {
      const [domainRes, contactRes] = await Promise.all([
        axios.get<WhoisData>('/api/whois', {
          params: { domain: domain.trim().toLowerCase(), type: 'domain' }
        }),
        axios.get<WhoisData>('/api/whois', {
          params: { domain: domain.trim().toLowerCase(), type: 'contact' }
        })
      ]);

      setData({
        ...domainRes.data,
        ...contactRes.data
      });

    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.data?.message) {
          setError(err.response.data.message);
        } else if (err.response?.status === 404) {
          setError('API endpoint not found. Please check if the backend server is running.');
        } else {
          setError('An error occurred while fetching domain information. Please try again.');
        }
      } else {
        setError('Unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClear = (): void => {
    setDomain('');
    setData(null);
    setError('');
  };

  const renderDomainInfo = () => {
    if (!data) return null;
    
    const truncateHostnames = (hostnames?: string): string => {
      if (!hostnames) return 'Not available';
      return hostnames.length > 25 ? hostnames.slice(0, 25) + '...' : hostnames;
    };

    const infoItems = [
      { icon: Globe, label: 'Domain Name', value: data.domainName },
      { icon: Shield, label: 'Registrar', value: data.registrar },
      { icon: Calendar, label: 'Registration Date', value: data.registrationDate },
      { icon: Clock, label: 'Expiration Date', value: data.expirationDate },
      { icon: Info, label: 'Estimated Domain Age', value: data.estimatedDomainAge },
      { icon: Server, label: 'Hostnames', value: truncateHostnames(data.hostnames) }
    ];

    return (
      <div className="fade-in">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <Globe className="mr-2 text-blue-500" size={24} />
          Domain Information
        </h3>
        <div className="grid gap-4">
          {infoItems.map((item, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover-lift">
              <div className="flex items-start space-x-3">
                <item.icon className="text-blue-500 mt-1 flex-shrink-0" size={20} />
                <div className="flex-grow">
                  <p className="font-medium text-gray-700">{item.label}</p>
                  <p className="text-gray-900 mt-1">{item.value || 'Not available'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderContactInfo = () => {
    if (!data) return null;

    const contactItems = [
      { icon: User, label: 'Registrant Name', value: data.registrantName },
      { icon: User, label: 'Technical Contact Name', value: data.technicalContactName },
      { icon: User, label: 'Administrative Contact Name', value: data.administrativeContactName },
      { icon: Mail, label: 'Contact Email', value: data.contactEmail }
    ];

    return (
      <div className="fade-in">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <User className="mr-2 text-green-500" size={24} />
          Contact Information
        </h3>
        <div className="grid gap-4">
          {contactItems.map((item, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover-lift">
              <div className="flex items-start space-x-3">
                <item.icon className="text-green-500 mt-1 flex-shrink-0" size={20} />
                <div className="flex-grow">
                  <p className="font-medium text-gray-700">{item.label}</p>
                  <p className="text-gray-900 mt-1">{item.value || 'Not available'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* Header */}
      <header className="gradient-bg text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold text-center mb-2">Whois Domain Lookup</h1>
          <p className="text-center text-blue-100 max-w-2xl mx-auto">
            Get comprehensive information about any domain including registration details, 
            contact information, and technical data.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Search Form */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 hover-lift">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
                  Domain Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="domain"
                    value={domain}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDomain(e.target.value)}
                    placeholder="Enter domain name (e.g., amazon.com)"
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    disabled={loading}
                  />
                  <Globe className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Information Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedType('domain')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedType === 'domain'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    disabled={loading}
                  >
                    <Globe className="mx-auto mb-1" size={20} />
                    <span className="text-sm font-medium">Domain Info</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedType('contact')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedType === 'contact'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    disabled={loading}
                  >
                    <User className="mx-auto mb-1" size={20} />
                    <span className="text-sm font-medium">Contact Info</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={20} />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2" size={20} />
                      Search Domain
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all"
                  disabled={loading}
                >
                  Clear
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 fade-in">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="text-red-500 mr-3 flex-shrink-0" size={20} />
                <div>
                  <h4 className="font-medium text-red-800">Error</h4>
                  <p className="text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {data && !error && (
          <div className="max-w-2xl mx-auto mb-8 fade-in">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="text-green-500 mr-3 flex-shrink-0" size={20} />
                <div>
                  <h4 className="font-medium text-green-800">Success</h4>
                  <p className="text-green-700 mt-1">
                    Domain and contact information retrieved successfully
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {data && (
          <div className="max-w-4xl mx-auto">
            {selectedType === 'domain' ? renderDomainInfo() : renderContactInfo()}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-300">
            Whois Domain Lookup Application - Built with React and Node.js
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Test with domains like amazon.com, google.com, or github.com
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;

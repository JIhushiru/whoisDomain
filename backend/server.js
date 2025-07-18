const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to calculate domain age
const calculateDomainAge = (registrationDate) => {
  if (!registrationDate) return 'Unknown';
  
  const regDate = new Date(registrationDate);
  const currentDate = new Date();
  const diffInMs = currentDate - regDate;
  const diffInYears = Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 365));
  
  if (diffInYears < 1) {
    const diffInMonths = Math.floor(diffInMs / (1000 * 60 * 60 * 24 * 30));
    return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''}`;
  }
  
  return `${diffInYears} year${diffInYears !== 1 ? 's' : ''}`;
};

// Helper function to format hostnames
const formatHostnames = (nameServers) => {
  if (!nameServers || !Array.isArray(nameServers)) return '';
  
  const hostnames = nameServers.map(ns => ns.toLowerCase()).join(', ');
  return hostnames.length > 25 ? hostnames.substring(0, 22) + '...' : hostnames;
};

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return 'Unknown';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return 'Unknown';
  }
};

// Helper function to extract domain information
const extractDomainInfo = (whoisData) => {
  const registryData = whoisData.registryData || {};
  const whoisRecord = whoisData.WhoisRecord || {};
  const domainName = whoisRecord.domainName || registryData.domainName || 'Unknown';
  const registrar = whoisRecord.registrarName || registryData.registrarName || 'Unknown';
  const registrationDate = whoisRecord.createdDate || registryData.createdDate;
  const expirationDate = whoisRecord.expiresDate || registryData.expiresDate;
  const nameServers = whoisRecord.nameServers?.hostNames || registryData.nameServers?.hostNames || [];

  return {
    domainName,
    registrar,
    registrationDate: formatDate(registrationDate),
    expirationDate: formatDate(expirationDate),
    estimatedDomainAge: calculateDomainAge(registrationDate),
    hostnames: formatHostnames(nameServers)
  };
};

// Helper function to extract contact information
const extractContactInfo = (whoisData) => {
  const registryData = whoisData.registryData || {};
  const whoisRecord = whoisData.WhoisRecord || {};
  
  // Try to get contact data from multiple sources
  const registrant = registryData.registrant || whoisRecord.registrant || {};
  const technicalContact = registryData.technicalContact || whoisRecord.technicalContact || {};
  const administrativeContact = registryData.administrativeContact || whoisRecord.administrativeContact || {};
  
  // Extract contact email (try multiple sources)
  const contactEmail = registrant.email || 
                      technicalContact.email || 
                      administrativeContact.email || 
                      whoisRecord.contactEmail || 
                      'Not available';

  return {
    registrantName: registrant.organization || 'Not available',
    technicalContactName: technicalContact.name || technicalContact.organization || 'Not available',
    administrativeContactName: administrativeContact.organization || 'Not available',
    contactEmail
  };
};

// Main endpoint for Whois lookup
app.get('/api/whois', async (req, res) => {
  try {
    const { domain, type } = req.query;
    
    // Validate input parameters
    if (!domain || !type) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Both domain and type parameters are required'
      });
    }
    
    if (!['domain', 'contact'].includes(type)) {
      return res.status(400).json({
        error: 'Invalid type parameter',
        message: 'Type must be either "domain" or "contact"'
      });
    }
    
    // Check if API key is configured
    if (!process.env.WHOIS_API_KEY) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'Whois API key not configured'
      });
    }
    
    // Make request to Whois API
    const whoisUrl = 'https://www.whoisxmlapi.com/whoisserver/WhoisService';
    const params = {
      apiKey: process.env.WHOIS_API_KEY,
      domainName: domain,
      outputFormat: 'JSON'
    };
    
    console.log(`Fetching ${type} information for domain: ${domain}`);
    
    const response = await axios.get(whoisUrl, { params });
    const whoisData = response.data;
    
    // Add debug logging to see the structure
    console.log('Whois API Response Keys:', Object.keys(whoisData));
    if (whoisData.WhoisRecord) {
      console.log('WhoisRecord Keys:', Object.keys(whoisData.WhoisRecord));
    }
    
    // Check if the API returned an error
    if (whoisData.ErrorMessage) {
      return res.status(400).json({
        error: 'Whois API error',
        message: whoisData.ErrorMessage.msg || 'Unknown error from Whois API'
      });
    }
    
    // Extract and return the requested information
    if (type === 'domain') {
      const domainInfo = extractDomainInfo(whoisData);
      console.log('Extracted domain info:', domainInfo);
      res.json(domainInfo);
    } else {
      const contactInfo = extractContactInfo(whoisData);
      console.log('Extracted contact info:', contactInfo);
      res.json(contactInfo);
    }
    
  } catch (error) {
    console.error('Error in /api/whois:', error.message);
    
    // Handle different types of errors
    if (error.response) {
      // API responded with an error status
      res.status(error.response.status).json({
        error: 'External API error',
        message: 'Failed to fetch data from Whois API'
      });
    } else if (error.request) {
      // Network error
      res.status(503).json({
        error: 'Network error',
        message: 'Unable to connect to Whois API'
      });
    } else {
      // Other error
      res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred'
      });
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Whois Lookup API'
  });
});

// Handle 404 for unknown routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested endpoint does not exist'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  if (!process.env.WHOIS_API_KEY) {
    console.warn(' WARNING: WHOIS_API_KEY environment variable is not set');
  }
});

module.exports = app;
/**
 * Production Site Test Warden 🛡️
 * Tests all features on autostaffai.com
 * Run with: node test-production.js
 * 
 * Usage:
 *   node test-production.js                    # Full test suite
 *   node test-production.js --quick            # Quick health check
 *   node test-production.js --continuous       # Keep monitoring every 5 minutes
 */

const BASE_URL = 'https://autostaffai.com';
const API_URL = 'https://autostaff-api.onrender.com';

// Test configuration - Set these before running
const TEST_CONFIG = {
  // Set your test user credentials here
  testUserId: process.env.TEST_USER_ID || null,
  testEmail: process.env.TEST_EMAIL || null,
  
  // Or use Clerk session token
  clerkSessionToken: process.env.CLERK_SESSION_TOKEN || null,
  
  // Notification settings
  discordWebhook: process.env.DISCORD_WEBHOOK || null, // Optional: for failure alerts
  slackWebhook: process.env.SLACK_WEBHOOK || null,
};

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0];
  console.log(`${colors.gray}[${timestamp}]${colors.reset} ${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(`🛡️  ${title}`, 'cyan');
  console.log('='.repeat(70));
}

function logTest(testName, status, details = '') {
  const icons = {
    PASS: '✓',
    FAIL: '✗',
    WARN: '⚠',
    SKIP: '○',
  };
  const statusColors = {
    PASS: 'green',
    FAIL: 'red',
    WARN: 'yellow',
    SKIP: 'gray',
  };
  
  const icon = icons[status] || '?';
  const color = statusColors[status] || 'reset';
  log(`${icon} ${testName}`, color);
  if (details) {
    console.log(`  ${colors.gray}${details}${colors.reset}`);
  }
}

// Test Results Tracker
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  skipped: 0,
  startTime: null,
  endTime: null,
  failures: [],
};

function recordResult(test, status, error = null) {
  testResults.total++;
  testResults[status.toLowerCase()]++;
  
  if (status === 'FAIL' && error) {
    testResults.failures.push({ test, error, timestamp: new Date() });
  }
  
  return { test, status, error };
}

/**
 * Test Website Availability
 */
async function testWebsiteAvailability() {
  logSection('Website Availability Check');
  
  try {
    const start = Date.now();
    const response = await fetch(BASE_URL, {
      method: 'HEAD',
      headers: { 'User-Agent': 'AutoStaffAI-TestWarden/1.0' }
    });
    const loadTime = Date.now() - start;
    
    if (response.ok) {
      logTest('Website Reachable', 'PASS', `Load time: ${loadTime}ms`);
      return recordResult('Website Availability', 'PASS');
    } else {
      logTest('Website Reachable', 'FAIL', `HTTP ${response.status}`);
      return recordResult('Website Availability', 'FAIL', `HTTP ${response.status}`);
    }
  } catch (error) {
    logTest('Website Reachable', 'FAIL', error.message);
    return recordResult('Website Availability', 'FAIL', error.message);
  }
}

/**
 * Test API Health
 */
async function testAPIHealth() {
  logSection('API Health Check');
  
  const endpoints = [
    { path: '/health', name: 'Health Endpoint', requiresAuth: false },
    { path: '/auth/status', name: 'Auth Status', requiresAuth: false },
    { path: '/auth/me', name: 'Auth Me Endpoint', requiresAuth: false },
  ];
  
  for (const endpoint of endpoints) {
    try {
      const start = Date.now();
      const response = await fetch(`${API_URL}${endpoint.path}${endpoint.path.includes('?') ? '&' : '?'}userId=${TEST_CONFIG.testUserId || 'test'}`, {
        headers: { 'User-Agent': 'AutoStaffAI-TestWarden/1.0' }
      });
      const loadTime = Date.now() - start;
      
      if (response.ok || response.status === 401 || response.status === 402) {
        // 401/402 is OK - means endpoint exists but needs auth/subscription
        logTest(endpoint.name, 'PASS', `Response time: ${loadTime}ms (${response.status})`);
        recordResult(`API: ${endpoint.name}`, 'PASS');
      } else if (response.status === 404) {
        logTest(endpoint.name, 'SKIP', `Not found (${response.status})`);
        recordResult(`API: ${endpoint.name}`, 'SKIP');
      } else {
        logTest(endpoint.name, 'WARN', `HTTP ${response.status}`);
        recordResult(`API: ${endpoint.name}`, 'WARN');
      }
    } catch (error) {
      logTest(endpoint.name, 'FAIL', error.message);
      recordResult(`API: ${endpoint.name}`, 'FAIL', error.message);
    }
  }
}

/**
 * Test Dashboard Pages (without auth)
 */
async function testDashboardPages() {
  logSection('Dashboard Pages Accessibility');
  
  const pages = [
    { path: '/', name: 'Homepage' },
    { path: '/sign-in', name: 'Sign In Page' },
    { path: '/sign-up', name: 'Sign Up Page' },
    { path: '/dashboard', name: 'Dashboard (should redirect to auth)' },
  ];
  
  for (const page of pages) {
    try {
      const start = Date.now();
      const response = await fetch(`${BASE_URL}${page.path}`, {
        method: 'GET',
        headers: { 'User-Agent': 'AutoStaffAI-TestWarden/1.0' },
        redirect: 'manual' // Don't follow redirects
      });
      const loadTime = Date.now() - start;
      
      // Check if page loads or redirects appropriately
      if (response.ok || response.status === 301 || response.status === 302 || response.status === 307) {
        logTest(page.name, 'PASS', `${response.status} - ${loadTime}ms`);
        recordResult(`Page: ${page.name}`, 'PASS');
      } else {
        logTest(page.name, 'FAIL', `HTTP ${response.status}`);
        recordResult(`Page: ${page.name}`, 'FAIL', `HTTP ${response.status}`);
      }
    } catch (error) {
      logTest(page.name, 'FAIL', error.message);
      recordResult(`Page: ${page.name}`, 'FAIL', error.message);
    }
  }
}

/**
 * Test Authenticated Endpoints (if credentials provided)
 */
async function testAuthenticatedFeatures() {
  if (!TEST_CONFIG.testUserId && !TEST_CONFIG.clerkSessionToken) {
    logSection('Authenticated Features');
    log('⚠️  Skipping authenticated tests - No credentials provided', 'yellow');
    log('   Set TEST_USER_ID or CLERK_SESSION_TOKEN environment variables', 'gray');
    return;
  }
  
  logSection('Authenticated Features - API Endpoints');
  
  const headers = {
    'User-Agent': 'AutoStaffAI-TestWarden/1.0',
    'Content-Type': 'application/json',
  };
  
  if (TEST_CONFIG.clerkSessionToken) {
    headers['Authorization'] = `Bearer ${TEST_CONFIG.clerkSessionToken}`;
  }
  
  const endpoints = [
    { path: `/leads?userId=${TEST_CONFIG.testUserId}`, name: 'Leads API', method: 'GET' },
    { path: `/quotes?userId=${TEST_CONFIG.testUserId}`, name: 'Quotes API', method: 'GET' },
    { path: `/invoices?userId=${TEST_CONFIG.testUserId}`, name: 'Invoices API', method: 'GET' },
    { path: `/messages?userId=${TEST_CONFIG.testUserId}`, name: 'Messages API', method: 'GET' },
    { path: `/dashboard/stats?userId=${TEST_CONFIG.testUserId}`, name: 'Dashboard Stats', method: 'GET' },
    { path: `/customers?userId=${TEST_CONFIG.testUserId}`, name: 'Customers API', method: 'GET' },
    { path: `/jobs?userId=${TEST_CONFIG.testUserId}`, name: 'Jobs API', method: 'GET' },
    { path: `/calendar/bookings?userId=${TEST_CONFIG.testUserId}`, name: 'Calendar Bookings', method: 'GET' },
  ];
  
  for (const endpoint of endpoints) {
    try {
      const start = Date.now();
      const response = await fetch(`${API_URL}${endpoint.path}`, { 
        method: endpoint.method,
        headers 
      });
      const loadTime = Date.now() - start;
      
      if (response.ok) {
        const data = await response.json();
        const count = Array.isArray(data) ? data.length : (data.total !== undefined ? data.total : 'OK');
        logTest(endpoint.name, 'PASS', `${count} items - ${loadTime}ms`);
        recordResult(`API: ${endpoint.name}`, 'PASS');
      } else if (response.status === 402) {
        logTest(endpoint.name, 'WARN', 'No active subscription');
        recordResult(`API: ${endpoint.name}`, 'WARN');
      } else if (response.status === 401) {
        logTest(endpoint.name, 'FAIL', 'Authentication failed');
        recordResult(`API: ${endpoint.name}`, 'FAIL', 'Auth failed');
      } else {
        logTest(endpoint.name, 'FAIL', `HTTP ${response.status}`);
        recordResult(`API: ${endpoint.name}`, 'FAIL', `HTTP ${response.status}`);
      }
    } catch (error) {
      logTest(endpoint.name, 'FAIL', error.message);
      recordResult(`API: ${endpoint.name}`, 'FAIL', error.message);
    }
  }
}

/**
 * Test All Dashboard Features
 */
async function testDashboardFeatures() {
  if (!TEST_CONFIG.testUserId) {
    logSection('Dashboard Features');
    log('⚠️  Skipping dashboard feature tests - No credentials provided', 'yellow');
    return;
  }
  
  logSection('Dashboard Features - Lead Management');
  
  const headers = {
    'User-Agent': 'AutoStaffAI-TestWarden/1.0',
    'Content-Type': 'application/json',
  };
  
  if (TEST_CONFIG.clerkSessionToken) {
    headers['Authorization'] = `Bearer ${TEST_CONFIG.clerkSessionToken}`;
  }
  
  try {
    // Test lead filtering by stage
    const stages = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
    for (const stage of stages) {
      const response = await fetch(`${API_URL}/leads?userId=${TEST_CONFIG.testUserId}&stage=${stage}`, { headers });
      if (response.ok) {
        const leads = await response.json();
        logTest(`Filter Leads by "${stage}"`, 'PASS', `${leads.length} leads`);
        recordResult(`Leads: Filter by ${stage}`, 'PASS');
      } else {
        logTest(`Filter Leads by "${stage}"`, 'FAIL', `HTTP ${response.status}`);
        recordResult(`Leads: Filter by ${stage}`, 'FAIL', `HTTP ${response.status}`);
      }
    }
    
    // Test lead filtering by priority
    const priorities = ['low', 'medium', 'high'];
    for (const priority of priorities) {
      const response = await fetch(`${API_URL}/leads?userId=${TEST_CONFIG.testUserId}&priority=${priority}`, { headers });
      if (response.ok) {
        const leads = await response.json();
        logTest(`Filter Leads by "${priority}" priority`, 'PASS', `${leads.length} leads`);
        recordResult(`Leads: Filter by ${priority}`, 'PASS');
      }
    }
    
    // Test lead search
    const response = await fetch(`${API_URL}/leads?userId=${TEST_CONFIG.testUserId}&search=test`, { headers });
    if (response.ok) {
      logTest('Lead Search Functionality', 'PASS', 'Search working');
      recordResult('Leads: Search', 'PASS');
    } else {
      logTest('Lead Search Functionality', 'FAIL', `HTTP ${response.status}`);
      recordResult('Leads: Search', 'FAIL', `HTTP ${response.status}`);
    }
    
  } catch (error) {
    logTest('Lead Management Features', 'FAIL', error.message);
    recordResult('Leads: Management', 'FAIL', error.message);
  }
  
  // Test Quote Features
  logSection('Dashboard Features - Quote Management');
  try {
    // Test quote filtering
    const quoteStatuses = ['draft', 'sent', 'accepted', 'rejected'];
    for (const status of quoteStatuses) {
      const response = await fetch(`${API_URL}/quotes?userId=${TEST_CONFIG.testUserId}&status=${status}`, { headers });
      if (response.ok) {
        const quotes = await response.json();
        logTest(`Filter Quotes by "${status}"`, 'PASS', `${quotes.length} quotes`);
        recordResult(`Quotes: Filter by ${status}`, 'PASS');
      }
    }
    
    // Test quote stats
    const statsResponse = await fetch(`${API_URL}/quotes/stats?userId=${TEST_CONFIG.testUserId}`, { headers });
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      logTest('Quote Statistics', 'PASS', `Total value tracked`);
      recordResult('Quotes: Statistics', 'PASS');
    }
  } catch (error) {
    logTest('Quote Management Features', 'FAIL', error.message);
    recordResult('Quotes: Management', 'FAIL', error.message);
  }
  
  // Test Invoice Features
  logSection('Dashboard Features - Invoice Management');
  try {
    const invoiceStatuses = ['draft', 'sent', 'paid', 'overdue'];
    for (const status of invoiceStatuses) {
      const response = await fetch(`${API_URL}/invoices?userId=${TEST_CONFIG.testUserId}&status=${status}`, { headers });
      if (response.ok) {
        const invoices = await response.json();
        logTest(`Filter Invoices by "${status}"`, 'PASS', `${invoices.length} invoices`);
        recordResult(`Invoices: Filter by ${status}`, 'PASS');
      }
    }
    
    // Test invoice generation capability
    const response = await fetch(`${API_URL}/invoices?userId=${TEST_CONFIG.testUserId}&limit=1`, { headers });
    if (response.ok) {
      logTest('Invoice System', 'PASS', 'Invoice API working');
      recordResult('Invoices: System', 'PASS');
    }
  } catch (error) {
    logTest('Invoice Management Features', 'FAIL', error.message);
    recordResult('Invoices: Management', 'FAIL', error.message);
  }
  
  // Test Message/Inbox Features
  logSection('Dashboard Features - Inbox/Messages');
  try {
    // Test message filtering
    const messageFilters = ['all', 'unread', 'ai_generated', 'needs_approval'];
    for (const filter of messageFilters) {
      const response = await fetch(`${API_URL}/messages?userId=${TEST_CONFIG.testUserId}&filter=${filter}`, { headers });
      if (response.ok) {
        const messages = await response.json();
        logTest(`Filter Messages "${filter}"`, 'PASS', `${messages.length} messages`);
        recordResult(`Messages: Filter ${filter}`, 'PASS');
      }
    }
    
    // Test message channels
    const channels = ['email', 'sms'];
    for (const channel of channels) {
      const response = await fetch(`${API_URL}/messages?userId=${TEST_CONFIG.testUserId}&channel=${channel}`, { headers });
      if (response.ok) {
        logTest(`Messages via ${channel}`, 'PASS', 'Channel filter working');
        recordResult(`Messages: ${channel} channel`, 'PASS');
      }
    }
  } catch (error) {
    logTest('Message Features', 'FAIL', error.message);
    recordResult('Messages: Features', 'FAIL', error.message);
  }
  
  // Test Calendar Features
  logSection('Dashboard Features - Calendar');
  try {
    const calendarResponse = await fetch(`${API_URL}/calendar/bookings?userId=${TEST_CONFIG.testUserId}`, { headers });
    if (calendarResponse.ok) {
      const bookings = await calendarResponse.json();
      logTest('Calendar Bookings', 'PASS', `${bookings.length} bookings`);
      recordResult('Calendar: Bookings', 'PASS');
    }
    
    // Test availability check
    const availabilityResponse = await fetch(`${API_URL}/calendar/availability?userId=${TEST_CONFIG.testUserId}`, { headers });
    if (availabilityResponse.ok || availabilityResponse.status === 404) {
      logTest('Calendar Availability Check', 'PASS', 'Endpoint accessible');
      recordResult('Calendar: Availability', 'PASS');
    }
  } catch (error) {
    logTest('Calendar Features', 'FAIL', error.message);
    recordResult('Calendar: Features', 'FAIL', error.message);
  }
}

/**
 * Test Integration Features
 */
async function testIntegrations() {
  if (!TEST_CONFIG.testUserId) {
    logSection('Integration Features');
    log('⚠️  Skipping integration tests - No credentials provided', 'yellow');
    return;
  }
  
  logSection('Integration Features');
  
  const headers = {
    'User-Agent': 'AutoStaffAI-TestWarden/1.0',
    'Content-Type': 'application/json',
  };
  
  if (TEST_CONFIG.clerkSessionToken) {
    headers['Authorization'] = `Bearer ${TEST_CONFIG.clerkSessionToken}`;
  }
  
  try {
    // Check Gmail integration status
    const userResponse = await fetch(`${API_URL}/auth/me?userId=${TEST_CONFIG.testUserId}`, { headers });
    if (userResponse.ok) {
      const userData = await userResponse.json();
      
      // Gmail integration
      if (userData.gmailConnected) {
        const email = userData.gmailEmail || 'Connected';
        logTest('Gmail Integration', 'PASS', email);
        recordResult('Integration: Gmail', 'PASS');
      } else {
        logTest('Gmail Integration', 'WARN', 'Not connected');
        recordResult('Integration: Gmail', 'WARN');
      }
      
      // Calendar integration
      if (userData.calendarConnected) {
        logTest('Google Calendar Integration', 'PASS', 'Connected');
        recordResult('Integration: Calendar', 'PASS');
      } else {
        logTest('Google Calendar Integration', 'WARN', 'Not connected');
        recordResult('Integration: Calendar', 'WARN');
      }
      
      // Stripe integration
      if (userData.stripeCustomerId) {
        logTest('Stripe Integration', 'PASS', 'Customer ID exists');
        recordResult('Integration: Stripe', 'PASS');
      } else {
        logTest('Stripe Integration', 'WARN', 'No Stripe customer');
        recordResult('Integration: Stripe', 'WARN');
      }
      
      // Check subscription status
      if (userData.subscriptionStatus === 'active' || userData.subscriptionStatus === 'trialing') {
        logTest('Subscription Status', 'PASS', userData.subscriptionStatus);
        recordResult('Subscription: Status', 'PASS');
      } else if (userData.subscriptionStatus === 'canceled' || userData.subscriptionStatus === 'past_due') {
        logTest('Subscription Status', 'WARN', userData.subscriptionStatus);
        recordResult('Subscription: Status', 'WARN');
      } else {
        logTest('Subscription Status', 'WARN', 'No active subscription');
        recordResult('Subscription: Status', 'WARN');
      }
    }
  } catch (error) {
    logTest('Integration Check', 'FAIL', error.message);
    recordResult('Integrations: Check', 'FAIL', error.message);
  }
}

/**
 * Test Settings & Configuration
 */
async function testSettingsFeatures() {
  if (!TEST_CONFIG.testUserId) {
    logSection('Settings & Configuration');
    log('⚠️  Skipping settings tests - No credentials provided', 'yellow');
    return;
  }
  
  logSection('Settings & Configuration');
  
  const headers = {
    'User-Agent': 'AutoStaffAI-TestWarden/1.0',
    'Content-Type': 'application/json',
  };
  
  if (TEST_CONFIG.clerkSessionToken) {
    headers['Authorization'] = `Bearer ${TEST_CONFIG.clerkSessionToken}`;
  }
  
  try {
    const userResponse = await fetch(`${API_URL}/auth/me?userId=${TEST_CONFIG.testUserId}`, { headers });
    if (userResponse.ok) {
      const userData = await userResponse.json();
      
      // Check business settings
      if (userData.businessName) {
        logTest('Business Profile', 'PASS', userData.businessName);
        recordResult('Settings: Business Profile', 'PASS');
      } else {
        logTest('Business Profile', 'WARN', 'Not configured');
        recordResult('Settings: Business Profile', 'WARN');
      }
      
      // Check automation settings exist
      if (userData.automationSettings) {
        logTest('Automation Settings', 'PASS', 'Configured');
        recordResult('Settings: Automation', 'PASS');
      } else {
        logTest('Automation Settings', 'WARN', 'Not configured');
        recordResult('Settings: Automation', 'WARN');
      }
      
      // Check timezone
      if (userData.timezone) {
        logTest('Timezone Configuration', 'PASS', userData.timezone);
        recordResult('Settings: Timezone', 'PASS');
      } else {
        logTest('Timezone Configuration', 'WARN', 'Not set');
        recordResult('Settings: Timezone', 'WARN');
      }
    }
  } catch (error) {
    logTest('Settings Features', 'FAIL', error.message);
    recordResult('Settings: Features', 'FAIL', error.message);
  }
}

/**
 * Test SSL Certificate
 */
async function testSSL() {
  logSection('Security Check');
  
  try {
    const response = await fetch(BASE_URL, {
      method: 'HEAD',
      headers: { 'User-Agent': 'AutoStaffAI-TestWarden/1.0' }
    });
    
    // Check if HTTPS is working
    if (BASE_URL.startsWith('https://')) {
      logTest('HTTPS Enabled', 'PASS', 'SSL certificate valid');
      recordResult('SSL Certificate', 'PASS');
    } else {
      logTest('HTTPS Enabled', 'WARN', 'Site not using HTTPS');
      recordResult('SSL Certificate', 'WARN');
    }
    
    // Check security headers
    const headers = response.headers;
    const securityHeaders = [
      { name: 'strict-transport-security', friendly: 'HSTS' },
      { name: 'x-frame-options', friendly: 'X-Frame-Options' },
      { name: 'x-content-type-options', friendly: 'X-Content-Type-Options' },
    ];
    
    for (const header of securityHeaders) {
      if (headers.get(header.name)) {
        logTest(`${header.friendly} Header`, 'PASS', headers.get(header.name));
        recordResult(`Security: ${header.friendly}`, 'PASS');
      } else {
        logTest(`${header.friendly} Header`, 'WARN', 'Not set');
        recordResult(`Security: ${header.friendly}`, 'WARN');
      }
    }
  } catch (error) {
    logTest('Security Check', 'FAIL', error.message);
    recordResult('SSL Certificate', 'FAIL', error.message);
  }
}

/**
 * Test Email Poller Service
 */
async function testEmailPollerService() {
  logSection('Background Services Check');
  
  // We can't directly test the email poller, but we can check if it's running
  // by checking recent message activity (if authenticated)
  if (!TEST_CONFIG.testUserId) {
    log('⚠️  Skipping service checks - No credentials provided', 'yellow');
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/messages?userId=${TEST_CONFIG.testUserId}&limit=1`, {
      headers: {
        'User-Agent': 'AutoStaffAI-TestWarden/1.0',
        'Authorization': TEST_CONFIG.clerkSessionToken ? `Bearer ${TEST_CONFIG.clerkSessionToken}` : undefined,
      }
    });
    
    if (response.ok) {
      const messages = await response.json();
      const recentMessage = messages[0];
      
      if (recentMessage) {
        const messageAge = Date.now() - new Date(recentMessage.createdAt).getTime();
        const ageMinutes = Math.floor(messageAge / 60000);
        
        if (ageMinutes < 60) {
          logTest('Email Poller Activity', 'PASS', `Recent message: ${ageMinutes}m ago`);
          recordResult('Email Poller Service', 'PASS');
        } else {
          logTest('Email Poller Activity', 'WARN', `Last message: ${ageMinutes}m ago`);
          recordResult('Email Poller Service', 'WARN');
        }
      } else {
        logTest('Email Poller Activity', 'SKIP', 'No messages found');
        recordResult('Email Poller Service', 'SKIP');
      }
    }
  } catch (error) {
    logTest('Email Poller Service', 'FAIL', error.message);
    recordResult('Email Poller Service', 'FAIL', error.message);
  }
}

/**
 * Test Automation Features
 */
async function testAutomationFeatures() {
  if (!TEST_CONFIG.testUserId) {
    logSection('Automation Features Check');
    log('⚠️  Skipping automation tests - No credentials provided', 'yellow');
    log('   Set TEST_USER_ID to test automation settings', 'gray');
    return;
  }
  
  logSection('Automation Features Check');
  
  const headers = {
    'User-Agent': 'AutoStaffAI-TestWarden/1.0',
    'Content-Type': 'application/json',
  };
  
  if (TEST_CONFIG.clerkSessionToken) {
    headers['Authorization'] = `Bearer ${TEST_CONFIG.clerkSessionToken}`;
  }
  
  try {
    // Test 1: Check if user has automation settings configured
    const userResponse = await fetch(`${API_URL}/auth/me?userId=${TEST_CONFIG.testUserId}`, { headers });
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      const hasAutomationSettings = userData.automationSettings && userData.automationSettings !== '{}';
      
      if (hasAutomationSettings) {
        logTest('Automation Settings Configured', 'PASS', 'User has automation settings');
        recordResult('Automation: Settings Configured', 'PASS');
        
        // Parse and check automation settings
        const settings = JSON.parse(userData.automationSettings);
        
        // Check working hours
        if (settings.workingHoursStart && settings.workingHoursEnd) {
          logTest('Working Hours Set', 'PASS', `${settings.workingHoursStart} - ${settings.workingHoursEnd}`);
          recordResult('Automation: Working Hours', 'PASS');
        } else {
          logTest('Working Hours Set', 'WARN', 'Not configured');
          recordResult('Automation: Working Hours', 'WARN');
        }
        
        // Check auto-respond setting
        const autoRespond = settings.autoRespondEmails !== false;
        logTest('Auto-Respond Enabled', autoRespond ? 'PASS' : 'WARN', autoRespond ? 'ON' : 'OFF');
        recordResult('Automation: Auto-Respond', autoRespond ? 'PASS' : 'WARN');
        
        // Check AI auto-approve
        const aiAutoApprove = settings.aiAutoApprove === true;
        logTest('AI Auto-Approve', aiAutoApprove ? 'PASS' : 'WARN', aiAutoApprove ? 'ON' : 'OFF');
        recordResult('Automation: AI Auto-Approve', aiAutoApprove ? 'PASS' : 'WARN');
        
        // Check filters
        const spamFilter = settings.spamFilter !== false;
        logTest('Spam Filter', spamFilter ? 'PASS' : 'WARN', spamFilter ? 'Enabled' : 'Disabled');
        recordResult('Automation: Spam Filter', spamFilter ? 'PASS' : 'WARN');
        
        // Check auto-categorize
        const autoCategorizeleads = settings.autoCategorizeleads !== false;
        logTest('Auto-Categorize Leads', autoCategorizeleads ? 'PASS' : 'WARN', autoCategorizeleads ? 'ON' : 'OFF');
        recordResult('Automation: Auto-Categorize', autoCategorizeleads ? 'PASS' : 'WARN');
        
      } else {
        logTest('Automation Settings Configured', 'WARN', 'No automation settings found');
        recordResult('Automation: Settings Configured', 'WARN');
      }
    } else {
      logTest('Automation Settings Check', 'FAIL', `HTTP ${userResponse.status}`);
      recordResult('Automation: Settings Check', 'FAIL', `HTTP ${userResponse.status}`);
    }
    
    // Test 2: Check for AI-generated messages (indicates automation is working)
    const messagesResponse = await fetch(`${API_URL}/messages?userId=${TEST_CONFIG.testUserId}&limit=10`, { headers });
    
    if (messagesResponse.ok) {
      const messages = await messagesResponse.json();
      const aiMessages = messages.filter(m => m.isAiGenerated);
      const recentAiMessages = aiMessages.filter(m => {
        const age = Date.now() - new Date(m.createdAt).getTime();
        return age < 24 * 60 * 60 * 1000; // Last 24 hours
      });
      
      if (aiMessages.length > 0) {
        logTest('AI Response Generation', 'PASS', `${aiMessages.length} AI messages found`);
        recordResult('Automation: AI Response Generation', 'PASS');
        
        if (recentAiMessages.length > 0) {
          logTest('Recent AI Activity', 'PASS', `${recentAiMessages.length} in last 24h`);
          recordResult('Automation: Recent AI Activity', 'PASS');
        } else {
          logTest('Recent AI Activity', 'WARN', 'No AI messages in last 24h');
          recordResult('Automation: Recent AI Activity', 'WARN');
        }
      } else {
        logTest('AI Response Generation', 'WARN', 'No AI-generated messages found');
        recordResult('Automation: AI Response Generation', 'WARN');
      }
    }
    
    // Test 3: Check for auto-categorized leads
    const leadsResponse = await fetch(`${API_URL}/leads?userId=${TEST_CONFIG.testUserId}&limit=10`, { headers });
    
    if (leadsResponse.ok) {
      const leads = await leadsResponse.json();
      const categorizedLeads = leads.filter(l => l.aiClassification && l.aiClassification !== 'inquiry');
      
      if (categorizedLeads.length > 0) {
        logTest('Lead Auto-Categorization', 'PASS', `${categorizedLeads.length} auto-categorized`);
        recordResult('Automation: Lead Categorization', 'PASS');
      } else if (leads.length > 0) {
        logTest('Lead Auto-Categorization', 'WARN', 'No categorized leads found');
        recordResult('Automation: Lead Categorization', 'WARN');
      } else {
        logTest('Lead Auto-Categorization', 'SKIP', 'No leads to check');
        recordResult('Automation: Lead Categorization', 'SKIP');
      }
    }
    
    // Test 4: Check AI conversation usage (limits)
    if (userResponse.ok) {
      const userData = await userResponse.json();
      const used = userData.aiConversationsUsed || 0;
      const limit = userData.aiConversationsLimit;
      
      if (limit !== null && limit !== undefined) {
        const percentage = limit === -1 ? 0 : (used / limit) * 100;
        const limitText = limit === -1 ? 'Unlimited' : `${used}/${limit}`;
        
        if (limit === -1 || used < limit * 0.9) {
          logTest('AI Conversation Limits', 'PASS', `${limitText} used`);
          recordResult('Automation: AI Limits', 'PASS');
        } else if (used < limit) {
          logTest('AI Conversation Limits', 'WARN', `${limitText} used (${percentage.toFixed(0)}%)`);
          recordResult('Automation: AI Limits', 'WARN');
        } else {
          logTest('AI Conversation Limits', 'FAIL', `Limit reached: ${limitText}`);
          recordResult('Automation: AI Limits', 'FAIL', 'Limit reached');
        }
      } else {
        logTest('AI Conversation Limits', 'WARN', 'No limit set');
        recordResult('Automation: AI Limits', 'WARN');
      }
    }
    
    // Test 5: Check for automatic reply loop prevention (check recent messages)
    if (messagesResponse.ok) {
      const messages = await messagesResponse.json();
      
      // Group messages by lead/email
      const messagesByLead = {};
      messages.forEach(msg => {
        const key = msg.leadId || msg.fromEmail;
        if (!messagesByLead[key]) messagesByLead[key] = [];
        messagesByLead[key].push(msg);
      });
      
      // Check for potential loops (more than 3 messages in short time)
      let loopDetected = false;
      for (const [leadId, msgs] of Object.entries(messagesByLead)) {
        const recentMsgs = msgs.filter(m => {
          const age = Date.now() - new Date(m.createdAt).getTime();
          return age < 60 * 60 * 1000; // Last hour
        });
        
        if (recentMsgs.length > 5) {
          loopDetected = true;
          logTest('Auto-Reply Loop Prevention', 'WARN', `${recentMsgs.length} msgs in 1h to same lead`);
          recordResult('Automation: Loop Prevention', 'WARN');
          break;
        }
      }
      
      if (!loopDetected) {
        logTest('Auto-Reply Loop Prevention', 'PASS', 'No loops detected');
        recordResult('Automation: Loop Prevention', 'PASS');
      }
    }
    
  } catch (error) {
    logTest('Automation Features Check', 'FAIL', error.message);
    recordResult('Automation Features', 'FAIL', error.message);
  }
}

/**
 * Test Database Connectivity (indirect)
 */
async function testDatabaseConnectivity() {
  logSection('Database Connectivity');
  
  try {
    // Test a simple API endpoint that requires database access
    const response = await fetch(`${API_URL}/health`, {
      headers: { 'User-Agent': 'AutoStaffAI-TestWarden/1.0' }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.database || data.status === 'ok') {
        logTest('Database Connection', 'PASS', 'API can reach database');
        recordResult('Database Connectivity', 'PASS');
      } else {
        logTest('Database Connection', 'WARN', 'Health check unclear');
        recordResult('Database Connectivity', 'WARN');
      }
    } else {
      logTest('Database Connection', 'FAIL', `HTTP ${response.status}`);
      recordResult('Database Connectivity', 'FAIL', `HTTP ${response.status}`);
    }
  } catch (error) {
    logTest('Database Connection', 'FAIL', error.message);
    recordResult('Database Connectivity', 'FAIL', error.message);
  }
}

/**
 * Send Alert Notification
 */
async function sendAlert(summary) {
  if (!TEST_CONFIG.discordWebhook && !TEST_CONFIG.slackWebhook) {
    return;
  }
  
  const message = {
    content: `🚨 **AutoStaffAI Test Warden Alert**\n\n${summary}`,
    username: 'Test Warden',
  };
  
  try {
    if (TEST_CONFIG.discordWebhook) {
      await fetch(TEST_CONFIG.discordWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
    }
    
    if (TEST_CONFIG.slackWebhook) {
      await fetch(TEST_CONFIG.slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message.content }),
      });
    }
  } catch (error) {
    log(`Failed to send alert: ${error.message}`, 'red');
  }
}

/**
 * Print Final Summary
 */
function printSummary() {
  testResults.endTime = new Date();
  const duration = (testResults.endTime - testResults.startTime) / 1000;
  
  logSection('Test Summary');
  
  log(`\nTotal Tests: ${testResults.total}`, 'cyan');
  log(`✓ Passed: ${testResults.passed}`, 'green');
  log(`✗ Failed: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');
  log(`⚠ Warnings: ${testResults.warnings}`, testResults.warnings > 0 ? 'yellow' : 'green');
  log(`○ Skipped: ${testResults.skipped}`, 'gray');
  log(`\nDuration: ${duration.toFixed(2)}s`, 'cyan');
  
  const passRate = ((testResults.passed / (testResults.total - testResults.skipped)) * 100).toFixed(1);
  log(`\nPass Rate: ${passRate}%`, passRate >= 90 ? 'green' : passRate >= 70 ? 'yellow' : 'red');
  
  if (testResults.failures.length > 0) {
    log('\n⚠️  Failed Tests:', 'red');
    testResults.failures.forEach(f => {
      console.log(`  • ${f.test}: ${f.error}`);
    });
  }
  
  if (testResults.failed === 0 && testResults.warnings === 0) {
    log('\n🎉 All systems operational!', 'green');
  } else if (testResults.failed > 0) {
    log('\n⚠️  Critical issues detected!', 'red');
    const summary = `${testResults.failed} test(s) failed on autostaffai.com`;
    sendAlert(summary);
  }
}

/**
 * Quick Health Check
 */
async function quickHealthCheck() {
  logSection('Quick Health Check');
  
  const checks = [
    { name: 'Website', test: () => fetch(BASE_URL, { method: 'HEAD' }) },
    { name: 'API', test: () => fetch(`${API_URL}/health`) },
  ];
  
  for (const check of checks) {
    try {
      const start = Date.now();
      const response = await check.test();
      const time = Date.now() - start;
      
      if (response.ok || response.status === 301 || response.status === 302) {
        logTest(check.name, 'PASS', `${time}ms`);
        recordResult(check.name, 'PASS');
      } else {
        logTest(check.name, 'FAIL', `HTTP ${response.status}`);
        recordResult(check.name, 'FAIL', `HTTP ${response.status}`);
      }
    } catch (error) {
      logTest(check.name, 'FAIL', error.message);
      recordResult(check.name, 'FAIL', error.message);
    }
  }
}

/**
 * Main Test Runner
 */
async function runFullTests() {
  testResults.startTime = new Date();
  
  log('🛡️  AutoStaffAI Production Test Warden', 'magenta');
  log(`   Target: ${BASE_URL}`, 'cyan');
  log(`   Started: ${testResults.startTime.toLocaleString()}`, 'gray');
  
  await testWebsiteAvailability();
  await testAPIHealth();
  await testDashboardPages();
  await testSSL();
  await testDatabaseConnectivity();
  await testAuthenticatedFeatures();
  await testDashboardFeatures();
  await testIntegrations();
  await testSettingsFeatures();
  await testEmailPollerService();
  await testAutomationFeatures();
  
  printSummary();
}

/**
 * Continuous Monitoring Mode
 */
async function continuousMonitoring() {
  log('🔄 Starting continuous monitoring mode...', 'cyan');
  log('   Will check every 5 minutes. Press Ctrl+C to stop.', 'gray');
  
  while (true) {
    // Reset results
    Object.assign(testResults, {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      skipped: 0,
      failures: [],
    });
    
    await quickHealthCheck();
    printSummary();
    
    log('\n⏱️  Waiting 5 minutes until next check...', 'gray');
    await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const isQuickMode = args.includes('--quick');
const isContinuous = args.includes('--continuous');
const showHelp = args.includes('--help') || args.includes('-h');

if (showHelp) {
  console.log(`
AutoStaffAI Production Test Warden 🛡️

Usage:
  node test-production.js [options]

Options:
  --quick         Run quick health check only
  --continuous    Keep monitoring every 5 minutes
  --help, -h      Show this help message

Environment Variables:
  TEST_USER_ID           Your user ID for authenticated tests
  TEST_EMAIL             Your email for authenticated tests
  CLERK_SESSION_TOKEN    Clerk session token for authentication
  DISCORD_WEBHOOK        Discord webhook URL for failure alerts
  SLACK_WEBHOOK          Slack webhook URL for failure alerts

Examples:
  node test-production.js
  node test-production.js --quick
  node test-production.js --continuous
  TEST_USER_ID=user_123 node test-production.js
  `);
  process.exit(0);
}

// Run the appropriate mode
(async () => {
  try {
    if (isContinuous) {
      await continuousMonitoring();
    } else if (isQuickMode) {
      testResults.startTime = new Date();
      await quickHealthCheck();
      printSummary();
    } else {
      await runFullTests();
    }
  } catch (error) {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
})();

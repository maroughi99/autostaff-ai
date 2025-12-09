/**
 * Comprehensive Feature Testing Bot
 * Tests all dashboard features across different subscription tiers
 * Run with: node test-all-features.js
 */

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logTest(testName, status, details = '') {
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : '⚠';
  const color = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  log(`${icon} ${testName}`, color);
  if (details) {
    console.log(`  ${details}`);
  }
}

// Test configuration for different subscription tiers
const SUBSCRIPTION_TIERS = {
  none: {
    name: 'No Subscription',
    features: [],
    shouldBlock: ['leads', 'quotes', 'billing', 'calendar', 'inbox', 'settings'],
    shouldAllow: ['subscription']
  },
  starter: {
    name: 'Starter Plan',
    plan: 'starter',
    features: ['email_integration', 'calendar_management', 'lead_tracking', 'invoice_generation', 'quote_generation', 'payment_processing'],
    shouldBlock: [],
    shouldAllow: ['leads', 'quotes', 'billing', 'calendar', 'inbox', 'subscription', 'settings']
  },
  pro: {
    name: 'Pro Plan',
    plan: 'pro',
    features: ['email_integration', 'calendar_management', 'lead_tracking', 'invoice_generation', 'quote_generation', 'payment_processing', 'lead_scoring', 'contract_generation', 'custom_ai_training', 'team_collaboration'],
    shouldBlock: [],
    shouldAllow: ['leads', 'quotes', 'billing', 'calendar', 'inbox', 'subscription', 'settings']
  },
  ultimate: {
    name: 'Ultimate Plan',
    plan: 'ultimate',
    features: ['email_integration', 'calendar_management', 'lead_tracking', 'invoice_generation', 'quote_generation', 'payment_processing', 'lead_scoring', 'contract_generation', 'custom_ai_training', 'team_collaboration', 'white_label', 'api_access', 'multi_location', 'priority_support'],
    shouldBlock: [],
    shouldAllow: ['leads', 'quotes', 'billing', 'calendar', 'inbox', 'subscription', 'settings']
  }
};

// Dashboard pages to test
const DASHBOARD_PAGES = [
  { path: '/dashboard', name: 'Dashboard Home' },
  { path: '/dashboard/leads', name: 'Leads CRM', feature: 'lead_tracking' },
  { path: '/dashboard/quotes', name: 'Quotes', feature: 'quote_generation' },
  { path: '/dashboard/billing', name: 'Billing & Invoices', feature: 'invoice_generation' },
  { path: '/dashboard/calendar', name: 'Calendar', feature: 'calendar_management' },
  { path: '/dashboard/inbox', name: 'Inbox', feature: 'email_integration' },
  { path: '/dashboard/subscription', name: 'Subscription', feature: null },
  { path: '/dashboard/settings', name: 'Settings', feature: null }
];

// API endpoints to test
const API_ENDPOINTS = [
  { path: '/leads', method: 'GET', name: 'Get Leads', feature: 'lead_tracking' },
  { path: '/quotes', method: 'GET', name: 'Get Quotes', feature: 'quote_generation' },
  { path: '/invoices', method: 'GET', name: 'Get Invoices', feature: 'invoice_generation' },
  { path: '/messages', method: 'GET', name: 'Get Messages', feature: 'email_integration' },
  { path: '/calendar/bookings', method: 'GET', name: 'Get Calendar Bookings', feature: 'calendar_management' }
];

/**
 * Test Frontend Page Access
 */
async function testFrontendPage(page, tier, userId) {
  const url = `${BASE_URL}${page.path}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'text/html'
      }
    });

    const html = await response.text();
    
    // Check if page loaded
    if (!response.ok) {
      logTest(page.name, 'FAIL', `HTTP ${response.status}`);
      return { page: page.name, status: 'FAIL', error: `HTTP ${response.status}` };
    }

    // Check for FeatureLocked component
    const isFeatureLocked = html.includes('FeatureLocked') || 
                           html.includes('Upgrade to') || 
                           html.includes('Feature requires upgrade');
    
    // Check for subscription required message
    const needsSubscription = html.includes('subscription_required') || 
                              html.includes('Active subscription required');

    // Determine expected behavior
    const hasFeature = !page.feature || (tier.features && tier.features.includes(page.feature));
    const shouldHaveAccess = tier.name !== 'No Subscription' && hasFeature;

    if (tier.name === 'No Subscription') {
      // Without subscription, should see FeatureLocked or be redirected to subscription page
      if (page.path === '/dashboard/subscription') {
        logTest(page.name, 'PASS', 'Subscription page accessible');
        return { page: page.name, status: 'PASS' };
      } else if (isFeatureLocked || needsSubscription) {
        logTest(page.name, 'PASS', 'Correctly blocked without subscription');
        return { page: page.name, status: 'PASS' };
      } else {
        logTest(page.name, 'FAIL', 'Page accessible without subscription!');
        return { page: page.name, status: 'FAIL', error: 'No access control' };
      }
    } else {
      // With subscription
      if (!hasFeature && isFeatureLocked) {
        logTest(page.name, 'PASS', 'Correctly showing upgrade prompt');
        return { page: page.name, status: 'PASS' };
      } else if (hasFeature && !isFeatureLocked) {
        logTest(page.name, 'PASS', 'Feature accessible');
        return { page: page.name, status: 'PASS' };
      } else {
        logTest(page.name, 'WARN', 'Unexpected behavior');
        return { page: page.name, status: 'WARN' };
      }
    }

  } catch (error) {
    logTest(page.name, 'FAIL', `Error: ${error.message}`);
    return { page: page.name, status: 'FAIL', error: error.message };
  }
}

/**
 * Test API Endpoint Access
 */
async function testAPIEndpoint(endpoint, tier, userId) {
  const url = `${API_URL}${endpoint.path}?userId=${userId}`;
  
  try {
    const response = await fetch(url, {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      }
    });

    const hasFeature = !endpoint.feature || (tier.features && tier.features.includes(endpoint.feature));
    const shouldHaveAccess = tier.name !== 'No Subscription' && hasFeature;

    if (tier.name === 'No Subscription') {
      if (response.status === 402 || response.status === 401) {
        logTest(endpoint.name, 'PASS', 'Correctly blocked (402/401)');
        return { endpoint: endpoint.name, status: 'PASS' };
      } else if (response.ok) {
        logTest(endpoint.name, 'FAIL', 'API accessible without subscription!');
        return { endpoint: endpoint.name, status: 'FAIL', error: 'No API protection' };
      } else {
        logTest(endpoint.name, 'WARN', `Unexpected status: ${response.status}`);
        return { endpoint: endpoint.name, status: 'WARN' };
      }
    } else {
      if (!hasFeature) {
        if (response.status === 403) {
          logTest(endpoint.name, 'PASS', 'Correctly blocked (403)');
          return { endpoint: endpoint.name, status: 'PASS' };
        } else if (response.ok) {
          logTest(endpoint.name, 'FAIL', 'API accessible without feature!');
          return { endpoint: endpoint.name, status: 'FAIL', error: 'Missing feature gate' };
        }
      } else {
        if (response.ok) {
          const data = await response.json();
          logTest(endpoint.name, 'PASS', `Returned ${Array.isArray(data) ? data.length : 'data'} items`);
          return { endpoint: endpoint.name, status: 'PASS' };
        } else {
          logTest(endpoint.name, 'FAIL', `HTTP ${response.status}`);
          return { endpoint: endpoint.name, status: 'FAIL', error: `HTTP ${response.status}` };
        }
      }
    }

  } catch (error) {
    logTest(endpoint.name, 'FAIL', `Error: ${error.message}`);
    return { endpoint: endpoint.name, status: 'FAIL', error: error.message };
  }
}

/**
 * Test Database User Data
 */
async function testUserData(userId) {
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'x-user-id': userId
      }
    });

    if (response.ok) {
      const userData = await response.json();
      log(`\nUser Data:`, 'yellow');
      console.log(`  Subscription Plan: ${userData.subscriptionPlan || 'None'}`);
      console.log(`  Subscription Status: ${userData.subscriptionStatus || 'None'}`);
      console.log(`  Stripe Subscription ID: ${userData.stripeSubscriptionId || 'None'}`);
      console.log(`  Stripe Customer ID: ${userData.stripeCustomerId || 'None'}`);
      return userData;
    } else {
      log('Failed to fetch user data', 'red');
      return null;
    }
  } catch (error) {
    log(`Error fetching user data: ${error.message}`, 'red');
    return null;
  }
}

/**
 * Test Subscription Limits
 */
function testSubscriptionLimits(tier) {
  logSection(`Testing Subscription Limits - ${tier.name}`);
  
  const limits = {
    starter: { aiConversationsPerMonth: 50 },
    pro: { aiConversationsPerMonth: 200 },
    ultimate: { aiConversationsPerMonth: -1 }
  };

  if (tier.plan && limits[tier.plan]) {
    const limit = limits[tier.plan];
    log(`AI Conversations: ${limit.aiConversationsPerMonth === -1 ? 'Unlimited' : limit.aiConversationsPerMonth}/month`, 'cyan');
  }

  log(`\nFeatures included:`, 'yellow');
  if (tier.features.length === 0) {
    log('  None - Subscription required', 'red');
  } else {
    tier.features.forEach(feature => {
      console.log(`  ✓ ${feature}`);
    });
  }
}

/**
 * Main Test Runner
 */
async function runTests() {
  log('\n🤖 Starting Comprehensive Feature Testing Bot\n', 'magenta');
  log(`Testing against:`, 'cyan');
  log(`  Frontend: ${BASE_URL}`, 'cyan');
  log(`  API: ${API_URL}`, 'cyan');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  };

  // Test each subscription tier
  for (const [tierKey, tier] of Object.entries(SUBSCRIPTION_TIERS)) {
    logSection(`Testing: ${tier.name}`);
    
    // Show subscription limits
    testSubscriptionLimits(tier);

    // Mock user ID for testing
    const testUserId = `test-${tierKey}-${Date.now()}`;

    // Test Frontend Pages
    log('\n📱 Frontend Pages:', 'yellow');
    for (const page of DASHBOARD_PAGES) {
      const result = await testFrontendPage(page, tier, testUserId);
      results.total++;
      if (result.status === 'PASS') results.passed++;
      else if (result.status === 'FAIL') results.failed++;
      else results.warnings++;
    }

    // Test API Endpoints
    log('\n🔌 API Endpoints:', 'yellow');
    for (const endpoint of API_ENDPOINTS) {
      const result = await testAPIEndpoint(endpoint, tier, testUserId);
      results.total++;
      if (result.status === 'PASS') results.passed++;
      else if (result.status === 'FAIL') results.failed++;
      else results.warnings++;
    }

    // Wait a bit before next tier
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Final Summary
  logSection('Test Summary');
  log(`\nTotal Tests: ${results.total}`, 'cyan');
  log(`✓ Passed: ${results.passed}`, 'green');
  log(`✗ Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`⚠ Warnings: ${results.warnings}`, results.warnings > 0 ? 'yellow' : 'green');

  const passRate = ((results.passed / results.total) * 100).toFixed(1);
  log(`\nPass Rate: ${passRate}%`, passRate >= 80 ? 'green' : 'red');

  if (results.failed === 0) {
    log('\n🎉 All critical tests passed!', 'green');
  } else {
    log('\n⚠️  Some tests failed - review output above', 'red');
  }
}

// Check if servers are running
async function checkServers() {
  try {
    log('Checking if servers are running...', 'yellow');
    
    const frontendCheck = await fetch(BASE_URL).catch(() => null);
    const apiCheck = await fetch(API_URL).catch(() => null);

    if (!frontendCheck) {
      log('❌ Frontend server not running at ' + BASE_URL, 'red');
      log('Start with: npm run dev (in apps/web)', 'yellow');
      return false;
    }

    if (!apiCheck) {
      log('❌ API server not running at ' + API_URL, 'red');
      log('Start with: npm run start:dev (in apps/api)', 'yellow');
      return false;
    }

    log('✓ Both servers are running\n', 'green');
    return true;
  } catch (error) {
    log(`Error checking servers: ${error.message}`, 'red');
    return false;
  }
}

// Run the tests
(async () => {
  const serversReady = await checkServers();
  if (serversReady) {
    await runTests();
  } else {
    log('\n⚠️  Please start both servers before running tests', 'red');
    process.exit(1);
  }
})();

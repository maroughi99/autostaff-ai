import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <Link href="/" className="text-blue-600 hover:text-blue-800 mb-6 inline-block">
            ← Back to Home
          </Link>
          
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-gray-600 mb-8">Last updated: December 8, 2025</p>

          <div className="prose prose-slate max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="text-gray-700">
                By accessing and using WorkBot AI ("the Service"), you accept and agree to be bound by the terms 
                and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. Description of Service</h2>
              <p className="text-gray-700 mb-4">
                WorkBot AI provides an AI-powered business automation platform that includes:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Email integration and automated response generation</li>
                <li>Calendar management and booking automation</li>
                <li>Lead tracking and customer relationship management</li>
                <li>Quote and invoice generation</li>
                <li>Payment processing through Stripe</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. User Accounts</h2>
              <p className="text-gray-700 mb-4">
                To use our Service, you must:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Be at least 18 years old</li>
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized use</li>
                <li>Be responsible for all activities under your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Subscription Plans and Billing</h2>
              
              <h3 className="text-xl font-semibold mt-4 mb-2">4.1 Free Trial</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>New users receive a 7-day free trial</li>
                <li>Credit card required for trial activation but not charged during trial period</li>
                <li>Trial includes access to your selected plan's features with applicable limits</li>
                <li>Trial automatically ends after 7 days unless converted to a paid subscription</li>
              </ul>

              <h3 className="text-xl font-semibold mt-4 mb-2">4.2 Paid Subscriptions</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Subscriptions are billed monthly or annually as selected</li>
                <li>Payment is processed through Stripe</li>
                <li>Subscriptions automatically renew unless cancelled</li>
                <li>You will be charged at the beginning of each billing period</li>
                <li>Plan limits (e.g., AI conversations) reset monthly</li>
              </ul>

              <h3 className="text-xl font-semibold mt-4 mb-2">4.3 Plan Limits</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Starter Plan:</strong> 50 AI conversations per month</li>
                <li><strong>Pro Plan:</strong> 200 AI conversations per month</li>
                <li><strong>Ultimate Plan:</strong> Unlimited AI conversations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Cancellation and Refunds</h2>
              <p className="text-gray-700 mb-4">
                You may cancel your subscription at any time through your account settings or the Stripe Customer Portal:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Cancellations take effect at the end of the current billing period</li>
                <li>You will retain access to paid features until the end of your billing period</li>
                <li>No refunds are provided for partial months or unused services</li>
                <li>We reserve the right to offer refunds on a case-by-case basis</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Acceptable Use</h2>
              <p className="text-gray-700 mb-4">
                You agree not to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Use the Service for any illegal purpose</li>
                <li>Send spam or unsolicited emails through our platform</li>
                <li>Attempt to gain unauthorized access to the Service</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Use the Service to harass, abuse, or harm others</li>
                <li>Impersonate any person or entity</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Resell or redistribute the Service without permission</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Third-Party Integrations</h2>
              <p className="text-gray-700 mb-4">
                Our Service integrates with third-party services including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Google Gmail and Google Calendar</li>
                <li>Stripe for payment processing</li>
                <li>Anthropic (Claude AI) for AI capabilities</li>
              </ul>
              <p className="text-gray-700 mt-4">
                Your use of these third-party services is subject to their respective terms of service and privacy policies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. AI-Generated Content</h2>
              <p className="text-gray-700 mb-4">
                Our AI service generates email responses and business communications:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>AI-generated content should be reviewed before sending</li>
                <li>You are responsible for all communications sent through the Service</li>
                <li>We do not guarantee the accuracy or appropriateness of AI-generated content</li>
                <li>You can enable auto-approval at your own discretion and risk</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Intellectual Property</h2>
              <p className="text-gray-700 mb-4">
                The Service and its original content, features, and functionality are owned by WorkBot AI and are 
                protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
              <p className="text-gray-700">
                You retain ownership of all data you submit to the Service. By using the Service, you grant us a 
                license to use your data solely to provide and improve the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">10. Disclaimers and Limitations of Liability</h2>
              
              <h3 className="text-xl font-semibold mt-4 mb-2">10.1 Service Availability</h3>
              <p className="text-gray-700">
                The Service is provided "as is" without warranties of any kind. We do not guarantee that the Service 
                will be uninterrupted, timely, secure, or error-free.
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-2">10.2 Limitation of Liability</h3>
              <p className="text-gray-700">
                To the maximum extent permitted by law, WorkBot AI shall not be liable for any indirect, incidental, 
                special, consequential, or punitive damages, including loss of profits, data, or business opportunities.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">11. Termination</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to suspend or terminate your account:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>For violation of these Terms</li>
                <li>For fraudulent or illegal activity</li>
                <li>For non-payment of fees</li>
                <li>At our discretion for any reason with notice</li>
              </ul>
              <p className="text-gray-700 mt-4">
                Upon termination, your right to use the Service will immediately cease, and we may delete your account data.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">12. Data Backup</h2>
              <p className="text-gray-700">
                While we take reasonable measures to protect your data, you are responsible for maintaining backups 
                of any important information. We are not liable for any data loss.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">13. Modifications to Service and Terms</h2>
              <p className="text-gray-700">
                We reserve the right to modify or discontinue the Service at any time. We may also update these Terms 
                from time to time. Continued use of the Service after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">14. Governing Law</h2>
              <p className="text-gray-700">
                These Terms shall be governed by and construed in accordance with the laws of the United States, 
                without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">15. Contact Information</h2>
              <p className="text-gray-700">
                For questions about these Terms of Service, please contact us at:
              </p>
              <p className="text-gray-700 mt-2">
                Email: <a href="mailto:support@workbot-ai.com" className="text-blue-600 hover:underline">support@workbot-ai.com</a>
              </p>
            </section>

            <section className="mt-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                By using WorkBot AI, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

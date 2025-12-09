import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <Link href="/" className="text-blue-600 hover:text-blue-800 mb-6 inline-block">
            ← Back to Home
          </Link>
          
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: December 8, 2025</p>

          <div className="prose prose-slate max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Information We Collect</h2>
              <p className="text-gray-700 mb-4">
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Account information (name, email address, business name)</li>
                <li>Payment information (processed securely through Stripe)</li>
                <li>Gmail and Google Calendar data (with your explicit permission)</li>
                <li>Communication data (emails, messages, and correspondence with leads)</li>
                <li>Usage data (how you interact with our service)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Process your transactions and manage your subscription</li>
                <li>Send you technical notices, updates, and support messages</li>
                <li>Respond to your comments, questions, and customer service requests</li>
                <li>Generate AI-powered responses to your business emails</li>
                <li>Manage calendar bookings and appointments</li>
                <li>Track and manage leads for your business</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. Email and Calendar Access</h2>
              <p className="text-gray-700 mb-4">
                When you connect your Gmail and Google Calendar:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>We only access emails and calendar events necessary to provide our service</li>
                <li>We use AI to analyze emails and generate appropriate responses</li>
                <li>We do not sell or share your email data with third parties</li>
                <li>You can disconnect these services at any time from your settings</li>
                <li>We use OAuth 2.0 for secure authentication</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. AI Processing</h2>
              <p className="text-gray-700 mb-4">
                We use artificial intelligence services (Claude AI by Anthropic) to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Analyze incoming emails and classify them</li>
                <li>Generate contextual responses to customer inquiries</li>
                <li>Extract lead information from communications</li>
                <li>Assist with quote and invoice generation</li>
              </ul>
              <p className="text-gray-700 mt-4">
                Your data is processed in accordance with our AI provider's privacy policies and is not used to train their models.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Data Storage and Security</h2>
              <p className="text-gray-700 mb-4">
                We take data security seriously:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>All data is encrypted in transit using SSL/TLS</li>
                <li>Database credentials and API keys are securely stored</li>
                <li>We use industry-standard security practices</li>
                <li>Access to your data is restricted to essential personnel only</li>
                <li>Payment information is handled exclusively by Stripe (PCI compliant)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Data Sharing and Disclosure</h2>
              <p className="text-gray-700 mb-4">
                We do not sell your personal information. We may share your information only in these circumstances:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Service Providers:</strong> With trusted third parties who help us operate our service (e.g., Stripe for payments, Anthropic for AI processing)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, sale, or acquisition of all or part of our business</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Your Rights and Choices</h2>
              <p className="text-gray-700 mb-4">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Access, update, or delete your personal information</li>
                <li>Disconnect Gmail and Calendar integrations at any time</li>
                <li>Export your data</li>
                <li>Cancel your subscription and delete your account</li>
                <li>Opt out of marketing communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Data Retention</h2>
              <p className="text-gray-700">
                We retain your information for as long as your account is active or as needed to provide you services. 
                If you delete your account, we will delete your personal information within 30 days, except where we 
                are required to retain it for legal or regulatory purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Children's Privacy</h2>
              <p className="text-gray-700">
                Our service is not intended for children under 13 years of age. We do not knowingly collect 
                personal information from children under 13.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">10. International Data Transfers</h2>
              <p className="text-gray-700">
                Your information may be transferred to and processed in countries other than your country of residence. 
                These countries may have data protection laws that are different from the laws of your country.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">11. Changes to This Policy</h2>
              <p className="text-gray-700">
                We may update this privacy policy from time to time. We will notify you of any changes by posting 
                the new policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">12. Contact Us</h2>
              <p className="text-gray-700">
                If you have any questions about this Privacy Policy, please contact us at:
              </p>
              <p className="text-gray-700 mt-2">
                Email: <a href="mailto:privacy@workbot-ai.com" className="text-blue-600 hover:underline">privacy@workbot-ai.com</a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

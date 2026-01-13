import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-surface text-white">
      <Navbar />
      <div className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-headings font-bold mb-8">Privacy Policy</h1>
          <div className="prose prose-invert max-w-none text-surface-muted">
            <p className="mb-8 text-white">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <div className="space-y-12">
              <section>
                <h2 className="text-2xl font-headings font-bold text-white mb-4">1. Introduction</h2>
                <p className="leading-relaxed">
                  At ReelRelay, we value your privacy. This policy explains how we collect, use, and protect your information when you use our video automation service. 
                  Our business is built on saving you time, not selling your data.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-headings font-bold text-white mb-4">2. Information We Collect</h2>
                <p className="leading-relaxed mb-4">
                  To make ReelRelay work, we need to handle certain types of data:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Account Information:</strong> Your name, email address, and encrypted password (if applicable) to identify you.</li>
                  <li><strong>Connected Account Tokens:</strong> When you link Instagram, TikTok, or other platforms, we receive secure "tokens" (digital keys). These allow us to post on your behalf without ever seeing or storing your actual passwords.</li>
                  <li><strong>Content Data:</strong> The video files, captions, and images you upload to our "Cloud Vault."</li>
                  <li><strong>Usage Data:</strong> Information on how you use the dashboard, which helps us improve the user experience.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-headings font-bold text-white mb-4">3. How We Use Your Data</h2>
                <p className="leading-relaxed">
                  We use your information specifically to:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li><strong>Provide the Service:</strong> Process your videos, generate captions via AI, and schedule posts.</li>
                  <li><strong>Improve Features:</strong> Analyze which features are used most to guide our development.</li>
                  <li><strong>Communicate:</strong> Send you important updates about your account or scheduled posts.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-headings font-bold text-white mb-4">4. How We Secure Your Data</h2>
                <p className="leading-relaxed mb-4">
                  We treat your data with the same care we treat our own code:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Encryption:</strong> Sensitive data (like access tokens) is encrypted in our database using industry-standard protocols.</li>
                  <li><strong>Secure Storage:</strong> Your video files are stored in private, secure cloud buckets that are not accessible to the public.</li>
                  <li><strong>No Selling:</strong> We do not sell your personal data or your content to third-party advertisers.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-headings font-bold text-white mb-4">5. Third-Party Sharing</h2>
                <p className="leading-relaxed">
                  ReelRelay is a bridge to other platforms. We share data only when necessary to fulfill your request:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li><strong>Social Platforms:</strong> We transmit your video and caption to the platforms you select (e.g., YouTube, Meta, TikTok) to publish your post.</li>
                  <li><strong>Service Providers:</strong> We may use trusted third-party providers for hosting (like AWS or Cloudflare) and payments (like Stripe). They are bound by strict data protection agreements.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-headings font-bold text-white mb-4">6. Your Rights</h2>
                <p className="leading-relaxed">
                  You have the right to:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Access the personal data we hold about you.</li>
                  <li>Request deletion of your account and all associated data (including stored videos).</li>
                  <li>Disconnect your social media accounts from ReelRelay at any time.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-headings font-bold text-white mb-4">7. Changes to This Policy</h2>
                <p className="leading-relaxed">
                  We may update this privacy policy. If we make significant changes, we will notify you through the ReelRelay dashboard or via email.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-headings font-bold text-white mb-4">8. Contact Us</h2>
                <p className="leading-relaxed">
                  If you have questions about your data or these terms, please contact our support team.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

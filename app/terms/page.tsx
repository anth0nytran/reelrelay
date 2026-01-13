import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-surface text-white">
      <Navbar />
      <div className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-headings font-bold mb-8">Terms of Service</h1>
          <div className="prose prose-invert max-w-none text-surface-muted">
            <p className="mb-8 text-white">
              Last updated: {new Date().toLocaleDateString()}
            </p>
            
            <div className="space-y-12">
              <section>
                <h2 className="text-2xl font-headings font-bold text-white mb-4">1. Introduction</h2>
                <p className="leading-relaxed">
                  Welcome to ReelRelay ("we," "our," or "us"). By accessing or using our website and services, you agree to be bound by these Terms of Service. 
                  ReelRelay is a video publishing automation tool designed to help creators and businesses distribute their content across multiple social media platforms efficiently.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-headings font-bold text-white mb-4">2. How Our Service Works</h2>
                <p className="leading-relaxed mb-4">
                  ReelRelay acts as a sophisticated intermediary between your original content and social media platforms. Here is how we operate without technical jargon:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Integration:</strong> You authorize us to connect to your social media accounts (like Instagram, TikTok, YouTube) using their official secure login methods. We do not see or store your passwords.</li>
                  <li><strong>Content Vault:</strong> When you upload a video, we store it securely in our private cloud storage. This allows us to re-format and optimize the file for each specific platform's requirements.</li>
                  <li><strong>Automation:</strong> You set a schedule, and our system automatically "wakes up" at the right time to push your content to the selected platforms using their official APIs (Application Programming Interfaces).</li>
                  <li><strong>AI Assistance:</strong> Our system may use artificial intelligence to suggest captions or hashtags based on your video content. You always have the final say on what gets published.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-headings font-bold text-white mb-4">3. User Responsibilities</h2>
                <p className="leading-relaxed mb-4">
                  To keep ReelRelay safe and helpful for everyone, you agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Maintain the security of your ReelRelay account credentials.</li>
                  <li>Only upload content that you own or have the right to use.</li>
                  <li>Ensure your content complies with the Terms of Service of the platforms you publish to (e.g., no banned content on TikTok or Instagram).</li>
                  <li>Not use our service for spam, harassment, or illegal activities.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-headings font-bold text-white mb-4">4. Intellectual Property</h2>
                <p className="leading-relaxed">
                  <strong>Your Content:</strong> You retain 100% ownership of the videos and text you upload. You grant ReelRelay a limited license specifically to host, process, and publish this content to your connected accounts as directed by you. We do not sell your content to third parties.
                  <br /><br />
                  <strong>Our Platform:</strong> The ReelRelay interface, code, graphics, and "Smart Queue" technology are owned by us and protected by copyright laws.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-headings font-bold text-white mb-4">5. Subscriptions and Payments</h2>
                <p className="leading-relaxed">
                  We offer subscription plans (monthly and annual). Payment is processed securely via our payment provider. 
                  You may cancel your subscription at any time; your access will continue until the end of your current billing period. Refunds are handled on a case-by-case basis or as required by law.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-headings font-bold text-white mb-4">6. Platform Dependence & Liability</h2>
                <p className="leading-relaxed">
                  ReelRelay relies on third-party platforms (Instagram, TikTok, LinkedIn, etc.) to publish your content. 
                  We cannot guarantee that these platforms will always be available or that they will not change their rules. 
                  We are not responsible for any actions taken by these platforms against your accounts (e.g., shadowbans, suspensions) resulting from your content or posting frequency.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-headings font-bold text-white mb-4">7. Termination</h2>
                <p className="leading-relaxed">
                  We reserve the right to suspend or terminate your access to ReelRelay if you violate these terms or if your usage significantly harms our system's performance or reputation.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-headings font-bold text-white mb-4">8. Changes to Terms</h2>
                <p className="leading-relaxed">
                  We may update these terms as our service evolves. We will notify you of significant changes via email or a notification within the dashboard.
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

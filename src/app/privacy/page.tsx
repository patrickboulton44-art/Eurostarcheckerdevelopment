export default function Privacy() {
  return (
    <main className="min-h-screen px-6 sm:px-12 py-16 max-w-2xl">
      <a href="/" className="text-white/40 text-sm hover:text-white/60 transition-colors mb-8 inline-block">
        &larr; Back
      </a>

      <h1 className="text-4xl font-bold text-white uppercase tracking-tight mb-8">
        Privacy Policy
      </h1>

      <div className="space-y-6 text-white/70 text-sm leading-relaxed">
        <p className="text-white/40 text-xs">Last updated: 29 March 2026</p>

        <section>
          <h2 className="text-white font-semibold text-base mb-2">Who we are</h2>
          <p>
            Eurosnap (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is an independent
            availability monitoring service. We are not affiliated with, endorsed by, or connected to
            Eurostar International Limited in any way.
          </p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-2">What data we collect</h2>
          <p>When you create an account or sign up for alerts, we collect:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong className="text-white/90">Email address</strong> &mdash; to authenticate your account and send availability notifications</li>
            <li><strong className="text-white/90">Name</strong> &mdash; if provided during registration or via Google sign-in (optional)</li>
            <li><strong className="text-white/90">Google account ID</strong> &mdash; if you sign in with Google, to link your account</li>
            <li><strong className="text-white/90">Password</strong> &mdash; if you create an account with email and password (stored securely hashed, never in plain text)</li>
            <li><strong className="text-white/90">Route preference</strong> &mdash; your selected origin and destination</li>
            <li><strong className="text-white/90">Date range</strong> &mdash; the travel dates you want to monitor</li>
            <li><strong className="text-white/90">Weekday preferences</strong> &mdash; which days of the week you prefer (Pro plan only)</li>
            <li><strong className="text-white/90">Passenger count</strong> &mdash; number of travellers</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-2">Payments</h2>
          <p>
            If you subscribe to the Pro plan, payment is processed entirely by Stripe. We do not
            store your card number, bank details, or any payment credentials on our servers. We only
            store a Stripe customer ID and subscription ID to manage your account tier.
          </p>
          <p className="mt-2">
            Stripe&rsquo;s privacy policy applies to all payment data:{" "}
            <a href="https://stripe.com/privacy" className="text-white underline" target="_blank" rel="noopener noreferrer">
              stripe.com/privacy
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-2">How we use your data</h2>
          <p>Your data is used to:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Authenticate and manage your account</li>
            <li>Check Eurostar Snap availability for your selected routes and dates</li>
            <li>Send you email alerts when matching dates become available</li>
            <li>Send you a confirmation email when you set up an alert</li>
            <li>Manage your subscription tier (Free or Pro)</li>
          </ul>
          <p className="mt-2">We do not sell, share, or transfer your personal data to any third parties for marketing purposes.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-2">Third-party services</h2>
          <p>We use the following services to operate:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong className="text-white/90">Google</strong> &mdash; OAuth authentication (if you choose to sign in with Google)</li>
            <li><strong className="text-white/90">Stripe</strong> &mdash; payment processing for Pro subscriptions</li>
            <li><strong className="text-white/90">Brevo</strong> &mdash; email delivery (your email address is shared with Brevo to send notifications)</li>
            <li><strong className="text-white/90">Vercel</strong> &mdash; hosting and application infrastructure</li>
            <li><strong className="text-white/90">Neon</strong> &mdash; PostgreSQL database hosting</li>
          </ul>
          <p className="mt-2">Each service has its own privacy policy and processes data in accordance with GDPR.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-2">Data storage and security</h2>
          <p>
            Your data is stored in a PostgreSQL database hosted by Neon in the London (UK) region.
            Passwords are hashed using bcrypt and never stored in plain text. All data is encrypted
            in transit via HTTPS. Authentication sessions are managed using secure, signed JSON Web Tokens (JWT).
          </p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-2">Data retention</h2>
          <p>
            Your account and alert data is retained for as long as your account is active. When you
            unsubscribe from an alert, it is deactivated. You can request complete deletion of your
            account and all associated data by contacting us.
          </p>
          <p className="mt-2">
            If you cancel a Pro subscription, your account reverts to the Free plan. No data is deleted
            upon cancellation.
          </p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-2">Your rights</h2>
          <p>Under UK GDPR, you have the right to:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and data</li>
            <li>Withdraw consent and unsubscribe at any time</li>
            <li>Object to processing of your data</li>
            <li>Data portability &mdash; receive your data in a machine-readable format</li>
          </ul>
          <p className="mt-2">Every notification email includes a one-click unsubscribe link.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-2">Cookies</h2>
          <p>
            We use a session cookie to keep you signed in and Google Analytics (GA4) to understand
            how visitors use the site. Google Analytics collects anonymous usage data such as pages
            visited and session duration. You can opt out via your browser settings or a Google Analytics
            opt-out extension.
          </p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-2">Changes to this policy</h2>
          <p>
            We may update this policy from time to time. Changes will be posted on this page with an
            updated date. Continued use of the service after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-2">Contact</h2>
          <p>
            For any privacy-related queries, data requests, or account deletion, email us at{" "}
            <a href="mailto:patrickboulton44@gmail.com" className="text-white underline">
              patrickboulton44@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </main>
  );
}

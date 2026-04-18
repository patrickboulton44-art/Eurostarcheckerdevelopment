export default function CookiePolicy() {
  return (
    <main className="min-h-screen px-6 sm:px-12 py-16 max-w-2xl">
      <a href="/" className="text-white/40 text-sm hover:text-white/60 transition-colors mb-8 inline-block">
        &larr; Back
      </a>

      <h1 className="text-4xl font-bold text-white uppercase tracking-tight mb-8">
        Cookie Policy
      </h1>

      <div className="space-y-6 text-white/70 text-sm leading-relaxed">
        <p className="text-white/40 text-xs">Last updated: 3 April 2026</p>

        <section>
          <h2 className="text-white font-semibold text-base mb-2">What are cookies?</h2>
          <p>
            Cookies are small text files stored on your device by your web browser. They are used
            to remember preferences, maintain sessions, and collect usage information.
          </p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-2">Cookies we use</h2>

          <h3 className="text-white/90 font-medium mt-4 mb-2">Strictly necessary cookies</h3>
          <p>These cookies are essential for the site to function. They cannot be disabled.</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong className="text-white/90">Session cookie</strong> &mdash; keeps you signed in to your account. Expires when you sign out or close your browser.</li>
          </ul>

          <h3 className="text-white/90 font-medium mt-4 mb-2">Analytics cookies (optional)</h3>
          <p>These cookies help us understand how visitors use the site. They are only set if you consent.</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong className="text-white/90">Google Analytics (_ga, _ga_*)</strong> &mdash; collects anonymous usage data such as pages visited, session duration, and approximate location (country level). Data is sent to Google. Expires after 2 years.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-2">If you decline cookies</h2>
          <p>
            If you decline analytics cookies, no Google Analytics data will be collected. No tracking
            scripts will load. The site will function normally &mdash; only the essential session cookie
            will be used.
          </p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-2">Managing cookies</h2>
          <p>
            You can change your cookie preferences at any time by clearing your browser cookies and
            revisiting the site. You can also disable cookies entirely in your browser settings, though
            this may affect your ability to sign in.
          </p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-2">Third-party cookies</h2>
          <p>
            Google Analytics may set its own cookies. Google&rsquo;s privacy policy applies to the data
            they collect:{" "}
            <a href="https://policies.google.com/privacy" className="text-white underline" target="_blank" rel="noopener noreferrer">
              policies.google.com/privacy
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-base mb-2">Contact</h2>
          <p>
            For any questions about our cookie policy, email{" "}
            <a href="mailto:patrickboulton44@gmail.com" className="text-white underline">
              patrickboulton44@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </main>
  );
}

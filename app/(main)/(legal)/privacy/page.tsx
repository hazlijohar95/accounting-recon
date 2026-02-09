import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Reconciled',
  description: 'Privacy Policy for Reconciled - How we collect, use, and protect your data',
}

export default function PrivacyPage() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <header className="not-prose mb-12">
        <p className="text-xs font-mono text-muted-foreground mb-2">
          Last updated: February 2026
        </p>
        <h1 className="text-2xl md:text-3xl font-mono font-medium tracking-tight">
          Privacy Policy
        </h1>
      </header>

      <section className="space-y-8">
        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            1. Introduction
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Cynco Sdn. Bhd. (Company No. 1588139-X) ("we", "our", "us") is committed to protecting
            your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard
            your information when you use our Reconciled platform.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            2. Information We Collect
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            We collect information you provide directly:
          </p>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 list-none pl-0 mb-4">
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              <strong className="text-foreground/80">Account information:</strong> Name, email address, company details
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              <strong className="text-foreground/80">Financial data:</strong> Bank statements, invoices, and transaction records you upload
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              <strong className="text-foreground/80">Usage data:</strong> How you interact with our Service
            </li>
          </ul>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We automatically collect device information, IP addresses, browser type, and cookies
            for analytics and service improvement purposes.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            3. How We Use Your Information
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            We use collected information to:
          </p>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 list-none pl-0">
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              Provide, maintain, and improve our reconciliation services
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              Process transactions and send related information
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              Send administrative messages and service updates
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              Respond to your requests and provide customer support
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              Analyze usage patterns to enhance user experience
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            4. Data Storage & Security
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your data is stored on secure cloud infrastructure with encryption at rest and in
            transit. We implement industry-standard security measures including access controls,
            regular security audits, and employee training. Financial data is processed in
            isolated environments with strict access controls.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            5. Data Sharing
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            We do not sell your personal data. We may share information with:
          </p>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 list-none pl-0">
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              <strong className="text-foreground/80">Service providers:</strong> Who assist in operating our platform (hosting, analytics)
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              <strong className="text-foreground/80">Legal requirements:</strong> When required by law or to protect our rights
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              <strong className="text-foreground/80">Business transfers:</strong> In connection with mergers or acquisitions
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            6. Data Retention
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We retain your data for as long as your account is active or as needed to provide
            services. Upon account deletion, we will delete your personal data within 30 days,
            except where retention is required by law or for legitimate business purposes.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            7. Your Rights
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            You have the right to:
          </p>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 list-none pl-0">
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              Access and receive a copy of your personal data
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              Rectify inaccurate or incomplete information
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              Request deletion of your personal data
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              Object to or restrict processing of your data
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              Data portability in a machine-readable format
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            8. Cookies
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We use essential cookies for authentication and session management. Analytics cookies
            help us understand how you use our Service. You can control cookie preferences through
            your browser settings.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            9. Updates to This Policy
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We may update this Privacy Policy periodically. We will notify you of significant
            changes via email or through the Service. The "Last updated" date indicates when
            this policy was last revised.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            10. Contact Us
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For privacy-related inquiries, contact our Data Protection Officer at{' '}
            <a href="mailto:privacy@cynco.my" className="text-foreground hover:underline">
              privacy@cynco.my
            </a>
          </p>
        </div>
      </section>
    </article>
  )
}

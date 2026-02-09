import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | Reconciled',
  description: 'Terms of Service for Reconciled - Automated accounting reconciliation platform',
}

export default function TermsPage() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <header className="not-prose mb-12">
        <p className="text-xs font-mono text-muted-foreground mb-2">
          Last updated: February 2026
        </p>
        <h1 className="text-2xl md:text-3xl font-mono font-medium tracking-tight">
          Terms of Service
        </h1>
      </header>

      <section className="space-y-8">
        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            1. Agreement to Terms
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            By accessing or using Reconciled ("Service"), operated by Cynco Sdn. Bhd. (Company No. 1588139-X),
            you agree to be bound by these Terms of Service. If you do not agree to these terms,
            please do not use our Service.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            2. Description of Service
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Reconciled is a cloud-based accounting reconciliation platform that provides automated
            matching between bank transactions and accounting records. The Service includes data
            upload, AI-powered transaction matching, reporting, and export capabilities.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            3. User Accounts
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            To access certain features, you must create an account. You are responsible for:
          </p>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 list-none pl-0">
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              Maintaining the confidentiality of your account credentials
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              All activities that occur under your account
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              Notifying us immediately of any unauthorized access
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            4. Acceptable Use
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            You agree not to:
          </p>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 list-none pl-0">
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              Use the Service for any unlawful purpose
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              Upload malicious code or attempt to compromise system security
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              Reverse engineer or attempt to extract source code
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              Resell or redistribute the Service without authorization
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            5. Data Ownership
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You retain all ownership rights to the data you upload to the Service. We do not claim
            ownership of your financial data. By using the Service, you grant us a limited license
            to process your data solely for the purpose of providing the Service.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            6. Service Availability
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We strive to maintain high availability but do not guarantee uninterrupted access.
            The Service may be temporarily unavailable for maintenance, updates, or circumstances
            beyond our control. We will provide reasonable notice for planned maintenance.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            7. Limitation of Liability
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            To the maximum extent permitted by law, Cynco Sdn. Bhd. shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages arising from your
            use of the Service. Our total liability shall not exceed the amount paid by you for
            the Service in the twelve months preceding the claim.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            8. Modifications
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We reserve the right to modify these terms at any time. Material changes will be
            communicated via email or through the Service. Continued use after changes constitutes
            acceptance of the modified terms.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            9. Governing Law
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            These terms are governed by the laws of Malaysia. Any disputes shall be subject to
            the exclusive jurisdiction of the courts of Malaysia.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            10. Contact
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For questions about these terms, contact us at{' '}
            <a href="mailto:legal@cynco.my" className="text-foreground hover:underline">
              legal@cynco.my
            </a>
          </p>
        </div>
      </section>
    </article>
  )
}

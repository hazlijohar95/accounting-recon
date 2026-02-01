import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PDPA Notice | Reconciled',
  description: 'Personal Data Protection Act 2010 (PDPA) Notice for Reconciled',
}

export default function PDPAPage() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <header className="not-prose mb-12">
        <p className="text-xs font-mono text-muted-foreground mb-2">
          Last updated: February 2026
        </p>
        <h1 className="text-2xl md:text-3xl font-mono font-medium tracking-tight">
          PDPA Notice
        </h1>
        <p className="text-sm text-muted-foreground mt-3">
          Personal Data Protection Act 2010 (Malaysia)
        </p>
      </header>

      <section className="space-y-8">
        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            1. Data User
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground/80">Cynco Sdn. Bhd.</strong> (Company No. 1588139-X)
            is the data user responsible for your personal data under the Personal Data Protection
            Act 2010 ("PDPA").
          </p>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            2. Personal Data Collected
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            In accordance with Section 7 of the PDPA, we collect the following categories of
            personal data:
          </p>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 list-none pl-0">
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              Name and contact information (email, phone number)
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              Company or business registration details
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              Financial transaction data uploaded to the platform
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              Technical data (IP address, device information, usage logs)
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            3. Purpose of Processing
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Your personal data is processed for the following purposes:
          </p>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 list-none pl-0">
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              To provide accounting reconciliation services
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              To manage your account and authenticate access
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              To communicate service updates and respond to inquiries
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              To comply with legal and regulatory requirements
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              To improve our services through analytics
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            4. Disclosure to Third Parties
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Your personal data may be disclosed to:
          </p>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 list-none pl-0">
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              Cloud service providers for data hosting and processing
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              Authentication service providers
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              Regulatory authorities when required by law
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              Professional advisors (legal, audit) under confidentiality obligations
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            5. Transfer Outside Malaysia
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your personal data may be transferred to and processed in countries outside Malaysia
            where our service providers operate. We ensure that such transfers comply with Section
            129 of the PDPA and that adequate safeguards are in place to protect your data.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            6. Data Security
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            In accordance with the Security Principle under the PDPA, we implement appropriate
            technical and organizational measures to protect your personal data against unauthorized
            access, alteration, disclosure, or destruction. This includes encryption, access
            controls, and regular security assessments.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            7. Data Retention
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            In compliance with the Retention Principle, we retain your personal data only for
            as long as necessary to fulfill the purposes for which it was collected. Account
            data is retained while your account is active and for a reasonable period thereafter
            for legal and business purposes.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            8. Your Rights Under PDPA
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Under the PDPA, you have the right to:
          </p>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-2 list-none pl-0">
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              <strong className="text-foreground/80">Access</strong> your personal data held by us (Section 12)
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              <strong className="text-foreground/80">Correct</strong> any inaccurate or incomplete personal data (Section 34)
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              <strong className="text-foreground/80">Withdraw consent</strong> for processing of your personal data
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-muted-foreground/50 rounded-full mt-2 flex-shrink-0" />
              <strong className="text-foreground/80">Limit processing</strong> to certain purposes only
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            9. Data Access Request
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            To exercise your rights under the PDPA, submit a Data Access Request in writing to
            our Data Protection Officer. We will respond within 21 days of receiving your request.
            A processing fee may apply as permitted under the PDPA.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            10. Consent
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            By using our Service, you consent to the collection, processing, and disclosure of
            your personal data as described in this Notice. You may withdraw your consent at any
            time by contacting us, subject to legal and contractual restrictions.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-foreground mb-3">
            11. Contact Information
          </h2>
          <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
            <p>
              <strong className="text-foreground/80">Data Protection Officer</strong><br />
              Cynco Sdn. Bhd. (1588139-X)
            </p>
            <p>
              Email:{' '}
              <a href="mailto:dpo@cynco.my" className="text-foreground hover:underline">
                dpo@cynco.my
              </a>
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground/60 leading-relaxed">
            This Notice is issued in compliance with the Personal Data Protection Act 2010
            (Act 709) and the Personal Data Protection Regulations 2013. For more information
            about the PDPA, visit the{' '}
            <a
              href="https://www.pdp.gov.my"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Department of Personal Data Protection Malaysia
            </a>.
          </p>
        </div>
      </section>
    </article>
  )
}

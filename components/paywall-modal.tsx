'use client'

import { useAppStore } from '@/lib/store'
import { IconX, IconCheck } from '@/components/brand/icons'

const plans = [
  {
    name: 'Starter',
    price: '$29',
    period: '/mo',
    features: ['100 transactions/mo', '5 reconciliation sessions', 'CSV export', 'Email support'],
    cta: 'Start Free Trial',
    highlight: false,
  },
  {
    name: 'Professional',
    price: '$79',
    period: '/mo',
    features: ['Unlimited transactions', 'Unlimited sessions', 'All export formats', 'AI semantic matching', 'Priority support'],
    cta: 'Start Free Trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    features: ['Everything in Pro', 'SSO & SAML', 'Dedicated support', 'Custom integrations', 'SLA guarantee'],
    cta: 'Contact Sales',
    highlight: false,
  },
]

export function PaywallModal() {
  const { showPaywall, setShowPaywall, setShowOnboarding } = useAppStore()
  
  const handlePlanSelect = () => {
    setShowPaywall(false)
    setShowOnboarding(true)
  }

  if (!showPaywall) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowPaywall(false)} />
      <div className="relative bg-background border border-border w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">Upgrade to Continue</h2>
            <p className="text-sm text-muted-foreground mt-1">This action requires a paid plan</p>
          </div>
          <button
            onClick={() => setShowPaywall(false)}
            className="p-2 hover:bg-secondary transition-colors"
          >
            <IconX size={16} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`border p-4 flex flex-col ${plan.highlight ? 'border-foreground' : 'border-border'}`}
              >
                <div className="text-sm font-medium">{plan.name}</div>
                <div className="mt-2 flex items-baseline">
                  <span className="text-2xl font-medium">{plan.price}</span>
                  {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                </div>
                <ul className="mt-4 space-y-2 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-xs">
                      <IconCheck size={12} className="shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handlePlanSelect}
                  className={`mt-4 w-full py-2 text-sm transition-colors ${
                    plan.highlight
                      ? 'bg-foreground text-background hover:bg-foreground/90'
                      : 'border border-border hover:bg-secondary'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-center text-muted-foreground">
            All plans include a 14-day free trial. No credit card required.
          </p>
        </div>
      </div>
    </div>
  )
}

import dynamic from 'next/dynamic'
import { AppSidebar } from '@/components/app-sidebar'
import { AppTopbar } from '@/components/app-topbar'

const PaywallModal = dynamic(
  () => import('@/components/paywall-modal').then(m => ({ default: m.PaywallModal }))
)
const OnboardingChat = dynamic(
  () => import('@/components/onboarding-chat').then(m => ({ default: m.OnboardingChat }))
)
const OnboardingTour = dynamic(
  () => import('@/components/onboarding').then(m => ({ default: m.OnboardingTour }))
)
const OnboardingChecklist = dynamic(
  () => import('@/components/onboarding').then(m => ({ default: m.OnboardingChecklist }))
)

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex bg-background">
      <AppSidebar />
      <main className="flex-1 flex flex-col overflow-y-auto relative">
        <AppTopbar />
        {children}
      </main>
      <PaywallModal />
      <OnboardingChat />
      <OnboardingTour />
      <OnboardingChecklist />
    </div>
  )
}

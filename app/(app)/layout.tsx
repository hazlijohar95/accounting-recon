import { AppSidebar } from '@/components/app-sidebar'
import { AppTopbar } from '@/components/app-topbar'
import { PaywallModal } from '@/components/paywall-modal'
import { OnboardingChat } from '@/components/onboarding-chat'
import { OnboardingTour, OnboardingChecklist } from '@/components/onboarding'

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

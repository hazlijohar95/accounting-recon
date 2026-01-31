import { AppSidebar } from '@/components/app-sidebar'
import { PaywallModal } from '@/components/paywall-modal'
import { OnboardingChat } from '@/components/onboarding-chat'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex bg-background">
      <AppSidebar />
      <main className="flex-1 flex flex-col overflow-y-auto relative">
        {children}
      </main>
      <PaywallModal />
      <OnboardingChat />
    </div>
  )
}

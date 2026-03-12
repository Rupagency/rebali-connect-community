import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import NewListingNotification from './NewListingNotification';
import BottomNav from './BottomNav';
import PwaInstallButton from './PwaInstallButton';
import VisitorOnboarding from './VisitorOnboarding';
import MemberOnboarding from './MemberOnboarding';
import { useAuth } from '@/contexts/AuthContext';

export default function Layout() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-12 md:pb-0">
        <Outlet />
      </main>
      <Footer className="hidden md:block" />
      <BottomNav />
      <PwaInstallButton />
      <NewListingNotification />
      {!loading && !user && <VisitorOnboarding />}
      {!loading && user && <MemberOnboarding />}
    </div>
  );
}

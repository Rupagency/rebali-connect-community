import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import NewListingNotification from './NewListingNotification';
import BottomNav from './BottomNav';
import PwaInstallButton from './PwaInstallButton';
import VisitorOnboarding from './VisitorOnboarding';
import MemberOnboarding from './MemberOnboarding';
import OfflineBanner from './OfflineBanner';
import { useAuth } from '@/contexts/AuthContext';
import { useNativePushNotifications } from '@/hooks/useNativePushNotifications';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';

export default function Layout() {
  const { user, loading } = useAuth();
  const isOffline = useOfflineStatus();
  const location = useLocation();
  useNativePushNotifications();

  const isMessagesConversationView =
    location.pathname === '/messages' && new URLSearchParams(location.search).has('conv');

  return (
    <div className="min-h-screen flex flex-col">
      <OfflineBanner />
      <Header />
      <main className={`flex-1 ${isMessagesConversationView ? 'pb-0' : 'pb-12'} md:pb-0`}>
        {isOffline ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
                <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
<path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                <line x1="12" y1="20" x2="12.01" y2="20" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Vous êtes hors ligne</h2>
            <p className="text-muted-foreground max-w-sm mb-6">
              Pas de connexion internet. Les annonces déjà consultées restent accessibles — utilisez le bouton retour pour les retrouver.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
            >
              Réessayer
            </button>
            <p className="text-xs text-muted-foreground mt-4">💡 Les annonces vues sont en cache et disponibles hors ligne.</p>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
      <Footer className="hidden md:block" />
      {!isMessagesConversationView && <BottomNav />}
      <PwaInstallButton />
      {!isOffline && <NewListingNotification />}
      {!loading && !user && <VisitorOnboarding />}
      {!loading && user && <MemberOnboarding />}
    </div>
  );
}

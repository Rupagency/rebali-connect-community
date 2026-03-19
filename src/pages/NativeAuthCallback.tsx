import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";

const APP_DEEP_LINK_BASE = "com.rebali.app://auth/callback";

const buildDeepLink = () => `${APP_DEEP_LINK_BASE}${window.location.search}${window.location.hash}`;

const NativeAuthCallback = () => {
  const deepLink = useMemo(buildDeepLink, []);

  useEffect(() => {
    window.location.replace(deepLink);
  }, [deepLink]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-10 text-foreground">
      <section className="mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Retour à l’application…</h1>
        <p className="text-sm text-muted-foreground">
          Si Re-Bali ne s’ouvre pas automatiquement, appuie sur le bouton ci-dessous.
        </p>
        <Button asChild className="w-full">
          <a href={deepLink}>Ouvrir Re-Bali</a>
        </Button>
      </section>
    </main>
  );
};

export default NativeAuthCallback;

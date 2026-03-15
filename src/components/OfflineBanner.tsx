import { WifiOff } from "lucide-react";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { AnimatePresence, motion } from "framer-motion";

export default function OfflineBanner() {
  const isOffline = useOfflineStatus();

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-destructive text-destructive-foreground text-sm font-semibold py-2 px-4 shadow-lg"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)" }}
        >
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>Hors ligne — les annonces consultées restent accessibles</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

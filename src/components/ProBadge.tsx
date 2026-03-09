import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Building2 } from 'lucide-react';
import type { ProTier } from '@/hooks/useProStatus';

interface ProBadgeProps {
  tier: ProTier;
  size?: 'sm' | 'md';
  className?: string;
}

export default function ProBadge({ tier, size = 'md', className = '' }: ProBadgeProps) {
  if (!tier || tier === 'free_pro') return null;

  const isAgence = tier === 'agence';
  const Icon = isAgence ? Building2 : ShieldCheck;
  const label = isAgence ? 'Business Certifié' : 'Pro Vérifié';
  const colors = isAgence
    ? 'bg-accent/10 text-accent border-accent/20'
    : 'bg-primary/10 text-primary border-primary/20';

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <Badge className={`${colors} gap-1 ${textSize} ${className}`}>
      <Icon className={iconSize} /> {label}
    </Badge>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { ShieldCheck, ShieldOff, Loader2, Copy, CheckCircle } from 'lucide-react';

export default function TwoFactorSetup() {
  const { t } = useLanguage();
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const verified = data?.totp?.some(f => f.status === 'verified') || false;
      setMfaEnabled(verified);
    } catch (err) {
      console.error('[2FA] check status error:', err);
      setMfaEnabled(false);
    }
    setLoading(false);
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      // Clean up any unverified factors first
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const unverified = factors?.totp?.filter(f => f.status === 'unverified') || [];
      for (const f of unverified) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Rebali Authenticator',
      });
      if (error) throw error;
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
    setEnrolling(false);
  };

  const handleVerify = async () => {
    if (!factorId || otpCode.length !== 6) return;
    setVerifying(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: otpCode,
      });
      if (verifyError) throw verifyError;

      toast({ title: '2FA activée ✅', description: 'La double authentification est maintenant active sur votre compte.' });
      setMfaEnabled(true);
      setQrCode(null);
      setSecret(null);
      setFactorId(null);
      setOtpCode('');
    } catch (err: any) {
      toast({ title: 'Code invalide', description: err.message, variant: 'destructive' });
    }
    setVerifying(false);
  };

  const handleDisable = async () => {
    if (!confirm('Êtes-vous sûr de vouloir désactiver la double authentification ?')) return;
    setDisabling(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verified = factors?.totp?.filter(f => f.status === 'verified') || [];
      for (const f of verified) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      toast({ title: '2FA désactivée', description: 'La double authentification a été désactivée.' });
      setMfaEnabled(false);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
    setDisabling(false);
  };

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-5 w-5" />
          Double authentification (2FA)
          {mfaEnabled && (
            <Badge variant="default" className="ml-auto text-xs">Activée</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mfaEnabled ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>Votre compte est protégé par la double authentification.</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisable}
              disabled={disabling}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              {disabling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />}
              Désactiver la 2FA
            </Button>
          </div>
        ) : qrCode ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scannez ce QR code avec votre application d'authentification (Google Authenticator, Authy, etc.)
            </p>
            <div className="flex justify-center">
              <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48 rounded-lg border" />
            </div>
            {secret && (
              <div className="flex items-center gap-2 bg-muted p-2 rounded-md">
                <code className="text-xs flex-1 break-all">{secret}</code>
                <Button variant="ghost" size="sm" onClick={copySecret} className="shrink-0">
                  {copied ? <CheckCircle className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm font-medium">Entrez le code à 6 chiffres :</p>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button onClick={handleVerify} disabled={verifying || otpCode.length !== 6} className="w-full">
                {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Vérifier et activer
              </Button>
              <Button variant="ghost" size="sm" className="w-full" onClick={() => { setQrCode(null); setSecret(null); setFactorId(null); setOtpCode(''); }}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ajoutez une couche de sécurité supplémentaire à votre compte avec une application d'authentification.
            </p>
            <Button onClick={handleEnroll} disabled={enrolling} className="gap-1.5">
              {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Activer la 2FA
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

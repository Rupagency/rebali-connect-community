import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { ShieldCheck, ShieldOff, Loader2, Copy, CheckCircle, Mail, Smartphone } from 'lucide-react';

type MfaMethod = 'none' | 'totp' | 'email';

export default function TwoFactorSetup() {
  const [activeMethod, setActiveMethod] = useState<MfaMethod>('none');
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [disabling, setDisabling] = useState(false);

  // TOTP state
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  // Choosing state
  const [choosing, setChoosing] = useState(false);

  useEffect(() => {
    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
    try {
      // Check TOTP
      const { data } = await supabase.auth.mfa.listFactors();
      const hasTotp = data?.totp?.some(f => f.status === 'verified') || false;
      if (hasTotp) {
        setActiveMethod('totp');
        setLoading(false);
        return;
      }

      // Check email MFA
      const { data: emailMfa } = await supabase
        .from('email_mfa')
        .select('enabled')
        .single();

      if (emailMfa?.enabled) {
        setActiveMethod('email');
      } else {
        setActiveMethod('none');
      }
    } catch {
      setActiveMethod('none');
    }
    setLoading(false);
  };

  // ---- TOTP handlers ----
  const handleEnrollTotp = async () => {
    setEnrolling(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const unverified = factors?.totp?.filter(f => (f.status as string) === 'unverified') || [];
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

  const handleVerifyTotp = async () => {
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

      toast({ title: '2FA activée ✅', description: 'Authenticator activé sur votre compte.' });
      setActiveMethod('totp');
      setQrCode(null);
      setSecret(null);
      setFactorId(null);
      setOtpCode('');
      setChoosing(false);
    } catch (err: any) {
      toast({ title: 'Code invalide', description: err.message, variant: 'destructive' });
    }
    setVerifying(false);
  };

  const handleDisableTotp = async () => {
    if (!confirm('Désactiver la 2FA par authenticator ?')) return;
    setDisabling(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verified = factors?.totp?.filter(f => f.status === 'verified') || [];
      for (const f of verified) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      toast({ title: '2FA désactivée' });
      setActiveMethod('none');
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
    setDisabling(false);
  };

  // ---- Email MFA handlers ----
  const handleEnableEmail = async () => {
    setEnrolling(true);
    try {
      // Upsert email_mfa
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('email_mfa')
        .upsert({ user_id: user.id, enabled: true }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({ title: '2FA par email activée ✅', description: 'Un code vous sera envoyé par email à chaque connexion.' });
      setActiveMethod('email');
      setChoosing(false);
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
    setEnrolling(false);
  };

  const handleDisableEmail = async () => {
    if (!confirm('Désactiver la 2FA par email ?')) return;
    setDisabling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase
        .from('email_mfa')
        .update({ enabled: false })
        .eq('user_id', user.id);

      toast({ title: '2FA par email désactivée' });
      setActiveMethod('none');
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
          {activeMethod !== 'none' && (
            <Badge variant="default" className="ml-auto text-xs">
              {activeMethod === 'totp' ? 'Authenticator' : 'Email'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active method display */}
        {activeMethod === 'totp' && !choosing && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Smartphone className="h-4 w-4 text-primary" />
              <span>Protégé par application authenticator.</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleDisableTotp} disabled={disabling}
              className="gap-1.5 text-destructive hover:text-destructive">
              {disabling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />}
              Désactiver
            </Button>
          </div>
        )}

        {activeMethod === 'email' && !choosing && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4 text-primary" />
              <span>Protégé par code email à chaque connexion.</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleDisableEmail} disabled={disabling}
              className="gap-1.5 text-destructive hover:text-destructive">
              {disabling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />}
              Désactiver
            </Button>
          </div>
        )}

        {/* Method chooser */}
        {activeMethod === 'none' && !choosing && !qrCode && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ajoutez une couche de sécurité supplémentaire à votre compte.
            </p>
            <Button onClick={() => setChoosing(true)} className="gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              Activer la 2FA
            </Button>
          </div>
        )}

        {choosing && !qrCode && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Choisissez votre méthode :</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleEnrollTotp}
                disabled={enrolling}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-muted hover:border-primary transition-all text-center"
              >
                <Smartphone className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">Authenticator</span>
                <span className="text-xs text-muted-foreground">Google Authenticator, Authy…</span>
              </button>
              <button
                onClick={handleEnableEmail}
                disabled={enrolling}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-muted hover:border-primary transition-all text-center"
              >
                <Mail className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">Email</span>
                <span className="text-xs text-muted-foreground">Code envoyé par email</span>
              </button>
            </div>
            {enrolling && (
              <div className="flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
            )}
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setChoosing(false)}>
              Annuler
            </Button>
          </div>
        )}

        {/* TOTP enrollment QR */}
        {qrCode && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scannez ce QR code avec votre application d'authentification.
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
              <Button onClick={handleVerifyTotp} disabled={verifying || otpCode.length !== 6} className="w-full">
                {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Vérifier et activer
              </Button>
              <Button variant="ghost" size="sm" className="w-full"
                onClick={() => { setQrCode(null); setSecret(null); setFactorId(null); setOtpCode(''); setChoosing(false); }}>
                Annuler
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

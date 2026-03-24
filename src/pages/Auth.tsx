/* rebuild-trigger-v2 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import SEOHead from '@/components/SEOHead';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { User, Briefcase, Gift, ClipboardPaste, ShieldCheck, Mail, Loader2 } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { PasswordInput } from '@/components/PasswordInput';
import { PasswordStrength } from '@/components/PasswordStrength';
import { Checkbox } from '@/components/ui/checkbox';
import { LegalDialog } from '@/components/LegalDialog';
import { SocialLoginButtons } from '@/components/SocialLoginButtons';
import { Separator } from '@/components/ui/separator';

export default function Auth() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'signup' ? 'signup' : 'login';

  // Redirect if already logged in
  useEffect(() => {
    console.log('[Auth page] redirect check:', { authLoading, user: !!user });
    if (!authLoading && user) navigate('/', { replace: true });
  }, [authLoading, user, navigate]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [userType, setUserType] = useState<'private' | 'business'>('private');
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [legalDialog, setLegalDialog] = useState<'terms' | 'privacy' | null>(null);
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [mfaChallenge, setMfaChallenge] = useState<{ factorId: string; challengeId: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [emailMfaPending, setEmailMfaPending] = useState(false);
  const [emailMfaCode, setEmailMfaCode] = useState('');
  const [emailMfaSending, setEmailMfaSending] = useState(false);

  const handleFieldFocusCapture = (event: React.FocusEvent<HTMLDivElement>) => {
    if (window.innerWidth >= 768) return;
    const target = event.target as HTMLElement;
    const tag = target.tagName;
    const isField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
    if (!isField) return;

    window.setTimeout(() => {
      target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    }, 150);
  };

  // Device fingerprinting
  const getDeviceHash = async (): Promise<string> => {
    const raw = [
      navigator.userAgent,
      navigator.language,
      screen.width.toString(),
      screen.height.toString(),
      navigator.platform,
    ].join('|');
    const encoder = new TextEncoder();
    const data = encoder.encode(raw);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const logDevice = async (userId: string) => {
    try {
      const deviceHash = await getDeviceHash();
      await supabase.functions.invoke('log-device', {
        body: { device_hash: deviceHash, user_agent: navigator.userAgent, user_id: userId },
      });
    } catch {
      // Silently fail - device logging is best-effort
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setLoading(false);
    } else if (data?.session) {
      // Session returned — check for email MFA before completing login
      try {
        const { data: emailMfa } = await supabase
          .from('email_mfa')
          .select('enabled')
          .eq('user_id', data.user.id)
          .single();

        if (emailMfa?.enabled) {
          // Send email MFA code
          setEmailMfaSending(true);
          const { error: sendErr } = await supabase.functions.invoke('send-mfa-email', {
            body: { action: 'send_code' },
          });
          setEmailMfaSending(false);
          if (sendErr) {
            console.error('[Auth] Email MFA send error:', sendErr);
            // Still allow login if email MFA fails to send
            if (data?.user) logDevice(data.user.id);
            navigate('/', { replace: true });
          } else {
            setEmailMfaPending(true);
            setLoading(false);
            return;
          }
        }
      } catch {
        // No email MFA row — continue normally
      }

      if (data?.user) logDevice(data.user.id);
      navigate('/', { replace: true });
    } else {
      // MFA required — no session returned (TOTP)
      try {
        const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) throw factorsError;
        const totpFactor = factorsData?.totp?.find(f => f.status === 'verified');
        if (totpFactor) {
          const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
          if (challengeError) throw challengeError;
          setMfaChallenge({ factorId: totpFactor.id, challengeId: challenge.id });
          setLoading(false);
          return;
        }
      } catch (err: any) {
        console.error('[Auth] MFA challenge error:', err);
      }
      navigate('/', { replace: true });
    }
  };

  const handleEmailMfaVerify = async () => {
    if (emailMfaCode.length !== 6) return;
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('verify-mfa-email', {
        body: { code: emailMfaCode },
      });
      if (error) throw error;
      if (!result?.verified) throw new Error(result?.error || 'Code invalide');

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) logDevice(currentUser.id);
      navigate('/', { replace: true });
    } catch (err: any) {
      toast({ title: 'Code invalide', description: err.message, variant: 'destructive' });
      setEmailMfaCode('');
    }
    setLoading(false);
  };

  const handleResendEmailMfa = async () => {
    setEmailMfaSending(true);
    try {
      await supabase.functions.invoke('send-mfa-email', {
        body: { action: 'send_code' },
      });
      toast({ title: 'Code renvoyé', description: 'Vérifiez votre boîte email.' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de renvoyer le code.', variant: 'destructive' });
    }
    setEmailMfaSending(false);
  };

  const handleMfaVerify = async () => {
    if (!mfaChallenge || mfaCode.length !== 6) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: mfaChallenge.factorId,
        challengeId: mfaChallenge.challengeId,
        code: mfaCode,
      });
      if (error) throw error;
      // Get user for device logging
      const { data: { user: mfaUser } } = await supabase.auth.getUser();
      if (mfaUser) logDevice(mfaUser.id);
      navigate('/', { replace: true });
    } catch (err: any) {
      toast({ title: 'Code invalide', description: err.message, variant: 'destructive' });
      setMfaCode('');
      // Re-create challenge for retry
      try {
        const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: mfaChallenge.factorId });
        if (challenge) setMfaChallenge({ factorId: mfaChallenge.factorId, challengeId: challenge.id });
      } catch {}
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      toast({ title: 'Error', description: t('auth.acceptTermsRequired'), variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Error', description: t('auth.passwordMismatch'), variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, user_type: userType },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      // Show a clearer message for "already registered" errors
      if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
        toast({ title: t('auth.userAlreadyExists'), description: t('auth.tryLogin'), variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } else {
      // Register referral code if provided
      if (referralCode.trim() && signUpData?.user) {
        try {
          await supabase.functions.invoke('manage-points', {
            body: { action: 'register_referral', referral_code: referralCode.trim() },
          });
        } catch {
          // Silently fail - referral is best-effort
        }
      }
      // Use signUpData.session directly — never call getSession() here
      if (signUpData?.session) {
        toast({ title: t('auth.signupSuccess') });
        // Track signup event
        import('@/lib/analytics').then(({ trackEvent }) => trackEvent('signup', { user_type: userType })).catch(() => {});
        // Redirect handled by useEffect watching `user`
      } else {
        // Email confirmation required
        toast({ title: t('auth.confirmEmailSent') });
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) { toast({ title: t('auth.emailRequired'), variant: 'destructive' }); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: t('auth.passwordResetSent'), description: t('auth.checkSpam') });
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-md" onFocusCapture={handleFieldFocusCapture}>
      <SEOHead title={t('common.login')} noindex />
      <Tabs defaultValue={defaultTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="login">{t('common.login')}</TabsTrigger>
          <TabsTrigger value="signup">{t('common.signup')}</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>{mfaChallenge ? '🔐 Authenticator' : emailMfaPending ? '🔐 Vérification par email' : t('auth.loginTitle')}</CardTitle>
              <CardDescription>{mfaChallenge ? 'Entrez le code de votre application d\'authentification' : emailMfaPending ? 'Un code a été envoyé à votre adresse email' : t('auth.loginSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
               {mfaChallenge ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>Code à 6 chiffres requis (Authenticator)</span>
                  </div>
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={mfaCode} onChange={setMfaCode}>
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
                  <Button onClick={handleMfaVerify} className="w-full" disabled={loading || mfaCode.length !== 6}>
                    {loading ? t('common.loading') : 'Vérifier'}
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => { setMfaChallenge(null); setMfaCode(''); }}>
                    {t('common.back')}
                  </Button>
                </div>
              ) : emailMfaPending ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 text-primary" />
                    <span>Code à 6 chiffres envoyé par email</span>
                  </div>
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={emailMfaCode} onChange={setEmailMfaCode}>
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
                  <Button onClick={handleEmailMfaVerify} className="w-full" disabled={loading || emailMfaCode.length !== 6}>
                    {loading ? t('common.loading') : 'Vérifier'}
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="flex-1" onClick={handleResendEmailMfa} disabled={emailMfaSending}>
                      {emailMfaSending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                      Renvoyer le code
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1" onClick={() => { setEmailMfaPending(false); setEmailMfaCode(''); }}>
                      {t('common.back')}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <SocialLoginButtons />
                    <div className="relative">
                      <Separator />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                        {t('auth.orContinueWith')}
                      </span>
                    </div>
                  </div>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label>{t('auth.email')}</Label>
                      <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div>
                      <Label>{t('auth.password')}</Label>
                      <PasswordInput value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>{t('common.login')}</Button>
                    <div className="text-sm text-center">
                      <button type="button" onClick={handleForgotPassword} className="text-primary hover:underline">{t('auth.forgotPassword')}</button>
                    </div>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>{t('auth.signupTitle')}</CardTitle>
              <CardDescription>{t('auth.signupSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* User type selector - BEFORE social buttons so OAuth gets the right type */}
              <div className="space-y-4 mb-4">
                <div>
                  <Label>{t('auth.accountType')}</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setUserType('private')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        userType === 'private'
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/30'
                      }`}
                    >
                      <User className="h-6 w-6" />
                      <span className="text-sm font-medium">{t('auth.privateAccount')}</span>
                      <span className="text-xs text-muted-foreground text-center">{t('auth.privateDesc')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserType('business')}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                        userType === 'business'
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/30'
                      }`}
                    >
                      <Briefcase className="h-6 w-6" />
                      <span className="text-sm font-medium">{t('auth.proAccount')}</span>
                      <span className="text-xs text-muted-foreground text-center">{t('auth.proDescFull')}</span>
                    </button>
                  </div>
                </div>
                <SocialLoginButtons userType={userType} />
                <div className="relative">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    {t('auth.orContinueWith')}
                  </span>
                </div>
              </div>
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label>{t('auth.displayName')}</Label>
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} required />
                </div>
                {/* Referral code - only for private accounts (pro has no points) */}
                {userType === 'private' && (
                <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Gift className="h-4 w-4" />
                    <span>{t('referral.invitedByFriend')}</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={referralCode}
                      onChange={e => setReferralCode(e.target.value.toUpperCase())}
                      placeholder={t('referral.referralCodePlaceholder')}
                      maxLength={8}
                      className="font-mono tracking-widest uppercase"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          if (text && text.trim().length <= 8) {
                            setReferralCode(text.trim().toUpperCase());
                          }
                        } catch {
                          // Clipboard access denied
                        }
                      }}
                      title={t('referral.paste')}
                    >
                      <ClipboardPaste className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                )}
                {/* Pro account info */}
                {userType === 'business' && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1">
                  <p className="text-sm font-medium text-primary">{t('pro.freeProIncluded')}</p>
                  <p className="text-xs text-muted-foreground">{t('pro.freeProSignupDesc')}</p>
                </div>
                )}
                <div>
                  <Label>{t('auth.email')}</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label>{t('auth.password')}</Label>
                  <PasswordInput value={password} onChange={e => setPassword(e.target.value)} minLength={6} required />
                  <PasswordStrength password={password} />
                </div>
                <div>
                  <Label>{t('auth.confirmPassword')}</Label>
                  <PasswordInput value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </div>
                {/* Terms acceptance checkbox */}
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="accept-terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor="accept-terms" className="text-sm text-muted-foreground leading-tight">
                    {t('auth.acceptTerms')}{' '}
                    <button
                      type="button"
                      onClick={() => setLegalDialog('terms')}
                      className="text-primary hover:underline font-medium"
                    >
                      {t('legal.termsTitle')}
                    </button>
                    {' '}{t('common.and')}{' '}
                    <button
                      type="button"
                      onClick={() => setLegalDialog('privacy')}
                      className="text-primary hover:underline font-medium"
                    >
                      {t('legal.privacyTitle')}
                    </button>
                  </label>
                </div>
                <Button type="submit" className="w-full" disabled={loading || !acceptedTerms}>{t('common.signup')}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <LegalDialog
        open={legalDialog !== null}
        onOpenChange={(open) => !open && setLegalDialog(null)}
        type={legalDialog || 'terms'}
      />
    </div>
  );
}

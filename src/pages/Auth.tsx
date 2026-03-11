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
import { User, Briefcase, Gift, ClipboardPaste } from 'lucide-react';
import { PasswordInput } from '@/components/PasswordInput';
import { PasswordStrength } from '@/components/PasswordStrength';
import { Checkbox } from '@/components/ui/checkbox';
import { LegalDialog } from '@/components/LegalDialog';

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
    } else {
      // logDevice fire-and-forget; redirect handled by useEffect watching `user`
      if (data?.user) logDevice(data.user.id);
      // setLoading(false) will happen when AuthContext picks up the session
    }
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
        // Redirect handled by useEffect watching `user`
      } else {
        // Email confirmation required
        toast({ title: t('auth.magicLinkSent') });
      }
    }
    setLoading(false);
  };

  const handleMagicLink = async () => {
    if (!email) { toast({ title: t('auth.emailRequired'), variant: 'destructive' }); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: t('auth.magicLinkSent') });
      // Device will be logged on next login via auth state change
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) { toast({ title: t('auth.emailRequired'), variant: 'destructive' }); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else toast({ title: t('auth.magicLinkSent') });
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <SEOHead title={t('common.login')} noindex />
      <Tabs defaultValue={defaultTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="login">{t('common.login')}</TabsTrigger>
          <TabsTrigger value="signup">{t('common.signup')}</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>{t('auth.loginTitle')}</CardTitle>
              <CardDescription>{t('auth.loginSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
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
                <div className="flex justify-between text-sm">
                  <button type="button" onClick={handleForgotPassword} className="text-primary hover:underline">{t('auth.forgotPassword')}</button>
                  <button type="button" onClick={handleMagicLink} className="text-primary hover:underline">{t('auth.magicLink')}</button>
                </div>
              </form>
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
              <form onSubmit={handleSignup} className="space-y-4">
                {/* User type selector */}
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

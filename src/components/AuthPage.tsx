import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

export function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const migrateFromLocalStorage = useStore(s => s.migrateFromLocalStorage);
  const { language } = useLanguage();
  const copy = language === 'zh'
    ? {
        signUpDescription: '创建账号，在多设备同步你的数据',
        signInDescription: '登录以访问你的数据',
        email: '邮箱',
        password: '密码',
        accountCreated: '账号已创建。请检查邮箱完成确认，然后登录。',
        fallbackError: '发生错误',
        loading: '加载中...',
        signUp: '注册',
        signIn: '登录',
        hasAccount: '已有账号？',
        noAccount: '还没有账号？',
      }
    : {
        signUpDescription: 'Create an account to sync your data across devices',
        signInDescription: 'Sign in to access your data',
        email: 'Email',
        password: 'Password',
        accountCreated: 'Account created. Check your email to confirm it, then sign in.',
        fallbackError: 'An error occurred',
        loading: 'Loading...',
        signUp: 'Sign Up',
        signIn: 'Sign In',
        hasAccount: 'Already have an account?',
        noAccount: "Don't have an account?",
      };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await migrateFromLocalStorage();
        } else {
          setNotice(copy.accountCreated);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || copy.fallbackError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            <span className="text-primary">Day</span>Craft
          </CardTitle>
          <CardDescription>
            {isSignUp ? copy.signUpDescription : copy.signInDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{copy.email}</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{copy.password}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded-md">
                {error}
              </p>
            )}

            {notice && (
              <p className="text-sm text-green-700 bg-green-50 dark:bg-green-950 p-3 rounded-md">
                {notice}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? copy.loading : isSignUp ? copy.signUp : copy.signIn}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              {isSignUp ? copy.hasAccount : copy.noAccount}{' '}
              <button
                type="button"
                className="text-primary hover:underline font-medium"
                onClick={() => { setIsSignUp(!isSignUp); setError(''); setNotice(''); }}
              >
                {isSignUp ? copy.signIn : copy.signUp}
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

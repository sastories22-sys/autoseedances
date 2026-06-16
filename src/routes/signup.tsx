import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ensureUserBootstrap, getSafeAuthRedirect } from "@/lib/auth";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { CircleAlert as AlertCircle, Sparkles, Mail, Lock, Loader as Loader2, User, ArrowLeft, Check, X } from "lucide-react";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({
    meta: [
      { title: "Sign Up — Auto Seedance" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 20, label: "Weak", color: "bg-red-500" };
  if (score <= 2) return { score: 40, label: "Fair", color: "bg-orange-500" };
  if (score <= 3) return { score: 60, label: "Good", color: "bg-yellow-500" };
  if (score <= 4) return { score: 80, label: "Strong", color: "bg-green-500" };
  return { score: 100, label: "Very Strong", color: "bg-green-500" };
}

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const redirectTo = typeof window !== "undefined"
    ? getSafeAuthRedirect(new URLSearchParams(window.location.search).get("redirect"))
    : "/dashboard";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirectTo as any, replace: true });
    });
  }, [navigate, redirectTo]);

  const strength = getPasswordStrength(password);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setNotice(null);

    if (!name.trim()) {
      setErrorMessage("Please enter your name");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
          data: { display_name: name },
        },
      });

      if (error) throw error;

      if (data.session) {
        await ensureUserBootstrap(data.session.user);

        // Send welcome email via edge function
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        await fetch(`${supabaseUrl}/functions/v1/send-welcome-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: data.session.user.id,
            email: data.session.user.email,
            name: name,
          }),
        }).catch(() => {});

        toast.success("Account created!");
        navigate({ to: redirectTo as any, replace: true });
      } else {
        setNotice("Account created. Check your email and open the confirmation link to continue.");
        toast.success("Check your email to confirm your account");
      }
    } catch (err: any) {
      const message = err.message ?? "Something went wrong";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setErrorMessage(null);

    if (!window.location.hostname.endsWith("lovableproject.com") && !window.location.hostname.endsWith("lovable.app")) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });
      if (error) {
        setErrorMessage(error.message || "Google sign-in failed");
        toast.error(error.message || "Google sign-in failed");
        setLoading(false);
      }
      return;
    }

    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
    });
    if (result.error) {
      setErrorMessage(result.error.message || "Google sign-in failed");
      toast.error(result.error.message || "Google sign-in failed");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) await ensureUserBootstrap(data.session.user);
    navigate({ to: redirectTo as any, replace: true });
  }

  return (
    <div className="min-h-screen grid-bg grid place-items-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6 font-display font-bold text-xl">
          <span className="size-9 rounded-lg btn-gradient grid place-items-center">
            <Sparkles className="size-5 text-white" />
          </span>
          <span className="gradient-text">Auto Seedance</span>
        </Link>

        <Card className="glass border-0 p-8">
          <h1 className="text-2xl font-display font-bold text-center">Create your account</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">Start generating AI images and videos</p>

          {errorMessage && (
            <Alert variant="destructive" className="mt-5 bg-destructive/10">
              <AlertCircle className="size-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {notice && (
            <Alert className="mt-5 border-primary/30 bg-primary/10 text-foreground">
              <Mail className="size-4" />
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          )}

          <Button onClick={handleGoogle} disabled={loading} variant="outline" className="w-full mt-6 border-border bg-muted/50">
            <GoogleIcon /> Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px bg-muted flex-1" /> or <div className="h-px bg-muted flex-1" />
          </div>

          <form onSubmit={handleEmail} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <div className="relative mt-1">
                <User className="size-4 text-muted-foreground absolute left-3 top-3" />
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="pl-9 bg-muted/50 border-border"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1">
                <Mail className="size-4 text-muted-foreground absolute left-3 top-3" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="pl-9 bg-muted/50 border-border"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Lock className="size-4 text-muted-foreground absolute left-3 top-3" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="pl-9 bg-muted/50 border-border"
                  disabled={loading}
                />
              </div>
              {password && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Password strength</span>
                    <span className={strength.color.replace("bg-", "text-")}>{strength.label}</span>
                  </div>
                  <Progress value={strength.score} className={`h-1.5 ${strength.color}`} />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative mt-1">
                <Lock className="size-4 text-muted-foreground absolute left-3 top-3" />
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pl-9 bg-muted/50 border-border"
                  disabled={loading}
                />
                {confirmPassword && (
                  password === confirmPassword ? (
                    <Check className="size-4 text-green-500 absolute right-3 top-3" />
                  ) : (
                    <X className="size-4 text-red-500 absolute right-3 top-3" />
                  )
                )}
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full btn-gradient text-white border-0">
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create Account
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-5">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </Card>

        <Link to="/" className="flex items-center justify-center gap-1 mt-6 text-sm text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="size-4" /> Back to home
        </Link>
      </motion.div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-4 mr-2" viewBox="0 0 24 24">
      <path fill="#EA4335" d="M12 5c1.6 0 3 .55 4.1 1.6L19 4c-1.9-1.7-4.3-2.7-7-2.7C7 1.3 2.7 4.5 1 9l3.4 2.6C5.3 8.4 8.4 5 12 5z"/>
      <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.5-.2-2.3H12v4.5h6.2c-.3 1.4-1.1 2.6-2.4 3.4l3.3 2.6c2-1.8 3.1-4.5 3.1-8.2z"/>
      <path fill="#FBBC05" d="M4.4 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.6.4-2.4L1 7C.4 8.5 0 10.2 0 12s.4 3.5 1 5l3.4-2.6z"/>
      <path fill="#34A853" d="M12 23c3 0 5.4-1 7.2-2.7L15.8 17.7c-1 .7-2.3 1.1-3.8 1.1-3.6 0-6.7-2.4-7.6-5.7L1 15.7C2.7 19.5 7 23 12 23z"/>
    </svg>
  );
}

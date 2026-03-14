"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Scale, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";

const planCards = [
  {
    id: "pro",
    name: "Pro",
    price: "₹999/month",
    features: ["Unlimited Case Rooms", "AI Analysis", "Draft Generation"],
  },
  {
    id: "ultimate",
    name: "Ultimate",
    price: "₹1,999/month",
    features: ["Everything in Pro", "Priority Processing", "Client Portal + Insights"],
  },
];

function getPasswordStrength(password: string): "weak" | "medium" | "strong" {
  if (password.length < 8) return "weak";
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  if (score >= 3) return "strong";
  if (score >= 2) return "medium";
  return "weak";
}

export default function SignupPage() {
  const router = useRouter();
  const setUser = useAppStore((s) => s.setUser);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const canSubmit =
    fullName.trim().length > 0 &&
    emailValid &&
    password.length >= 8 &&
    passwordsMatch &&
    termsAccepted &&
    !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError("");
    setLoading(true);
    try {
      const user = await api.auth.register(fullName.trim(), email.trim(), password);
      setUser(user);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("signup_name", user.name || fullName.trim());
        sessionStorage.setItem("signup_plan", selectedPlan);
      }
      router.push("/auth/signup/profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-secondary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Scale className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">KanoonEdge</span>
          </Link>

          <div className="max-w-md">
            <h2 className="text-3xl font-display font-bold text-foreground mb-4">
              India&apos;s Most Intelligent AI Legal Co-Pilot
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                AI-powered case analysis and loophole detection
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                Automated document processing for Indian legal workflows
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
                Secure client communication portal with live updates
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xl"
        >
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Scale className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">KanoonEdge</span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">Create your account</h1>
          <p className="text-muted-foreground mb-8">Start your free trial in under 2 minutes.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Full name</label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              {email.length > 0 && !emailValid ? (
                <p className="text-xs text-destructive mt-1">Enter a valid email address.</p>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs mt-1 text-muted-foreground">
                Strength: <span className="font-medium capitalize">{passwordStrength}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Confirm password</label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch ? (
                <p className="text-xs text-destructive mt-1">Passwords do not match.</p>
              ) : null}
            </div>

            <div>
              <p className="block text-sm font-medium text-foreground mb-1.5">Choose your plan</p>
              <div className="grid md:grid-cols-2 gap-3">
                {planCards.map((plan) => {
                  const selected = selectedPlan === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`rounded-lg border p-4 text-left transition-colors ${
                        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-foreground">{plan.name}</p>
                        {selected ? <Badge>Selected</Badge> : null}
                      </div>
                      <p className="text-sm text-primary font-medium mb-2">{plan.price}</p>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {plan.features.map((f) => (
                          <li key={f}>• {f}</li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="mt-1"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <span>I agree to the Terms of Service and Privacy Policy</span>
            </label>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button type="submit" className="w-full h-11" disabled={!canSubmit}>
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary hover:text-accent-hover transition-colors font-medium">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

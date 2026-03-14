"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Scale, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";

const stateBarCouncils = [
  "Bar Council of India",
  "Andhra Pradesh",
  "Assam",
  "Bihar",
  "Delhi",
  "Gujarat",
  "Haryana",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra & Goa",
  "Punjab & Haryana",
  "Rajasthan",
  "Tamil Nadu & Puducherry",
  "Uttar Pradesh",
  "West Bengal",
];

const specializationOptions = [
  "Criminal",
  "Civil",
  "Family",
  "Corporate",
  "Constitutional",
  "Labour",
  "Consumer",
  "IP",
  "Tax",
  "Real Estate",
];

const yearsPracticeOptions = ["0-2", "2-5", "5-10", "10-20", "20+"];
const sourceOptions = ["Google", "LinkedIn", "Colleague", "Bar Association", "Social Media", "Other"];

export default function SignupProfilePage() {
  const router = useRouter();
  const setUser = useAppStore((s) => s.setUser);
  const currentUser = useAppStore((s) => s.user);

  const [barCouncilNumber, setBarCouncilNumber] = useState("");
  const [stateBarCouncil, setStateBarCouncil] = useState("");
  const [enrollmentYear, setEnrollmentYear] = useState("");
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [yearsOfPractice, setYearsOfPractice] = useState("");
  const [officeCity, setOfficeCity] = useState("");
  const [phone, setPhone] = useState("");
  const [heardFrom, setHeardFrom] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear; y >= currentYear - 50; y -= 1) years.push(y);
    return years;
  }, [currentYear]);

  const isValid =
    barCouncilNumber.trim().length > 0 &&
    stateBarCouncil.trim().length > 0 &&
    enrollmentYear.trim().length > 0 &&
    yearsOfPractice.trim().length > 0 &&
    officeCity.trim().length > 0 &&
    phone.trim().length > 0;

  const toggleSpecialization = (item: string) => {
    setSpecializations((prev) => {
      if (prev.includes(item)) return prev.filter((s) => s !== item);
      if (prev.length >= 3) return prev;
      return [...prev, item];
    });
  };

  const handleComplete = async () => {
    if (!isValid || loading) return;
    setError("");
    setLoading(true);
    try {
      const updated = await api.auth.updateProfile({
        bar_council_number: barCouncilNumber,
        state_bar_council: stateBarCouncil,
        enrollment_year: Number(enrollmentYear),
        specializations,
        years_of_practice: yearsOfPractice,
        office_city: officeCity,
        phone,
      });
      setUser(updated);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("signup_name");
        sessionStorage.removeItem("signup_plan");
      }
      window.alert(`Welcome to KanoonEdge, ${updated.name || currentUser?.name || "Advocate"}! Your account is ready.`);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile details.");
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

          <div className="max-w-md space-y-4">
            <h2 className="text-3xl font-display font-bold text-foreground">Professional Profile</h2>
            <p className="text-muted-foreground text-sm">
              Complete your advocate profile to personalize AI recommendations, drafting context, and legal workflows.
            </p>
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
              You can skip now and complete this later from Settings.
            </p>
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

          <h1 className="text-2xl font-bold text-foreground mb-2">Step 2: Professional profile</h1>
          <p className="text-muted-foreground mb-8">Help us tailor KanoonEdge to your legal practice.</p>

          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Bar Council enrollment number</label>
                <Input value={barCouncilNumber} onChange={(e) => setBarCouncilNumber(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">State Bar Council</label>
                <select
                  value={stateBarCouncil}
                  onChange={(e) => setStateBarCouncil(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-secondary px-3 text-sm text-foreground"
                >
                  <option value="">Select</option>
                  {stateBarCouncils.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Year of enrollment</label>
                <select
                  value={enrollmentYear}
                  onChange={(e) => setEnrollmentYear(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-secondary px-3 text-sm text-foreground"
                >
                  <option value="">Select year</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Years of practice</label>
                <select
                  value={yearsOfPractice}
                  onChange={(e) => setYearsOfPractice(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-secondary px-3 text-sm text-foreground"
                >
                  <option value="">Select</option>
                  {yearsPracticeOptions.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Specialization (select up to 3)</label>
              <div className="flex flex-wrap gap-2">
                {specializationOptions.map((item) => {
                  const selected = specializations.includes(item);
                  const disabled = !selected && specializations.length >= 3;
                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleSpecialization(item)}
                      className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${
                        selected ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Office city</label>
                <Input value={officeCity} onChange={(e) => setOfficeCity(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Phone number</label>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">How did you hear about KanoonEdge (optional)</label>
              <select
                value={heardFrom}
                onChange={(e) => setHeardFrom(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-secondary px-3 text-sm text-foreground"
              >
                <option value="">Select</option>
                {sourceOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="text-sm text-primary hover:text-accent-hover"
              >
                Skip for now →
              </button>
              <Button onClick={handleComplete} disabled={!isValid || loading}>
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    Complete Setup
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileSearch,
  Brain,
  Shield,
  ArrowRight,
  Play,
  Check,
  Scale,
  FileText,
  MessageSquare,
  Zap,
  ChevronRight,
  Search,
  AlertTriangle,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LandingNav } from "@/components/layout/landing-nav";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const features = [
  {
    icon: FileSearch,
    title: "Deep Document Analysis",
    description:
      "Upload FIRs, charge sheets, witness statements, and judgments. Our AI extracts every relevant fact and cross-references them automatically.",
  },
  {
    icon: AlertTriangle,
    title: "Loophole Detection",
    description:
      "AI identifies procedural violations, timeline contradictions, missing evidence, and legal gaps the prosecution may have overlooked.",
  },
  {
    icon: Brain,
    title: "AI Legal Arguments",
    description:
      "Get AI-generated legal arguments backed by relevant precedents, statutes, and case law from Indian courts.",
  },
  {
    icon: FileText,
    title: "Draft Generation",
    description:
      "Auto-generate bail applications, written statements, appeals, and legal notices pre-filled with case-specific data.",
  },
  {
    icon: MessageSquare,
    title: "Case Chat Assistant",
    description:
      "Ask questions about your case and receive answers with precise citations — document name, page number, and highlighted text.",
  },
  {
    icon: Shield,
    title: "Court-Ready Output",
    description:
      "Every analysis, draft, and argument is formatted for Indian courts with proper legal citations and formatting standards.",
  },
];

const steps = [
  {
    step: "01",
    title: "Create a Case Room",
    description: "Start by creating a dedicated workspace for your legal case.",
  },
  {
    step: "02",
    title: "Upload Documents",
    description:
      "Upload FIRs, charge sheets, evidence, and any relevant case documents.",
  },
  {
    step: "03",
    title: "AI Analyzes Everything",
    description:
      "Our AI reads every document, extracts facts, and finds legal loopholes.",
  },
  {
    step: "04",
    title: "Build Your Strategy",
    description:
      "Use AI insights to generate drafts, build arguments, and prepare for hearings.",
  },
];

const plans = [
  {
    name: "Pro",
    price: "₹999",
    period: "/month",
    description: "For individual advocates getting started",
    features: [
      "Unlimited Case Rooms",
      "AI-powered case analysis",
      "Secure client portal",
    ],
    cta: "Get Started Free",
    popular: true,
  },
  {
    name: "Ultimate",
    price: "₹1,999",
    period: "/month",
    description: "For high-volume practitioners and growing chambers",
    features: [
      "Everything in Pro",
      "Advanced drafting workflows",
      "Priority support",
      "Extended analysis depth",
      "Team-ready collaboration",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 md:px-8 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />

        <div className="max-w-container mx-auto relative">
          <motion.div
            initial="hidden"
            animate="visible"
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div custom={0} variants={fadeUp}>
              <Badge variant="default" className="mb-6">
                <Zap className="w-3 h-3 mr-1" />
                Now powered by advanced legal AI
              </Badge>
            </motion.div>

            <motion.h1
              custom={1}
              variants={fadeUp}
              className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-foreground leading-tight mb-6"
            >
              {"India's Most Intelligent "}
              <span className="text-gradient">AI Legal Co-Pilot</span>
            </motion.h1>

            <motion.p
              custom={2}
              variants={fadeUp}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            >
              KanoonEdge gives every lawyer an AI that reads every document,
              finds legal loopholes, builds arguments, and helps prepare
              winning cases.
            </motion.p>

            <motion.div
              custom={3}
              variants={fadeUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button size="xl" asChild>
                <Link href="/auth/signup">
                  Get Started Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button size="xl" variant="outline" asChild>
                <Link href="#how-it-works">
                  <Play className="w-4 h-4 mr-2" />
                  Watch How It Works
                </Link>
              </Button>
            </motion.div>
          </motion.div>

          {/* Product preview */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-20 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-2xl shadow-primary/5">
              {/* Mock browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-danger/50" />
                  <div className="w-3 h-3 rounded-full bg-warning/50" />
                  <div className="w-3 h-3 rounded-full bg-success/50" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-card/80 text-muted-foreground text-xs px-4 py-1 rounded-md border border-border">
                    app.kanoonedge.com/case-room/cr-001
                  </div>
                </div>
              </div>
              {/* Mock Case Room */}
              <div className="p-6 bg-background">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      State vs. Rajesh Kumar
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      CR/2024/1847 — Delhi High Court
                    </p>
                  </div>
                  <Badge variant="success">78% Case Strength</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Documents", value: "14", icon: FileText },
                    { label: "Loopholes", value: "7", icon: Search },
                    { label: "Arguments", value: "12", icon: Scale },
                    { label: "Drafts", value: "3", icon: BookOpen },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-card border border-border rounded-lg p-4"
                    >
                      <stat.icon className="w-5 h-5 text-primary mb-2" />
                      <p className="text-2xl font-bold text-foreground">
                        {stat.value}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4 md:px-8">
        <div className="max-w-container mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <motion.h2
              custom={0}
              variants={fadeUp}
              className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4"
            >
              Legal Research Takes Too Long
            </motion.h2>
            <motion.p custom={1} variants={fadeUp} className="text-lg text-muted-foreground">
              Indian lawyers spend 60% of their time on manual document review
              and legal research. Cases are lost not due to weak law, but due
              to missed evidence and overlooked precedents.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                stat: "60%",
                label: "Time spent on document review",
                description: "Lawyers manually read through hundreds of pages for each case",
              },
              {
                stat: "3 in 10",
                label: "Cases have missed arguments",
                description: "Critical legal precedents and loopholes go undetected",
              },
              {
                stat: "12+ hrs",
                label: "Average draft preparation time",
                description: "Writing bail applications and petitions from scratch",
              },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <Card className="text-center p-8">
                  <CardContent className="p-0">
                    <p className="text-4xl font-bold text-primary mb-2">{item.stat}</p>
                    <p className="font-medium text-foreground mb-2">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 md:px-8 bg-secondary/50">
        <div className="max-w-container mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <motion.h2
              custom={0}
              variants={fadeUp}
              className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4"
            >
              Every Tool a Lawyer Needs
            </motion.h2>
            <motion.p custom={1} variants={fadeUp} className="text-lg text-muted-foreground">
              From document analysis to draft generation, KanoonEdge handles
              the heavy lifting so you can focus on strategy.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <Card className="h-full hover:border-primary/30 transition-colors">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 md:px-8">
        <div className="max-w-container mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <motion.h2
              custom={0}
              variants={fadeUp}
              className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4"
            >
              How It Works
            </motion.h2>
            <motion.p custom={1} variants={fadeUp} className="text-lg text-muted-foreground">
              Four simple steps to transform how you practice law.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.step}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="relative"
              >
                <div className="text-6xl font-bold text-primary/10 mb-4">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                {i < steps.length - 1 && (
                  <ChevronRight className="hidden lg:block absolute top-8 -right-4 w-6 h-6 text-border" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 md:px-8 bg-secondary/50">
        <div className="max-w-container mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <motion.h2
              custom={0}
              variants={fadeUp}
              className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4"
            >
              Simple, Transparent Pricing
            </motion.h2>
            <motion.p custom={1} variants={fadeUp} className="text-lg text-muted-foreground">
              Start free. Upgrade when you need more power.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
              >
                <Card
                  className={`h-full relative ${
                    plan.popular ? "border-primary shadow-lg shadow-primary/10" : ""
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge>Most Popular</Badge>
                    </div>
                  )}
                  <CardContent className="p-8">
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {plan.description}
                    </p>
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-foreground">
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span className="text-muted-foreground">{plan.period}</span>
                      )}
                    </div>
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-success shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                      asChild
                    >
                      <Link href="/auth/signup">{plan.cta}</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="law-firms" className="py-20 px-4 md:px-8">
        <div className="max-w-container mx-auto">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
                Ready to Win More Cases?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Join hundreds of Indian lawyers who are already using AI to
                find stronger arguments and prepare better cases.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="xl" asChild>
                  <Link href="/auth/signup">
                    Start Your Free Trial
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button size="xl" variant="outline" asChild>
                  <Link href="/auth/signup">Request Early Access</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4 md:px-8">
        <div className="max-w-container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Scale className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-foreground">KanoonEdge</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                {"India's most intelligent AI legal co-pilot."}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-3">Product</h4>
              <ul className="space-y-2">
                {["Features", "Pricing", "Case Rooms", "API"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-3">Company</h4>
              <ul className="space-y-2">
                {["About", "Blog", "Careers", "Contact"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-3">Legal</h4>
              <ul className="space-y-2">
                {["Privacy Policy", "Terms of Service", "Security"].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} KanoonEdge. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

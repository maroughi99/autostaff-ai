'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Bot, Mail, Calendar, MessageSquare, Zap, CheckCircle, Menu, X } from 'lucide-react';
import Footer from '@/components/Footer';
import HomeRedirect from '@/components/HomeRedirect';
import InteractiveDemo from '@/components/InteractiveDemo';

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <HomeRedirect />
      {/* Header */}
      <header className="border-b sticky top-0 bg-white z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            <span className="text-lg md:text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">AutoStaff AI</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium hover:text-primary">
              Features
            </Link>
            <Link href="#pricing" className="text-sm font-medium hover:text-primary">
              Pricing
            </Link>
            <Link href="/sign-in" className="text-sm font-medium hover:text-primary">
              Sign In
            </Link>
            <Button asChild>
              <Link href="/sign-up">Get Started</Link>
            </Button>
          </nav>
          <div className="md:hidden flex items-center gap-2">
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-3">
              <Link 
                href="#features" 
                className="text-sm font-medium hover:text-primary py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link 
                href="#pricing" 
                className="text-sm font-medium hover:text-primary py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link 
                href="/sign-in" 
                className="text-sm font-medium hover:text-primary py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
              <Button asChild className="w-full">
                <Link href="/sign-up">Get Started</Link>
              </Button>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="py-12 md:py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 md:mb-6">
              Your <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">AI Employee</span> That Never Sleeps
            </h1>
            <p className="text-base md:text-xl text-muted-foreground mb-6 md:mb-8">
              AutoStaff AI handles your emails, books appointments, and manages leads 24/7 - so you can focus on growing your business.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link href="/sign-up">Start Free Trial</Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                <Link href="#demo">Watch Demo</Link>
              </Button>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-4">
              7-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section id="demo" className="py-12 md:py-20 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
              See <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">AutoStaff AI</span> in Action
            </h2>
            <p className="text-base md:text-xl text-muted-foreground">
              Watch how AI handles a complete customer journey - from first email to booked appointment
            </p>
          </div>
          <InteractiveDemo />
          <div className="text-center mt-8">
            <Button size="lg" asChild>
              <Link href="/sign-up">Start Your Free Trial</Link>
            </Button>
            <p className="text-sm text-muted-foreground mt-3">
              No credit card required • 7-day free trial
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 md:py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4"><span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Everything</span> You Need</h2>
            <p className="text-base md:text-xl text-muted-foreground">
              One AI employee handling all your customer communication
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            <FeatureCard
              icon={<Mail className="h-8 w-8 md:h-12 md:w-12 text-primary" />}
              title="AI Inbox Agent"
              description="Automatically reads emails, classifies messages, and generates human-like responses instantly."
            />
            <FeatureCard
              icon={<MessageSquare className="h-8 w-8 md:h-12 md:w-12 text-primary" />}
              title="Lead Handler"
              description="Qualifies leads by asking questions, collecting information, and routing to your pipeline."
            />
            <FeatureCard
              icon={<Calendar className="h-8 w-8 md:h-12 md:w-12 text-primary" />}
              title="Smart Scheduling"
              description="Books appointments automatically based on your availability. Syncs with Google Calendar."
            />
            <FeatureCard
              icon={<Zap className="h-8 w-8 md:h-12 md:w-12 text-primary" />}
              title="Quote Generator"
              description="Creates professional quotes using AI and your pricing templates. Exports to PDF."
            />
            <FeatureCard
              icon={<CheckCircle className="h-8 w-8 md:h-12 md:w-12 text-primary" />}
              title="Follow-Up Automation"
              description="Never lose a lead. Automatic follow-ups based on customer behavior and pipeline stage."
            />
            <FeatureCard
              icon={<Bot className="h-8 w-8 md:h-12 md:w-12 text-primary" />}
              title="Visual CRM"
              description="Drag-and-drop pipeline. See every lead from first contact to completed job."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">Simple, <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">Transparent</span> Pricing</h2>
            <p className="text-base md:text-xl text-muted-foreground">
              Choose the plan that fits your business
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            <PricingCard
              name="Starter"
              price="$49"
              description="Perfect for small contractors"
              features={[
                'AI Email Responses',
                'Lead Management',
                'Quote Generator',
                '500 messages/month',
                'Email support',
              ]}
            />
            <PricingCard
              name="Pro"
              price="$149"
              description="For growing businesses"
              features={[
                'Everything in Starter',
                'Calendar Integration',
                'Automated Follow-ups',
                '2,000 messages/month',
                'SMS notifications',
                'Priority support',
              ]}
              featured
            />
            <PricingCard
              name="Ultimate"
              price="$399"
              description="Multi-location & enterprise"
              features={[
                'Everything in Pro',
                'Phone AI Agent',
                'Multi-location support',
                'Unlimited messages',
                'Custom integrations',
                'Dedicated support',
              ]}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Your <span className="bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">AI Employee</span>?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join hundreds of contractors saving 20+ hours per week
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/sign-up">Start Free Trial</Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-card p-4 md:p-6 rounded-lg border">
      <div className="mb-3 md:mb-4">{icon}</div>
      <h3 className="text-lg md:text-xl font-semibold mb-2">{title}</h3>
      <p className="text-sm md:text-base text-muted-foreground">{description}</p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  description,
  features,
  featured = false,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  featured?: boolean;
}) {
  return (
    <div
      className={`bg-card p-6 md:p-8 rounded-lg border ${
        featured ? 'ring-2 ring-primary relative' : ''
      }`}
    >
      {featured && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 md:px-4 py-1 rounded-full text-xs md:text-sm font-medium whitespace-nowrap">
          Most Popular
        </div>
      )}
      <h3 className="text-xl md:text-2xl font-bold mb-2">{name}</h3>
      <div className="mb-4">
        <span className="text-3xl md:text-4xl font-bold">{price}</span>
        <span className="text-sm md:text-base text-muted-foreground">/month</span>
      </div>
      <p className="text-sm md:text-base text-muted-foreground mb-6">{description}</p>
      <Button className="w-full mb-6" variant={featured ? 'default' : 'outline'} asChild>
        <Link href="/pricing">Start Free Trial</Link>
      </Button>
      <ul className="space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0 mt-0.5" />
            <span className="text-xs md:text-sm">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

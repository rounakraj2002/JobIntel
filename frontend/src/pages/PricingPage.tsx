import { Link, useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import SubscribeForm from '@/components/SubscribeForm';
import { Badge } from '@/components/ui/badge';
import {
  Check,
  Zap,
  Crown,
  Star,
  Bell,
  Bot,
  Rocket,
  Shield,
  MessageCircle,
  Mail,
  Send,
  ArrowRight,
} from 'lucide-react';

const PricingPage = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).Razorpay) {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  const handleBuy = async (planId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const resp = await fetch('/api/payments/create-order', { method: 'POST', headers, body: JSON.stringify({ planId }) });
      if (!resp.ok) throw new Error(await resp.text());
      const json = await resp.json();
      const { order, key } = json;

      const options: any = {
        key,
        amount: order.amount,
        order_id: order.id,
        currency: order.currency || 'INR',
        name: 'JobIntel Premium',
        description: 'Yearly Premium',
        handler: async function (response: any) {
          try {
            const vresp = await fetch('/api/payments/verify', { method: 'POST', headers, body: JSON.stringify(response) });
            if (!vresp.ok) throw new Error(await vresp.text());
            toast({ title: 'Payment successful', variant: 'default' });
            window.location.reload();
          } catch (e) {
            toast({ title: 'Verification failed', description: String(e), variant: 'destructive' });
          }
        },
        prefill: {},
        theme: { color: '#3b82f6' },
      };

      // @ts-ignore
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Buy failed', err);
      toast({ title: 'Purchase failed', description: String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  const plans = [
    {
      name: 'Free',
      price: '₹0',
      period: 'forever',
      description: 'Perfect for browsing jobs',
      badge: null,
      buttonVariant: 'outline' as const,
      buttonText: 'Get Started',
      features: [
        { text: 'Browse all public jobs', included: true },
        { text: 'Basic job filters', included: true },
        { text: 'Company profiles', included: true },
        { text: 'SEO-friendly job pages', included: true },
        { text: 'Personalized job matching', included: false },
        { text: 'Multi-channel notifications', included: false },
        { text: 'Auto-apply feature', included: false },
        { text: 'AI cover letter generation', included: false },
      ],
      highlight: false,
    },
    {
      name: 'Premium',
      price: '₹99',
      period: 'per year',
      description: 'Yearly Premium — best for committed job seekers',
      badge: { text: 'Most Popular', variant: 'premium' as const },
      buttonVariant: 'premium' as const,
      buttonText: 'Start Free Trial',
      features: [
        { text: 'Everything in Free', included: true },
        { text: 'No ads experience', included: true },
        { text: 'AI-powered job matching', included: true },
        { text: 'Early access to new jobs', included: true },
        { text: 'WhatsApp notifications', included: true },
        { text: 'Email notifications', included: true },
        { text: 'Telegram notifications', included: true },
        { text: 'Job bookmarking', included: true },
        { text: 'Application tracking', included: true },
        { text: 'Auto-apply feature', included: false },
        { text: 'AI cover letter generation', included: false },
      ],
      highlight: true,
    },

  ];

  const faqs = [
    {
      question: 'Can I cancel anytime?',
      answer: 'Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.',
    },
    {
      question: 'Is there a free trial?',
      answer: 'Yes! Premium plans come with a 7-day free trial. No credit card required to start.',
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards, debit cards, UPI, and net banking for Indian users.',
    },
    {
      question: 'How does auto-apply work?',
      answer: 'With your explicit consent, our AI applies to matching jobs on your behalf, using your selected resume and generating personalized cover letters.',
    },
    {
      question: 'Are notification channels configurable?',
      answer: 'Yes, you can choose which notifications you want to receive and on which channels (WhatsApp, Email, Telegram).',
    },
  ];

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4">
            <Crown className="h-3 w-3 mr-1" />
            Pricing Plans
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Choose Your Path to
            <br />
            <span className="text-gradient-hero">Career Success</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From free browsing to AI-powered automation. Pick the plan that fits your job search intensity.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-6 border animate-fade-in ${
                  plan.highlight
                    ? 'bg-card border-primary shadow-glow scale-105'
                    : 'bg-card border-border'
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {plan.badge && (
                  <Badge
                    variant={plan.badge.variant}
                    className="absolute -top-3 left-1/2 -translate-x-1/2"
                  >
                    {plan.badge.text}
                  </Badge>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                {/* Premium should start checkout; other plans go to register */}
                {plan.name === 'Premium' ? (
                  <Button variant={plan.buttonVariant} className="w-full mb-6" onClick={() => handleBuy('premium')} disabled={loading}>
                    {plan.buttonText}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Link to="/register">
                    <Button variant={plan.buttonVariant} className="w-full mb-6">
                      {plan.buttonText}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                )}

                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li
                      key={i}
                      className={`flex items-start gap-2 text-sm ${
                        feature.included ? '' : 'text-muted-foreground/50'
                      }`}
                    >
                      <Check
                        className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                          feature.included ? 'text-success' : 'text-muted-foreground/30'
                        }`}
                      />
                      {feature.text}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="max-w-5xl mx-auto mt-8">
            <div className="bg-card rounded-xl p-6 border border-border">
              <h3 className="text-lg font-semibold mb-3">Stay Updated</h3>
              <p className="text-sm text-muted-foreground mb-4">Subscribe to product updates and release notes.</p>
              <SubscribeForm />
            </div>
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What You Get</h2>
            <p className="text-muted-foreground">
              Powerful features to supercharge your job search
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg gradient-hero mb-4">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">AI Job Matching</h3>
              <p className="text-sm text-muted-foreground">
                Our AI analyzes your profile and matches you with the most relevant opportunities with confidence scores.
              </p>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg gradient-hero mb-4">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Multi-Channel Alerts</h3>
              <p className="text-sm text-muted-foreground">
                Get notified instantly via WhatsApp, Email, or Telegram when matching jobs are posted.
              </p>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg gradient-hero mb-4">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Early Access</h3>
              <p className="text-sm text-muted-foreground">
                Premium users get jobs before they go viral, giving you a competitive edge.
              </p>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg gradient-premium mb-4">
                <Rocket className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Auto-Apply</h3>
              <p className="text-sm text-muted-foreground">
                Let our AI apply to jobs on your behalf with personalized cover letters. Ultra Premium only.
              </p>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg gradient-premium mb-4">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Verified Referrals</h3>
              <p className="text-sm text-muted-foreground">
                Connect with verified employees at top companies for genuine referral opportunities.
              </p>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg gradient-ultra mb-4">
                <Star className="h-6 w-6 text-black" />
              </div>
              <h3 className="font-semibold mb-2">Success Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Track your application success rate with detailed analytics dashboard. Ultra Premium only.
              </p>
            </div>
          </div>

          {/* Notification Channels */}
          <div className="mt-12 text-center">
            <p className="text-muted-foreground mb-4">Notifications available on:</p>
            <div className="flex justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                </div>
                <span className="font-medium">WhatsApp</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <span className="font-medium">Email</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                  <Send className="h-5 w-5 text-sky-600" />
                </div>
                <span className="font-medium">Telegram</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
          </div>

          <div className="max-w-2xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-card rounded-xl p-6 border border-border"
              >
                <h3 className="font-semibold mb-2">{faq.question}</h3>
                <p className="text-muted-foreground text-sm">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Accelerate Your Job Search?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of job seekers who are landing interviews faster with JobIntel.
          </p>
          <Link to="/register">
            <Button variant="hero" size="xl">
              Start Your Free Trial
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;

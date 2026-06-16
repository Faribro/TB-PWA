'use client';

import { Button } from '@/components/ui/button';
import PremiumButton from '@/components/ui/PremiumButton';
import { Download, Send, Trash2, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';

export default function ButtonShowcase() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-16">
        
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-white tracking-tight">
            SAMADHAAN Premium Buttons
          </h1>
          <p className="text-xl text-slate-400">
            Award-winning button system with 3D pressed effects & blob animations
          </p>
        </div>

        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-white">Standard Buttons (Upgraded)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="space-y-4 p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
              <h3 className="text-lg font-semibold text-white">Default (Emerald)</h3>
              <Button variant="default" size="sm">Small Button</Button>
              <Button variant="default">Default Button</Button>
              <Button variant="default" size="lg">Large Button</Button>
              <Button variant="default" disabled>Disabled</Button>
            </div>

            <div className="space-y-4 p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
              <h3 className="text-lg font-semibold text-white">Success (Green)</h3>
              <Button variant="success" size="sm">
                <CheckCircle className="w-4 h-4" />
                Small
              </Button>
              <Button variant="success">Success Action</Button>
              <Button variant="success" size="lg">Large Success</Button>
            </div>

            <div className="space-y-4 p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
              <h3 className="text-lg font-semibold text-white">Destructive (Rose)</h3>
              <Button variant="destructive" size="sm">
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
              <Button variant="destructive">Remove Item</Button>
              <Button variant="destructive" size="lg">Permanent Delete</Button>
            </div>

            <div className="space-y-4 p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
              <h3 className="text-lg font-semibold text-white">Warning (Amber)</h3>
              <Button variant="warning" size="sm">
                <AlertTriangle className="w-4 h-4" />
                Alert
              </Button>
              <Button variant="warning">Warning Action</Button>
              <Button variant="warning" size="lg">Critical Warning</Button>
            </div>

            <div className="space-y-4 p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
              <h3 className="text-lg font-semibold text-white">Outline</h3>
              <Button variant="outline" size="sm">Small Outline</Button>
              <Button variant="outline">Outline Button</Button>
              <Button variant="outline" size="lg">Large Outline</Button>
            </div>

            <div className="space-y-4 p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
              <h3 className="text-lg font-semibold text-white">Ghost</h3>
              <Button variant="ghost" size="sm">Small Ghost</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="ghost" size="lg">Large Ghost</Button>
            </div>

            <div className="space-y-4 p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
              <h3 className="text-lg font-semibold text-white">Neutral (Slate)</h3>
              <Button variant="neutral" size="sm">Small Neutral</Button>
              <Button variant="neutral">Neutral Button</Button>
              <Button variant="neutral" size="lg">Large Neutral</Button>
            </div>

            <div className="space-y-4 p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
              <h3 className="text-lg font-semibold text-white">Glass</h3>
              <Button variant="glass" size="sm">Small Glass</Button>
              <Button variant="glass">Glass Button</Button>
              <Button variant="glass" size="lg">Large Glass</Button>
            </div>

          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-white">Premium Buttons (New)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="space-y-4 p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
              <h3 className="text-lg font-semibold text-white">Primary (Emerald)</h3>
              <PremiumButton variant="primary" size="sm">Small Primary</PremiumButton>
              <PremiumButton variant="primary">Primary Action</PremiumButton>
              <PremiumButton variant="primary" size="lg">Large Primary</PremiumButton>
            </div>

            <div className="space-y-4 p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
              <h3 className="text-lg font-semibold text-white">Secondary (Cyan)</h3>
              <PremiumButton variant="secondary" size="sm">
                <Send className="w-4 h-4" />
                Send
              </PremiumButton>
              <PremiumButton variant="secondary">Secondary Action</PremiumButton>
              <PremiumButton variant="secondary" size="lg">Large Secondary</PremiumButton>
            </div>

            <div className="space-y-4 p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
              <h3 className="text-lg font-semibold text-white">Institutional (Gold)</h3>
              <PremiumButton variant="institutional" size="sm">Small Gold</PremiumButton>
              <PremiumButton variant="institutional">
                <Sparkles className="w-5 h-5" />
                Premium Action
              </PremiumButton>
              <PremiumButton variant="institutional" size="lg">Large Gold</PremiumButton>
            </div>

            <div className="space-y-4 p-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
              <h3 className="text-lg font-semibold text-white">Blob (Animated)</h3>
              <PremiumButton variant="blob" size="sm">Hover Me</PremiumButton>
              <PremiumButton variant="blob">Blob Button</PremiumButton>
              <PremiumButton variant="blob" size="lg">Large Blob</PremiumButton>
            </div>

          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-white">With Icons</h2>
          <div className="flex flex-wrap gap-4">
            <Button variant="default">
              <Download className="w-4 h-4" />
              Download Report
            </Button>
            <Button variant="success">
              <CheckCircle className="w-4 h-4" />
              Approve
            </Button>
            <Button variant="destructive">
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
            <PremiumButton variant="primary" leftIcon={<Send className="w-5 h-5" />}>
              Send Message
            </PremiumButton>
            <PremiumButton variant="institutional" rightIcon={<Sparkles className="w-5 h-5" />}>
              Premium Feature
            </PremiumButton>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-3xl font-bold text-white">Loading States</h2>
          <div className="flex flex-wrap gap-4">
            <PremiumButton variant="primary" isLoading>Processing...</PremiumButton>
            <PremiumButton variant="secondary" isLoading>Saving...</PremiumButton>
            <PremiumButton variant="success" isLoading>Uploading...</PremiumButton>
          </div>
        </section>

      </div>
    </div>
  );
}

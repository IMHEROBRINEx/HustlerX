'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Target, Sparkles, Upload, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const router = useRouter();

  const features = [
    {
      icon: Upload,
      title: 'Upload LinkedIn Export',
      description: 'Simply upload your LinkedIn data export ZIP file',
    },
    {
      icon: BarChart3,
      title: 'Analyze Your Metrics',
      description: 'See your connections, engagement, and activity breakdown',
    },
    {
      icon: Target,
      title: 'Get Actionable Goals',
      description: 'AI generates 4 personalized goals based on your data',
    },
    {
      icon: Sparkles,
      title: 'AI-Powered Research',
      description: 'EXA AI finds relevant content to help you succeed',
    },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">LinkedIn AI Insights</span>
          </div>
          <Button onClick={() => router.push('/dashboard')}>
            Go to Dashboard
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </header>

      <main>
        <section className="py-20 px-4">
          <div className="container mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Unlock Your LinkedIn Potential
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Upload your LinkedIn data export and get AI-powered insights, actionable goals,
              and personalized research to grow your professional presence.
            </p>
            <Button size="lg" onClick={() => router.push('/dashboard')}>
              Get Started
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </section>

        <section className="py-16 px-4 bg-muted/50">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="text-center">
                  <CardHeader>
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="container mx-auto max-w-3xl">
            <Card>
              <CardHeader>
                <CardTitle>What Your LinkedIn Export Contains</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  When you download your LinkedIn data, you get a ZIP file containing:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Connections.csv - Your network of connections</li>
                  <li>Messages.csv - Your direct messages and conversations</li>
                  <li>Jobs.csv - Jobs you&apos;ve applied to</li>
                  <li>Invitations.csv - Connection requests sent and received</li>
                  <li>Activities.csv - Your likes, comments, and posts</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>LinkedIn AI Insights - Powered by Gemini & EXA AI</p>
        </div>
      </footer>
    </div>
  );
}

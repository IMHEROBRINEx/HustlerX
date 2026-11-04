'use client';

import * as React from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Analysis } from '@/types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  insights?: string[];
  actionableTips?: string[];
}

interface ChatWidgetProps {
  analysis: Analysis;
}

export function ChatWidget({ analysis }: ChatWidgetProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your LinkedIn data analyst assistant. Ask me anything about your LinkedIn profile, connections, or get insights that go beyond the basic metrics. For example:\n\n- Which industries have the most connections?\n- Who should I reach out to for job opportunities?\n- How can I improve my engagement rate?\n- What patterns exist in my network?",
    },
  ]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const buildContext = () => {
    const m = analysis.metrics;
    const goals = analysis.goals || [];
    const classifiedConnections = analysis.classifiedConnections || [];

    const useful = classifiedConnections.filter((c) => c.classification === 'useful').length;
    const maybeUseful = classifiedConnections.filter((c) => c.classification === 'maybe_useful').length;

    return `
=== METRICS ===
- Total Connections: ${m.connections}
- Messages Sent: ${m.messagesSent}
- Messages Received: ${m.messagesReceived}
- Jobs Applied: ${m.jobsApplied}
- Likes Given: ${m.likesGiven}
- Comments Made: ${m.commentsMade}
- Shares: ${m.shares}
- Connection Requests Received: ${m.connectionRequestsReceived}

=== GOALS ===
${goals.map((g) => `- ${g.title}: ${g.description}`).join('\n')}

=== DATASET ROW COUNTS ===
- Connections: ${(analysis.rawConnections || []).length}
- Messages: ${(analysis.rawMessages || []).length}
- Invitations: ${(analysis.rawInvitations || []).length}
- Skills: ${(analysis.rawSkills || []).length}
- Positions: ${(analysis.rawPositions || []).length}
- Jobs: ${(analysis.rawJobs || []).length}
- Activities: ${(analysis.rawActivities || []).length}
- Comments: ${(analysis.rawComments || []).length}
- Member Follows: ${(analysis.rawMemberFollows || []).length}
- Company Follows: ${(analysis.rawCompanyFollows || []).length}

=== CLASSIFIED CONNECTIONS (${classifiedConnections.length} total) ===
Useful (${useful}): ${classifiedConnections
  .filter((c) => c.classification === 'useful')
  .map((c) => `${c.firstName} ${c.lastName} (${c.title} at ${c.company})`)
  .join('; ')}
Maybe Useful (${maybeUseful}): ${classifiedConnections
  .filter((c) => c.classification === 'maybe_useful')
  .map((c) => `${c.firstName} ${c.lastName} (${c.title} at ${c.company})`)
  .join('; ')}
    `.trim();
  };

  const buildDatasets = () => ({
    connections: analysis.rawConnections || [],
    messages: analysis.rawMessages || [],
    invitations: analysis.rawInvitations || [],
    skills: analysis.rawSkills || [],
    positions: analysis.rawPositions || [],
    jobs: analysis.rawJobs || [],
    activities: analysis.rawActivities || [],
    comments: analysis.rawComments || [],
    memberFollows: analysis.rawMemberFollows || [],
    companyFollows: analysis.rawCompanyFollows || [],
  });

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: buildContext(),
          datasets: buildDatasets(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.answer || data.response || 'I analyzed your data and found some insights!',
            insights: data.insights || [],
            actionableTips: data.actionableTips || [],
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-6 border-ember/20 bg-hearth-ash/80 text-parchment">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="flex items-center gap-2 text-parchment">
          <Bot className="w-5 h-5 text-ember" />
          Ask Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 h-96 flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-obsidian/45 border border-ember/20 rounded-lg">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-ember/15 border border-ember/25 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-ember" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-ember text-on-primary'
                      : 'bg-hearth-ash text-parchment border border-white/10'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                  {msg.insights && msg.insights.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs font-semibold mb-1">Key Insights:</p>
                      <ul className="text-xs space-y-1">
                        {msg.insights.map((insight, i) => (
                          <li key={i}>• {insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {msg.actionableTips && msg.actionableTips.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <p className="text-xs font-semibold mb-1">Actionable Tips:</p>
                      <ul className="text-xs space-y-1">
                        {msg.actionableTips.map((tip, i) => (
                          <li key={i}>✓ {tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-ember flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-on-primary" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-ember/15 border border-ember/25 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-ember" />
                </div>
                <div className="bg-hearth-ash text-parchment p-3 rounded-lg border border-white/10">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Ask about your LinkedIn data..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={isLoading}
              className="border-ember/25 bg-obsidian/70 text-parchment placeholder:text-parchment/45 focus-visible:ring-ember/50"
            />
            <Button onClick={handleSend} disabled={isLoading || !input.trim()} className="bg-ember text-on-primary hover:bg-ember/90">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


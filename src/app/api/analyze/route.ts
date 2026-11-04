import { NextRequest, NextResponse } from 'next/server';
import { generateGoalsAndClassifyConnections } from '@/lib/gemini';
import { exaSearch } from '@/lib/exa';
import { parseAllCSVs } from '@/lib/csv-parser';
import { extractMetrics } from '@/lib/metrics-extractor';
import { LinkedInMetrics, Goal, Analysis } from '@/types';
import { getAuthenticatedUser } from '@/lib/auth-user';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    const csvContents: Record<string, string> = {};
    for (const file of files) {
      const content = await file.text();
      csvContents[file.name] = content;
    }

    const parsed = await parseAllCSVs(csvContents);
    console.log('Parsed CSV keys:', Object.keys(parsed));
    console.log('Connections data:', parsed.connections?.data?.length, 'headers:', parsed.connections?.headers);
    console.log('Messages data:', parsed.messages?.data?.length, 'headers:', parsed.messages?.headers);
    console.log('Jobs data:', parsed.jobs?.data?.length, 'headers:', parsed.jobs?.headers);
    console.log('Activities data:', parsed.activities?.data?.length, 'headers:', parsed.activities?.headers);
    console.log('Invitations data:', parsed.invitations?.data?.length, 'headers:', parsed.invitations?.headers);
    
    const { metrics, timeline, summary } = extractMetrics({
      connections: parsed.connections?.data || [],
      messages: parsed.messages?.data || [],
      jobs: parsed.jobs?.data || [],
      activities: parsed.activities?.data || [],
      invitations: parsed.invitations?.data || [],
    });

    console.log('Extracted metrics:', metrics);

    const connectionsData = parsed.connections?.data || [];
    const skillsData = parsed['skills']?.data || [];
    const positionsData = parsed['positions']?.data || [];
    const jobsData = parsed['jobs']?.data || [];
    const activitiesData = parsed['activities']?.data || [];
    const profileData = parsed['profile']?.data || [];
    const invitationsData = parsed['invitations']?.data || [];
    const messagesData = parsed['messages']?.data || [];
    const commentsData = parsed['comments']?.data || [];
    const memberFollowsData = parsed['member_follows']?.data || [];
    const companyFollowsData = parsed['company_follows']?.data || [];
    const instantRepostsData = parsed['instant_reposts']?.data || [];

    const { goals, classifiedConnections } = await generateGoalsAndClassifyConnections({
      connections: connectionsData,
      skills: skillsData,
      positions: positionsData,
      profile: profileData,
      invitations: invitationsData,
      messages: messagesData,
      comments: commentsData,
      memberFollows: memberFollowsData,
      companyFollows: companyFollowsData,
      instantReposts: instantRepostsData,
      metrics,
    });

    const analysis: Analysis = {
      id: crypto.randomUUID(),
      filename: 'LinkedIn Export',
      status: 'completed',
      metrics,
      timeline,
      summary,
      goals,
      classifiedConnections,
      rawConnections: connectionsData,
      rawSkills: skillsData,
      rawPositions: positionsData,
      rawJobs: jobsData,
      rawActivities: activitiesData,
      rawInvitations: invitationsData,
      rawMessages: messagesData,
      rawComments: commentsData,
      rawMemberFollows: memberFollowsData,
      rawCompanyFollows: companyFollowsData,
      exaResults: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { success: false, error: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

async function extractMetricsWithLLM(csvContent: string): Promise<LinkedInMetrics> {
  const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
  const API_KEY = process.env.OPENROUTER_API_KEY;
  
  const prompt = `You are a LinkedIn data analyst. Analyze the following CSV data from LinkedIn exports and count the metrics below.

CSV Data:
${csvContent.substring(0, 50000)}

Return a JSON object with EXACTLY these fields (all numbers):
{
  "connections": <count of connections/connections exported>,
  "messagesSent": <count of messages sent by you>,
  "messagesReceived": <count of messages received by you>,
  "jobsApplied": <count of job applications>,
  "likesGiven": <count of likes/thumb reactions given>,
  "commentsMade": <count of comments made>,
  "shares": <count of shares/reposts>,
  "connectionRequestsSent": <count of connection requests sent>,
  "connectionRequestsReceived": <count of connection requests received>
}

Only count rows where the user performed the action. Look for keywords like "sent", "you", "from you" to identify user's own actions.
Return ONLY valid JSON, no explanation.`;

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'LinkedIn Insights',
    },
    body: JSON.stringify({
      model: 'minimax/minimax-m2.5:free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  console.log('LLM Response status:', response.status);
  if (!response.ok) {
    const err = await response.text();
    console.log('LLM Error response:', err);
    throw new Error(`LLM API error: ${err}`);
  }

  const data = await response.json();
  console.log('LLM Raw Data:', JSON.stringify(data).substring(0, 500));
  const responseText = data.choices?.[0]?.message?.content || '';
  
  console.log('LLM Response:', responseText);

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    console.log('JSON Match:', jsonMatch ? jsonMatch[0] : 'none');
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('Parsed:', parsed);
      return {
        connections: parsed.connections || 0,
        messagesSent: parsed.messagesSent || 0,
        messagesReceived: parsed.messagesReceived || 0,
        jobsApplied: parsed.jobsApplied || 0,
        likesGiven: parsed.likesGiven || 0,
        commentsMade: parsed.commentsMade || 0,
        shares: parsed.shares || 0,
        connectionRequestsSent: parsed.connectionRequestsSent || 0,
        connectionRequestsReceived: parsed.connectionRequestsReceived || 0,
        postsCreated: parsed.postsCreated || 0,
      };
    }
  } catch (e) {
    console.error('Failed to parse LLM response:', e);
  }

  return {
    connections: 0,
    messagesSent: 0,
    messagesReceived: 0,
    jobsApplied: 0,
    likesGiven: 0,
    commentsMade: 0,
    shares: 0,
    connectionRequestsSent: 0,
    connectionRequestsReceived: 0,
    postsCreated: 0,
  };
}

async function generateGoalsFromMetrics(metrics: LinkedInMetrics): Promise<Goal[]> {
  const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
  const API_KEY = process.env.OPENROUTER_API_KEY;
  
  const prompt = `Based on these LinkedIn metrics, generate 4 actionable goals. For each goal, include a search query that the user can click to learn more.

Metrics:
- Connections: ${metrics.connections}
- Messages Sent: ${metrics.messagesSent}
- Messages Received: ${metrics.messagesReceived}
- Jobs Applied: ${metrics.jobsApplied}
- Likes Given: ${metrics.likesGiven}
- Comments Made: ${metrics.commentsMade}
- Shares: ${metrics.shares}
- Connection Requests Sent: ${metrics.connectionRequestsSent}
- Connection Requests Received: ${metrics.connectionRequestsReceived}

Return a JSON array with exactly 4 goals, each having:
{
  "id": "1",
  "title": "goal title",
  "description": "specific action steps",
  "searchQuery": "complex search query for learning more about this goal"
}

Make each goal specific and actionable. The searchQuery should be a detailed query that would help the user learn more about achieving that goal.
Return ONLY valid JSON, no explanation.`;

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'LinkedIn Insights',
    },
    body: JSON.stringify({
      model: 'minimax/minimax-m2.5:free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API error: ${await response.text()}`);
  }

  const data = await response.json();
  const responseText = data.choices?.[0]?.message?.content || '';

  try {
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((item: Record<string, string>, index: number) => ({
        id: item.id || String(index + 1),
        title: item.title || 'Untitled Goal',
        description: item.description || '',
        searchQuery: item.searchQuery || '',
      }));
    }
  } catch (e) {
    console.error('Failed to parse goals:', e);
  }

  return [
    { id: '1', title: 'Increase Connections', description: 'Send more connection requests to grow your network', searchQuery: 'how to get more LinkedIn connections 2024 best practices' },
    { id: '2', title: 'Boost Engagement', description: 'Like and comment on more posts to increase visibility', searchQuery: 'LinkedIn engagement strategies algorithm tips 2024' },
    { id: '3', title: 'Apply to More Jobs', description: 'Increase your job application volume', searchQuery: 'LinkedIn job search tips getting more responses' },
    { id: '4', title: 'Optimize Profile', description: 'Update your profile to attract more opportunities', searchQuery: 'LinkedIn profile optimization tips recruiters' },
  ];
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json({ success: false, error: 'No query provided' }, { status: 400 });
    }

    const results = await exaSearch(query, 10);
    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

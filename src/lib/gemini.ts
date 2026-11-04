import { Goal, LinkedInMetrics, ClassifiedConnection } from '@/types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_ANALYSIS_MODEL || 'google/gemma-2-9b-it';
const REQUEST_ORIGIN =
  process.env.ORIGIN ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'http://localhost:3000';
const MAX_CONNECTION_ROWS_IN_PROMPT = 40;
const MAX_GENERIC_ROWS_IN_PROMPT = 20;
const MAX_MESSAGE_ROWS_IN_PROMPT = 15;
const MAX_GOALS_CLASSIFICATION_OUTPUT_TOKENS = 1400;

interface CSVDataMap {
  connections: Record<string, unknown>[];
  skills: Record<string, unknown>[];
  positions: Record<string, unknown>[];
  profile: Record<string, unknown>[];
  invitations: Record<string, unknown>[];
  messages: Record<string, unknown>[];
  comments: Record<string, unknown>[];
  memberFollows: Record<string, unknown>[];
  companyFollows: Record<string, unknown>[];
  instantReposts: Record<string, unknown>[];
}

interface GoalsAndClassificationInput extends CSVDataMap {
  metrics: LinkedInMetrics;
}

export async function generateGoalsAndClassifyConnections(
  data: GoalsAndClassificationInput
): Promise<{ goals: Goal[]; classifiedConnections: ClassifiedConnection[] }> {
  
  const skillsData = extractFullData(data.skills, ['Name', 'name', 'Skill']);
  const positionsData = extractFullData(data.positions, ['Title', 'title', 'Position', 'Company Name', 'company_name', 'Start Date', 'start_date']);
  const profileFullData = extractProfileFullData(data.profile);
  const connectionsData = extractAllConnections(data.connections);
  const invitationsData = extractFullData(data.invitations, ['From', 'from', 'To', 'to', 'Direction', 'direction']);
  const messagesData = extractMessagesSummary(data.messages);
  const commentsData = extractFullData(data.comments, ['Post URL', 'post_url', 'Comment Text', 'comment_text', 'Date', 'date']);
  const memberFollowsData = extractFullData(data.memberFollows, ['Member Name', 'member_name', 'Date', 'date']);
  const companyFollowsData = extractFullData(data.companyFollows, ['Company Name', 'company_name', 'Date', 'date']);
  const instantRepostsData = extractFullData(data.instantReposts, ['Original Post', 'original_post', 'Date', 'date']);
  
  const prompt = `You are a LinkedIn growth expert, career strategist, and network analyzer. Your job is to:
1. Classify each connection as "useful" (green) or "maybe_useful" (orange) based on relevance to the user's career profile.
2. Use the provided sampled rows carefully when assigning classification and reason.

FULL CSV DATA:

=== CONNECTIONS (${data.connections.length} total) ===
${connectionsData}

=== SKILLS (${data.skills.length} total) ===
${skillsData}

=== POSITIONS (${data.positions.length} total) ===
${positionsData}

=== PROFILE ===
${profileFullData}

=== INVITATIONS (${data.invitations.length} total) ===
${invitationsData}

=== MESSAGES ===
${messagesData}

=== COMMENTS (${data.comments.length} total) ===
${commentsData}

=== MEMBER FOLLOWS (${data.memberFollows.length} total) ===
${memberFollowsData}

=== COMPANY FOLLOWS (${data.companyFollows.length} total) ===
${companyFollowsData}

=== INSTANT REPOSTS (${data.instantReposts.length} total) ===
${instantRepostsData}

=== METRICS ===
- Messages Sent: ${data.metrics.messagesSent}
- Messages Received: ${data.metrics.messagesReceived}
- Jobs Applied: ${data.metrics.jobsApplied}
- Likes Given: ${data.metrics.likesGiven}
- Comments Made: ${data.metrics.commentsMade}
- Shares: ${data.metrics.shares}
- Connection Requests Received: ${data.metrics.connectionRequestsReceived}

Return a JSON object with exactly this structure:
{
  "classifiedConnections": [
    { "firstName": "name", "lastName": "name", "email": "email", "profileUrl": "https://www.linkedin.com/in/...", "connectedOn": "date", "company": "company", "title": "title", "classification": "useful", "reason": "why" }
  ]
}

Return ONLY valid JSON, no markdown.`;

  const dataDrivenGoals = generateDataDrivenGoals(data);

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': REQUEST_ORIGIN,
        'X-Title': 'LinkedIn Insights',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: MAX_GOALS_CLASSIFICATION_OUTPUT_TOKENS,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${await response.text()}`);
    }

    const responseData = await response.json();
    const responseText = responseData.choices?.[0]?.message?.content || '';

    const parsed = parseGoalsAndConnectionsResponse(responseText, data.connections);

    return {
      goals: dataDrivenGoals,
      classifiedConnections: parsed.classifiedConnections,
    };
  } catch (error) {
    console.error('Error generating goals and classifying connections:', error);
    const fallback = generateDefaultGoalsAndConnections(data.connections);
    return {
      goals: dataDrivenGoals,
      classifiedConnections: fallback.classifiedConnections,
    };
  }
}

function extractFullData(
  data: Record<string, unknown>[],
  fields: string[],
  maxRows: number = MAX_GENERIC_ROWS_IN_PROMPT
): string {
  if (!data || data.length === 0) return 'No data';
  return data.slice(0, maxRows).map(row => {
    return fields.map(f => `${f}: ${row[f] || 'N/A'}`).join(' | ');
  }).join('\n');
}

function extractProfileFullData(profile: Record<string, unknown>[]): string {
  if (!profile || profile.length === 0) return 'No profile data';
  const p = profile[0];
  const allFields = Object.entries(p)
    .slice(0, 25)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  return allFields;
}

function extractAllConnections(connections: Record<string, unknown>[]): string {
  if (!connections || connections.length === 0) return 'No connections';
  return connections.slice(0, MAX_CONNECTION_ROWS_IN_PROMPT).map(c => {
    const firstName = c['First Name'] || c['first_name'] || '';
    const lastName = c['Last Name'] || c['last_name'] || '';
    const email = c['Email Address'] || c['email_address'] || c['email'] || '';
    const company = c['Company'] || c['company'] || c['Company Name'] || '';
    const title = c['Title'] || c['title'] || c['Position'] || '';
    const connectedOn = c['Connected On'] || c['connected_on'] || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Unknown';
    const roleAndCompany = title && company
      ? `${title} at ${company}`
      : title || company || 'No role/company data';
    return `${fullName} | ${roleAndCompany} | Connected: ${connectedOn || 'N/A'} | Email: ${email || 'N/A'}`;
  }).join('\n');
}

function extractMessagesSummary(messages: Record<string, unknown>[]): string {
  if (!messages || messages.length === 0) return 'No messages';
  const sample = messages.slice(0, MAX_MESSAGE_ROWS_IN_PROMPT).map(m => {
    const from = m['FROM'] || m['From'] || m['from'] || '';
    const to = m['TO'] || m['To'] || m['to'] || '';
    return `From: ${from} -> To: ${to}`;
  }).join('\n');
  return `Total messages: ${messages.length}\n${sample}`;
}

interface ConnectionDetails {
  firstName: string;
  lastName: string;
  email: string;
  profileUrl: string;
  connectedOn: string;
  company: string;
  title: string;
}

function getConnectionField(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function extractConnectionDetailsFromRaw(record: Record<string, unknown>): ConnectionDetails {
  return {
    firstName: getConnectionField(record, ['First Name', 'first_name']),
    lastName: getConnectionField(record, ['Last Name', 'last_name']),
    email: getConnectionField(record, ['Email Address', 'email_address', 'email']),
    profileUrl: getConnectionField(record, [
      'Profile URL',
      'Profile Url',
      'profile_url',
      'Public Profile URL',
      'Public Profile Url',
      'public_profile_url',
      'LinkedIn URL',
      'LinkedIn Url',
      'linkedin_url',
      'LinkedIn Profile',
      'linkedin_profile',
      'URL',
      'Url',
      'url',
    ]),
    connectedOn: getConnectionField(record, ['Connected On', 'connected_on']),
    company: getConnectionField(record, ['Company', 'company', 'Company Name', 'company_name']),
    title: getConnectionField(record, ['Title', 'title', 'Position']),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getTextField(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string') {
      const compact = value.replace(/\s+/g, ' ').trim();
      if (compact && compact.toLowerCase() !== 'n/a' && compact !== '-') {
        return compact;
      }
    }
  }

  return '';
}

function topValues(values: string[], limit: number = 3): string[] {
  const counts = new Map<string, number>();

  values.forEach((value) => {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }

    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value]) => value);
}

function formatFocus(values: string[], fallback: string): string {
  return values.length > 0 ? values.join(', ') : fallback;
}

function generateDataDrivenGoals(data: GoalsAndClassificationInput): Goal[] {
  const { metrics } = data;

  const topCompanies = topValues(
    data.connections.map((row) =>
      getTextField(row, ['Company', 'company', 'Company Name', 'company_name'])
    )
  );
  const topTitles = topValues(
    data.connections.map((row) => getTextField(row, ['Title', 'title', 'Position']))
  );
  const topSkills = topValues(
    data.skills.map((row) => getTextField(row, ['Name', 'name', 'Skill', 'skill']))
  );

  const roleFocus = formatFocus(topTitles, 'your target role cluster');
  const companyFocus = formatFocus(topCompanies, 'high-fit companies in your domain');
  const skillFocus = formatFocus(topSkills, 'your strongest skills from this export');

  const weeklyConnectionTarget = clamp(
    Math.max(8, Math.round(metrics.connectionRequestsSent / 4) + 6),
    8,
    40,
  );
  const weeklyFollowUpTarget = clamp(
    Math.max(4, Math.round(metrics.messagesSent / 4) + 3),
    4,
    24,
  );
  const monthlyPostTarget = clamp(Math.max(4, metrics.postsCreated + 2), 4, 20);
  const weeklyCommentTarget = clamp(
    Math.max(6, Math.round(metrics.commentsMade / 4) + 4),
    6,
    35,
  );
  const weeklyEngagementTarget = clamp(
    Math.max(
      18,
      Math.round((metrics.likesGiven + metrics.commentsMade + metrics.shares) / 4) + 10,
    ),
    18,
    90,
  );

  const followerPool = data.memberFollows.length + data.companyFollows.length;
  const weeklyFollowerConversionTarget = clamp(
    Math.max(3, Math.round(followerPool * 0.2)),
    3,
    20,
  );

  const monthlyJobTarget = metrics.jobsApplied > 0
    ? clamp(Math.round(metrics.jobsApplied * 1.35) + 2, metrics.jobsApplied + 1, 50)
    : 12;

  const replyRatio = metrics.messagesReceived > 0
    ? Math.round((metrics.messagesSent / metrics.messagesReceived) * 100)
    : 0;

  const networkContext = metrics.connections > 0
    ? `${metrics.connections} existing connections`
    : 'your current network baseline';

  const messagingContext = metrics.messagesReceived > 0
    ? `You logged ${metrics.messagesSent} sent vs ${metrics.messagesReceived} received messages (reply ratio ${replyRatio}%).`
    : `Your upload shows ${metrics.messagesSent} sent messages with limited inbound thread volume.`;

  const jobsDescription = metrics.jobsApplied > 0
    ? `You already applied to ${metrics.jobsApplied} jobs in this export. Raise this to ${monthlyJobTarget} targeted applications this month and follow up with at least one recruiter or hiring manager message for each shortlisted role.`
    : `No job applications were found in this upload. Build a baseline pipeline of ${monthlyJobTarget} targeted applications this month and pair each with one tailored outreach message.`;

  return [
    {
      id: '1',
      title: 'Targeted Network Expansion',
      description: `Using ${networkContext}, send ${weeklyConnectionTarget} focused connection requests per week aimed at ${roleFocus}. Prioritize second-degree contacts from ${companyFocus} and keep acceptance tracking so you can double down on segments above 25% acceptance.`,
      searchQuery: `LinkedIn second degree connection strategy for ${roleFocus} in ${companyFocus}`,
    },
    {
      id: '2',
      title: 'Convert Connections Into Conversations',
      description: `${messagingContext} Send ${weeklyFollowUpTarget} personalized follow-ups each week to dormant contacts from your upload, anchored to shared context (same company, role, or recent post) and target 30%+ response on those follow-ups.`,
      searchQuery: `best personalized LinkedIn follow up message framework for dormant connections`,
    },
    {
      id: '3',
      title: 'Skill-Led Content Cadence',
      description: `Build content around ${skillFocus}: publish ${monthlyPostTarget} posts per month and add ${weeklyCommentTarget} substantive comments each week. With your current ${weeklyEngagementTarget} weekly engagement target, focus on commentary that references concrete examples instead of one-line reactions.`,
      searchQuery: `LinkedIn content system using domain skills and comment strategy`,
    },
    {
      id: '4',
      title: 'Warm Pipeline From Follows And Requests',
      description: `Your upload includes ${metrics.connectionRequestsReceived} received requests and ${followerPool} follow records (members + companies). Convert this warm pool by initiating ${weeklyFollowerConversionTarget} high-context outreach conversations per week with people tied to ${companyFocus}.`,
      searchQuery: `how to convert LinkedIn followers and pending requests into warm opportunities`,
    },
    {
      id: '5',
      title: 'Application Throughput With Network Assist',
      description: jobsDescription,
      searchQuery: `LinkedIn job application workflow with networking follow up and recruiter outreach`,
    },
  ];
}

function normalizeSignaturePart(value: string): string {
  return value.toLowerCase().trim();
}

function buildConnectionSignatures(details: ConnectionDetails): string[] {
  const firstName = normalizeSignaturePart(details.firstName);
  const lastName = normalizeSignaturePart(details.lastName);
  const email = normalizeSignaturePart(details.email);
  const connectedOn = normalizeSignaturePart(details.connectedOn);
  const company = normalizeSignaturePart(details.company);
  const title = normalizeSignaturePart(details.title);
  const signatures = new Set<string>();

  if (firstName || lastName) {
    signatures.add(`n:${firstName}|${lastName}`);

    if (email) {
      signatures.add(`ne:${firstName}|${lastName}|${email}`);
    }

    if (connectedOn) {
      signatures.add(`nd:${firstName}|${lastName}|${connectedOn}`);
    }
  }

  if (email) {
    signatures.add(`e:${email}`);
  }

  if (company && title) {
    signatures.add(`ct:${company}|${title}`);
  }

  return Array.from(signatures);
}

function inferDefaultClassification(details: ConnectionDetails): ClassifiedConnection['classification'] {
  if (details.title || details.company) {
    return 'useful';
  }

  return 'maybe_useful';
}

function inferDefaultReason(details: ConnectionDetails): string {
  if (details.title || details.company) {
    return 'Has profile information that may be relevant for networking.';
  }

  return 'Limited profile information available from uploaded connection data.';
}

function ensureAllConnectionsClassified(
  originalConnections: Record<string, unknown>[],
  llmClassifiedConnections: ClassifiedConnection[]
): ClassifiedConnection[] {
  const signaturesMap = new Map<string, ClassifiedConnection[]>();
  const usedClassifications = new Set<ClassifiedConnection>();

  for (const classification of llmClassifiedConnections) {
    const details: ConnectionDetails = {
      firstName: classification.firstName || '',
      lastName: classification.lastName || '',
      email: classification.email || '',
      profileUrl: classification.profileUrl || '',
      connectedOn: classification.connectedOn || '',
      company: classification.company || '',
      title: classification.title || '',
    };

    const signatures = buildConnectionSignatures(details);
    for (const signature of signatures) {
      const existing = signaturesMap.get(signature) || [];
      existing.push(classification);
      signaturesMap.set(signature, existing);
    }
  }

  return originalConnections.map((connection) => {
    const details = extractConnectionDetailsFromRaw(connection);
    const signatures = buildConnectionSignatures(details);
    let matched: ClassifiedConnection | undefined;

    for (const signature of signatures) {
      const options = signaturesMap.get(signature);
      if (!options || options.length === 0) {
        continue;
      }

      while (options.length > 0 && usedClassifications.has(options[0])) {
        options.shift();
      }

      if (options.length > 0) {
        matched = options.shift();
        if (matched) {
          usedClassifications.add(matched);
          break;
        }
      }
    }

    const fallbackClassification = inferDefaultClassification(details);

    return {
      firstName: details.firstName || matched?.firstName || 'Unknown',
      lastName: details.lastName || matched?.lastName || '',
      email: details.email || matched?.email || '',
      profileUrl: details.profileUrl || matched?.profileUrl || '',
      connectedOn: details.connectedOn || matched?.connectedOn || '',
      company: details.company || matched?.company || '',
      title: details.title || matched?.title || '',
      classification: matched?.classification || fallbackClassification,
      reason: matched?.reason || inferDefaultReason(details),
    };
  });
}

function parseGoalsAndConnectionsResponse(
  responseText: string,
  originalConnections: Record<string, unknown>[]
): { goals: Goal[]; classifiedConnections: ClassifiedConnection[] } {
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    const goals: Goal[] = (parsed.goals || []).map((item: Record<string, string>, index: number) => ({
      id: item.id || String(index + 1),
      title: item.title || 'Untitled Goal',
      description: item.description || '',
      searchQuery: item.searchQuery || '',
    }));

    const classifiedConnections: ClassifiedConnection[] = (parsed.classifiedConnections || []).map((item: Record<string, string>) => ({
      firstName: item.firstName || item.first_name || '',
      lastName: item.lastName || item.last_name || '',
      email: item.email || '',
      profileUrl: item.profileUrl || item.profile_url || item.linkedinUrl || item.linkedin_url || '',
      connectedOn: item.connectedOn || item.connected_on || '',
      company: item.company || '',
      title: item.title || item.Position || '',
      classification: (item.classification === 'useful' || item.classification === 'maybe_useful') 
        ? item.classification 
        : 'maybe_useful',
      reason: item.reason || '',
    }));

    const completeConnections = ensureAllConnectionsClassified(originalConnections, classifiedConnections);

    const finalGoals = goals.length > 0 ? goals : generateDefaultGoalsAndConnections(originalConnections).goals;

    return { goals: finalGoals, classifiedConnections: completeConnections };
  } catch (error) {
    console.error('Failed to parse response:', error);
    console.log('Raw response:', responseText);
    return generateDefaultGoalsAndConnections(originalConnections);
  }
}

function generateDefaultGoalsAndConnections(
  connections: Record<string, unknown>[]
): { goals: Goal[]; classifiedConnections: ClassifiedConnection[] } {
  const goals: Goal[] = [
    {
      id: '1',
      title: 'Increase Network Quality',
      description: 'Review your connections and focus on connecting with professionals in your target industry. Reach out to at least 5 relevant contacts this week.',
      searchQuery: 'how to build quality LinkedIn network strategy 2024',
    },
    {
      id: '2',
      title: 'Boost Engagement Rate',
      description: 'Increase your LinkedIn engagement by liking, commenting, and sharing posts from connections in your industry. Aim for 10+ interactions daily.',
      searchQuery: 'LinkedIn engagement tips increase reach algorithm',
    },
    {
      id: '3',
      title: 'Optimize Profile Visibility',
      description: 'Update your profile with relevant keywords, achievement metrics, and a compelling headline to attract better opportunities and connections.',
      searchQuery: 'LinkedIn profile optimization SEO keywords tips',
    },
    {
      id: '4',
      title: 'Strategic Messaging',
      description: 'Reconnect with dormant connections through personalized messages. Send meaningful follow-ups to maintain relationships.',
      searchQuery: 'LinkedIn reconnection message templates networking',
    },
    {
      id: '5',
      title: 'Content Creation',
      description: 'Share industry-related content 2-3 times per week to establish thought leadership and increase profile visibility.',
      searchQuery: 'LinkedIn content strategy B2B thought leadership',
    },
  ];

  const classifiedConnections: ClassifiedConnection[] = connections.map((conn) => {
    const details = extractConnectionDetailsFromRaw(conn);
    const classification = inferDefaultClassification(details);

    return {
      firstName: details.firstName || 'Unknown',
      lastName: details.lastName,
      email: details.email,
      profileUrl: details.profileUrl,
      connectedOn: details.connectedOn,
      company: details.company,
      title: details.title,
      classification,
      reason: inferDefaultReason(details),
    };
  });

  return { goals, classifiedConnections };
}

export async function generateGoals(metrics: LinkedInMetrics): Promise<Goal[]> {
  const prompt = buildPrompt(metrics);

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': REQUEST_ORIGIN,
      'X-Title': 'LinkedIn Insights',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: prompt,
        }
      ],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  const responseText = data.choices?.[0]?.message?.content || '';

  return parseGoalsResponse(responseText);
}

function buildPrompt(metrics: LinkedInMetrics): string {
  return `You are a LinkedIn growth expert and career strategist. Analyze the following LinkedIn activity metrics and generate exactly 4 specific, actionable goals that would help improve the user's LinkedIn presence and career opportunities.

Current Metrics:
- Total Connections: ${metrics.connections}
- Messages Sent: ${metrics.messagesSent}
- Messages Received: ${metrics.messagesReceived}
- Jobs Applied: ${metrics.jobsApplied}
- Likes Given: ${metrics.likesGiven}
- Comments Made: ${metrics.commentsMade}
- Shares: ${metrics.shares}
- Posts Created: ${metrics.postsCreated}
- Connection Requests Sent: ${metrics.connectionRequestsSent}
- Connection Requests Received: ${metrics.connectionRequestsReceived}

Return your response as a JSON array with exactly 4 goals in the following format:
[
  { "id": "1", "title": "goal title", "description": "specific action steps" },
  { "id": "2", "title": "goal title", "description": "specific action steps" },
  { "id": "3", "title": "goal title", "description": "specific action steps" },
  { "id": "4", "title": "goal title", "description": "specific action steps" }
]

Make sure each goal is:
1. Specific and measurable
2. Achievable within 2-4 weeks
3. Directly related to improving their LinkedIn metrics
4. Include concrete action steps in the description

Return ONLY valid JSON, no markdown formatting, no explanation.`;
}

function parseGoalsResponse(responseText: string): Goal[] {
  try {
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    if (!Array.isArray(parsed) || parsed.length !== 4) {
      throw new Error('Response must contain exactly 4 goals');
    }

    return parsed.map((item, index) => ({
      id: item.id || String(index + 1),
      title: item.title || 'Untitled Goal',
      description: item.description || item.title || '',
    }));
  } catch (error) {
    console.error('Failed to parse goals response:', error);
    console.log('Raw response:', responseText);
    
    return generateDefaultGoals();
  }
}

function generateDefaultGoals(): Goal[] {
  return [
    {
      id: '1',
      title: 'Increase Daily Engagement',
      description: 'Like 10 posts and comment on 5 posts daily in your industry to boost visibility and algorithm reach.',
    },
    {
      id: '2',
      title: 'Optimize Profile for Recruiters',
      description: 'Update your headline, about section, and skills to align with your target job roles.',
    },
    {
      id: '3',
      title: 'Send Strategic Connection Requests',
      description: 'Connect with 5-10 industry professionals daily with personalized messages.',
    },
    {
      id: '4',
      title: 'Apply to More Jobs',
      description: 'Apply to at least 3-5 relevant job postings daily and follow up with recruiters.',
    },
  ];
}

function sanitizePromptFieldValue(key: string, value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedKey = key.toLowerCase();
  if (/(email|e-mail)/i.test(normalizedKey)) {
    return '[REDACTED_EMAIL]';
  }

  if (/(phone|mobile|telephone|tel)/i.test(normalizedKey)) {
    return '[REDACTED_PHONE]';
  }

  if (/(full\s*name|first\s*name|last\s*name|name)/i.test(normalizedKey)) {
    return '[REDACTED_NAME]';
  }

  if (/(note|notes|message|msg|connection\s*note)/i.test(normalizedKey)) {
    return '[REDACTED_TEXT]';
  }

  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3}[\s-]?\d{4,}/g, '[REDACTED_PHONE]');
}

function sanitizePromptRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row)) {
      sanitized[key] = sanitizePromptFieldValue(key, value);
    }

    return sanitized;
  });
}

export async function analyzeCSVData(
  csvData: Record<string, unknown>[]
): Promise<{ insights: string; recommendations: string[] }> {
  const sanitizedCsvSample = sanitizePromptRows(csvData.slice(0, 50));

  const prompt = `Analyze the following LinkedIn CSV data and provide insights:

${JSON.stringify(sanitizedCsvSample, null, 2)}

Provide a JSON response with:
{
  "insights": "2-3 sentence summary of key patterns",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"]
}

Return ONLY valid JSON.`;

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': REQUEST_ORIGIN,
      'X-Title': 'LinkedIn Insights',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to analyze CSV data');
  }

  const data = await response.json();
  const responseText = data.choices?.[0]?.message?.content || '';

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Failed to parse analysis response:', error);
  }

  return {
    insights: 'Analysis completed with available data.',
    recommendations: ['Review your engagement metrics', 'Connect with more professionals'],
  };
}

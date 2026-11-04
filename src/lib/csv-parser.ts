import Papa from 'papaparse';

export interface ParsedCSV {
  data: Record<string, unknown>[];
  headers: string[];
  error?: string;
}

export type ActivityKind = 'like' | 'comment' | 'share' | 'post' | null;

function readTextValue(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
}

function includesAny(source: string, keywords: string[]): boolean {
  return keywords.some((keyword) => source.includes(keyword));
}

export function classifyActivityKind(row: Record<string, unknown>): ActivityKind {
  const type = readTextValue(
    row['Activity Type'] ||
      row['activity_type'] ||
      row['Type'] ||
      row['type'] ||
      row['Reaction Type'] ||
      row['reaction_type'] ||
      row['reactionType']
  );
  const action = readTextValue(row['Action'] || row['action'] || row['Activity'] || row['activity']);
  const message = readTextValue(row['Message'] || row['message'] || row['Comment'] || row['comment']);

  const combined = `${type} ${action} ${message}`;

  if (includesAny(combined, ['share', 'repost', 'reshare'])) {
    return 'share';
  }

  if (includesAny(combined, ['comment', 'reply'])) {
    return 'comment';
  }

  if (
    includesAny(combined, [
      'react',
      'reaction',
      'like',
      'love',
      'celebrate',
      'support',
      'insightful',
      'curious',
      'empathy',
      'praise',
      'appreciation',
      'interest',
      'funny',
    ])
  ) {
    return 'like';
  }

  if (includesAny(combined, ['post', 'publish', 'article', 'newsletter', 'create'])) {
    return 'post';
  }

  return null;
}

export async function parseCSV(content: string, filename?: string): Promise<ParsedCSV> {
  return new Promise((resolve) => {
    let cleanContent = content;
    if (content.charCodeAt(0) === 0xFEFF) {
      cleanContent = content.slice(1);
    }

    const isConnectionFile = filename?.toLowerCase() === 'connections.csv';
    
    if (isConnectionFile) {
      const lines = cleanContent.split('\n');
      console.log(`Connections.csv: total lines = ${lines.length}`);
      
      const actualDataStart = 3;
      const headerLine = lines.slice(actualDataStart, actualDataStart + 1).join('\n');
      const dataLines = lines.slice(actualDataStart + 1).join('\n');
      
      console.log(`Connections.csv: header line = "${headerLine.substring(0, 100)}"`);
      
      const result = Papa.parse(headerLine + '\n' + dataLines, {
        header: true,
        skipEmptyLines: true,
      });
      
      const data = result.data as Record<string, unknown>[];
      console.log(`Connections.csv: parsed ${data.length} connections`);
      
      if (data.length > 0) {
        console.log(`First connection: ${JSON.stringify(data[0]).substring(0, 200)}`);
      }
      
      resolve({
        data,
        headers: result.meta.fields || [],
      });
      return;
    }

    const result = Papa.parse(cleanContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
    });

    if (result.errors.length > 0 && result.data.length === 0) {
      const retryResult = Papa.parse(cleanContent, {
        header: false,
        skipEmptyLines: true,
        delimiter: ";",
      });
      
      if (retryResult.data.length > 0) {
        const headers = (retryResult.data[0] as string[]).map(h => h?.trim() || '');
        const data = (retryResult.data as string[][]).slice(1).map(row => {
          const obj: Record<string, unknown> = {};
          headers.forEach((h, i) => { obj[h] = row[i]; });
          return obj;
        });
        resolve({ data, headers });
        return;
      }
    }

    resolve({
      data: result.data as Record<string, unknown>[],
      headers: result.meta.fields || [],
    });
  });
}

export function identifyCSVType(headers: string[], filename?: string): string {
  const filenameLower = (filename || '').toLowerCase();

  if (filenameLower === 'connections.csv') {
    return 'connections';
  }
  if (filenameLower === 'messages.csv') {
    return 'messages';
  }
  if (filenameLower === 'invitations.csv') {
    return 'invitations';
  }
  if (filenameLower === 'skills.csv') {
    return 'skills';
  }
  if (filenameLower === 'positions.csv') {
    return 'positions';
  }
  if (filenameLower === 'profile.csv') {
    return 'profile';
  }
  if (filenameLower === 'comments.csv') {
    return 'comments';
  }
  if (filenameLower === 'member_follows.csv') {
    return 'member_follows';
  }
  if (filenameLower === 'company follows.csv' || filenameLower === 'company_follows.csv') {
    return 'company_follows';
  }
  if (filenameLower === 'instantreposts.csv') {
    return 'instant_reposts';
  }
  if (filenameLower === 'reactions.csv') {
    return 'activities';
  }
  if (filenameLower === 'shares.csv') {
    return 'activities';
  }

  if (filenameLower.includes('connection') && !filenameLower.includes('invitation') && !filenameLower.includes('following')) {
    return 'connections';
  }

  if (filenameLower.includes('invitation')) {
    return 'invitations';
  }

  if (filenameLower.includes('message') && !filenameLower.includes('learning') && !filenameLower.includes('coach')) {
    return 'messages';
  }

  if (filenameLower.includes('skill')) {
    return 'skills';
  }

  if (filenameLower.includes('position') || filenameLower.includes('job')) {
    return 'positions';
  }

  if (filenameLower.includes('profile')) {
    return 'profile';
  }

  if (filenameLower.includes('comment')) {
    return 'comments';
  }

  if (filenameLower.includes('member_follow') || filenameLower.includes('followers')) {
    return 'member_follows';
  }

  if (filenameLower.includes('company_follow') || filenameLower.includes('company follow')) {
    return 'company_follows';
  }

  if (filenameLower.includes('repost')) {
    return 'instant_reposts';
  }

  if (filenameLower.includes('reaction') || filenameLower.includes('share')) {
    return 'activities';
  }

  if (filenameLower.includes('job') && filenameLower.includes('application')) {
    return 'jobs';
  }

  return 'unknown';
}

export function normalizeConnections(data: Record<string, unknown>[]): {
  total: number;
  dateRange: { start: string; end: string };
} {
  const total = data.length;
  const dates = data
    .map((row) => row['Connected On'] || row['connected_on'] || row['Date'])
    .filter(Boolean) as string[];

  const parsedDates = dates
    .map((d) => new Date(d))
    .filter((d) => !isNaN(d.getTime()));

  const sortedDates = parsedDates.sort((a, b) => a.getTime() - b.getTime());

  return {
    total,
    dateRange:
      sortedDates.length > 0
        ? {
            start: sortedDates[0].toISOString(),
            end: sortedDates[sortedDates.length - 1].toISOString(),
          }
        : { start: new Date().toISOString(), end: new Date().toISOString() },
  };
}

export function normalizeMessages(data: Record<string, unknown>[]): {
  sent: number;
  received: number;
} {
  let sent = 0;
  let received = 0;

  data.forEach((row) => {
    const from = (row['FROM'] || row['From'] || row['from'] || '') as string;
    const direction = (row['Direction'] || row['direction'] || '') as string;

    if (direction.toLowerCase() === 'sent' || direction.toLowerCase() === 'outgoing') {
      sent++;
    } else if (direction.toLowerCase() === 'received' || direction.toLowerCase() === 'incoming') {
      received++;
    } else if (from.toLowerCase().includes('ayan') || from === 'Ayan Parmar') {
      sent++;
    } else {
      received++;
    }
  });

  console.log(`Messages: sent=${sent}, received=${received}`);
  return { sent, received };
}

export function normalizeJobs(data: Record<string, unknown>[]): {
  applied: number;
} {
  return {
    applied: data.length,
  };
}

export function normalizeActivities(data: Record<string, unknown>[]): {
  likes: number;
  comments: number;
  shares: number;
  posts: number;
} {
  let likes = 0;
  let comments = 0;
  let shares = 0;
  let posts = 0;

  data.forEach((row) => {
    const activityKind = classifyActivityKind(row);

    if (activityKind === 'like') {
      likes += 1;
    } else if (activityKind === 'comment') {
      comments += 1;
    } else if (activityKind === 'share') {
      shares += 1;
    } else if (activityKind === 'post') {
      posts += 1;
    }
  });

  return { likes, comments, shares, posts };
}

export function normalizeInvitations(data: Record<string, unknown>[]): {
  sent: number;
  received: number;
} {
  let sent = 0;
  let received = 0;

  data.forEach((row) => {
    const direction = (row['Direction'] || row['direction'] || '') as string;

    if (direction.toLowerCase() === 'sent') {
      sent++;
    } else {
      received++;
    }
  });

  return { sent, received };
}

export async function parseAllCSVs(
  csvContents: Record<string, string>
): Promise<Record<string, ParsedCSV>> {
  const results: Record<string, ParsedCSV> = {};
  const activitiesData: Record<string, unknown>[] = [];
  const connectionsData: Record<string, unknown>[] = [];
  const messagesData: Record<string, unknown>[] = [];
  const invitationsData: Record<string, unknown>[] = [];
  const skillsData: Record<string, unknown>[] = [];
  const positionsData: Record<string, unknown>[] = [];
  const profileData: Record<string, unknown>[] = [];
  const commentsData: Record<string, unknown>[] = [];
  const memberFollowsData: Record<string, unknown>[] = [];
  const companyFollowsData: Record<string, unknown>[] = [];
  const instantRepostsData: Record<string, unknown>[] = [];

  for (const [filename, content] of Object.entries(csvContents)) {
    const parsed = await parseCSV(content, filename);
    const type = identifyCSVType(parsed.headers, filename);
    console.log(`File ${filename} -> type: ${type}, data: ${parsed.data.length}`);
    
    if (type && type !== 'unknown') {
      results[type] = parsed;
    }
    
    if (type === 'activities') {
      activitiesData.push(...parsed.data);
    } else if (type === 'connections') {
      connectionsData.push(...parsed.data);
    } else if (type === 'messages') {
      messagesData.push(...parsed.data);
    } else if (type === 'invitations') {
      invitationsData.push(...parsed.data);
    } else if (type === 'skills') {
      skillsData.push(...parsed.data);
    } else if (type === 'positions') {
      positionsData.push(...parsed.data);
    } else if (type === 'profile') {
      profileData.push(...parsed.data);
    } else if (type === 'comments') {
      commentsData.push(...parsed.data);
    } else if (type === 'member_follows') {
      memberFollowsData.push(...parsed.data);
    } else if (type === 'company_follows') {
      companyFollowsData.push(...parsed.data);
    } else if (type === 'instant_reposts') {
      instantRepostsData.push(...parsed.data);
    }
    
    results[filename] = parsed;
  }

  if (activitiesData.length > 0) {
    results['activities'] = { data: activitiesData, headers: ['Date', 'Type', 'Link', 'Action'] };
  }
  if (connectionsData.length > 0) {
    results['connections'] = { data: connectionsData, headers: ['First Name', 'Last Name', 'Email', 'Connected On'] };
  }
  if (messagesData.length > 0) {
    results['messages'] = { data: messagesData, headers: ['FROM', 'TO', 'DATE', 'CONVERSATION ID'] };
  }
  if (invitationsData.length > 0) {
    results['invitations'] = { data: invitationsData, headers: ['From', 'To', 'Direction', 'Sent At'] };
  }
  if (skillsData.length > 0) {
    results['skills'] = { data: skillsData, headers: ['Name'] };
  }
  if (positionsData.length > 0) {
    results['positions'] = { data: positionsData, headers: ['Title', 'Company Name', 'Start Date', 'End Date'] };
  }
  if (profileData.length > 0) {
    results['profile'] = { data: profileData, headers: ['Headline', 'Summary', 'Location'] };
  }
  if (commentsData.length > 0) {
    results['comments'] = { data: commentsData, headers: ['Post URL', 'Comment Text', 'Date'] };
  }
  if (memberFollowsData.length > 0) {
    results['member_follows'] = { data: memberFollowsData, headers: ['Member Name', 'Date'] };
  }
  if (companyFollowsData.length > 0) {
    results['company_follows'] = { data: companyFollowsData, headers: ['Company Name', 'Date'] };
  }
  if (instantRepostsData.length > 0) {
    results['instant_reposts'] = { data: instantRepostsData, headers: ['Original Post', 'Date'] };
  }

  console.log(`Final aggregated: connections=${connectionsData.length}, messages=${messagesData.length}, activities=${activitiesData.length}, invitations=${invitationsData.length}, skills=${skillsData.length}, positions=${positionsData.length}, profile=${profileData.length}, comments=${commentsData.length}, memberFollows=${memberFollowsData.length}, companyFollows=${companyFollowsData.length}, instantReposts=${instantRepostsData.length}`);

  return results;
}
import 'server-only';

export type AdkConversationTurn = { role: 'user' | 'assistant' | 'system'; content: string };

export type AdkPlannerRequest = {
  conversation: AdkConversationTurn[];
  context?: Record<string, unknown>;
};

export type AdkPlannerResponse = {
  status: 'ok' | 'error';
  message?: string;
  required_questions?: string[];
  plan?: unknown;
};

export async function callAdkPlanner(req: AdkPlannerRequest): Promise<AdkPlannerResponse> {
  const baseUrl = process.env.ADK_URL;
  if (!baseUrl) {
    return { status: 'error', message: 'ADK_URL not configured' };
  }
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    return { status: 'error', message: `ADK service error: ${res.status}` };
  }
  return (await res.json()) as AdkPlannerResponse;
}

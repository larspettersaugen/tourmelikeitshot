import { anthropic } from '@ai-sdk/anthropic';
import { streamText, convertToModelMessages, stepCountIs } from 'ai';
import { getSession } from '@/lib/session';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { getChatTools } from '@/lib/ai/tools';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { messages } = await req.json();
  const { id: userId, role, name: userName } = session.user;

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: buildSystemPrompt(role, userName ?? undefined),
    messages: modelMessages,
    tools: getChatTools(userId, role),
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}

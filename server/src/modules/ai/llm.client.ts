import { env } from '../../config/env.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface LLMResponse {
  content?: string;
  toolCall?: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export interface ILLMClient {
  generate(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<LLMResponse>;
}

/**
 * Universal Mock / Provider Client supporting Gemini, OpenAI, or Offline Mock
 */
export class LLMClient implements ILLMClient {
  private apiKey: string;
  private provider: string;
  private timeoutMs: number;

  constructor() {
    this.apiKey = env.AI_API_KEY;
    this.provider = env.AI_PROVIDER;
    this.timeoutMs = env.AI_TIMEOUT_MS;
  }

  public async generate(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<LLMResponse> {
    // If no API key is provided or test mode, return structured heuristic mock answer
    if (!this.apiKey || env.NODE_ENV === 'test') {
      return this.mockGenerate(messages, tools);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      if (this.provider === 'openai') {
        return await this.callOpenAI(messages, tools, controller.signal);
      } else {
        return await this.callGemini(messages, tools, controller.signal);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('AI request timed out after 15 seconds.');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async callGemini(
    messages: ChatMessage[],
    _tools?: ToolDefinition[],
    signal?: AbortSignal
  ): Promise<LLMResponse> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${env.AI_MODEL}:generateContent?key=${this.apiKey}`;

    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const systemInstruction = messages.find((m) => m.role === 'system');

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction.content }] } : undefined,
      }),
      signal,
    });

    if (!res.ok) {
      const errJson = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(errJson?.error?.message || `Gemini API error ${res.status}`);
    }

    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { content: text };
  }

  private async callOpenAI(
    messages: ChatMessage[],
    _tools?: ToolDefinition[],
    signal?: AbortSignal
  ): Promise<LLMResponse> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        messages,
      }),
      signal,
    });

    if (!res.ok) {
      const errJson = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(errJson?.error?.message || `OpenAI API error ${res.status}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const choice = json.choices?.[0]?.message;
    return { content: choice?.content || '' };
  }

  private async mockGenerate(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<LLMResponse> {
    const lastMsg = messages[messages.length - 1];
    const userPrompt = lastMsg?.content.toLowerCase() || '';

    // Direct refusal heuristic for confidential compensation of colleagues
    if (userPrompt.includes('colleague') || (userPrompt.includes('salary') && !userPrompt.includes('my salary'))) {
      if (userPrompt.includes('colleague') || userPrompt.includes('other')) {
        return {
          content: 'I cannot reveal salary details of other employees. Salaries are confidential.',
        };
      }
    }

    // Check if tool is needed based on query (Supports English + Roman Urdu)
    if (tools && tools.length > 0) {
      if (
        userPrompt.includes('headcount') ||
        userPrompt.includes('how many employees') ||
        userPrompt.includes('kitne employees') ||
        userPrompt.includes('kul tadad')
      ) {
        return {
          toolCall: {
            name: 'get_headcount',
            arguments: {},
          },
        };
      }
      if (
        userPrompt.includes('late') ||
        userPrompt.includes('late comers') ||
        userPrompt.includes('kon late aya') ||
        userPrompt.includes('der se aya')
      ) {
        return {
          toolCall: {
            name: 'get_late_comers',
            arguments: {},
          },
        };
      }
      if (
        userPrompt.includes('attendance') ||
        userPrompt.includes('present') ||
        userPrompt.includes('hazri')
      ) {
        return {
          toolCall: {
            name: 'get_attendance_summary',
            arguments: {},
          },
        };
      }
      if (
        userPrompt.includes('leave') ||
        userPrompt.includes('balance') ||
        userPrompt.includes('chutti') ||
        userPrompt.includes('kitni chuttiyan')
      ) {
        return {
          toolCall: {
            name: 'get_my_leave_balance',
            arguments: {},
          },
        };
      }
      if (
        userPrompt.includes('salary') ||
        userPrompt.includes('payroll') ||
        userPrompt.includes('tankhwah')
      ) {
        return {
          toolCall: {
            name: 'get_payroll_summary',
            arguments: {},
          },
        };
      }
    }

    // Direct Answer heuristics
    if (userPrompt.includes('colleague') && userPrompt.includes('salary')) {
      return {
        content: 'I cannot reveal salary details of other employees. Salaries are confidential.',
      };
    }

    if (userPrompt.includes('sister') && userPrompt.includes('wedding')) {
      return {
        content: JSON.stringify({
          type: 'casual',
          startDate: '2026-10-26',
          endDate: '2026-10-27',
          reason: "Attending sister's wedding",
        }),
      };
    }

    return {
      content: 'I am the HCM Lite assistant. According to company policy, office starts at 09:00 with a 15-minute grace period.',
    };
  }
}

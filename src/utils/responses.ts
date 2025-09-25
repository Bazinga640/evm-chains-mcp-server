import { ZodTypeAny } from 'zod';

type McpContent = { type: 'text'; text: string };
type McpReturn = { content: McpContent[] };

export function buildSuccessResponse(payload: Record<string, any>): McpReturn {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ success: true, ...payload }, null, 2)
      }
    ]
  };
}

export function buildErrorResponse(payload: Record<string, any>): McpReturn {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ success: false, ...payload }, null, 2)
      }
    ]
  };
}

// Optional helper to wrap a try/catch pattern around a zod-validated handler
export async function withStandardResponses<TArgs extends Record<string, any>, TResult>(
  inputSchema: ZodTypeAny,
  args: TArgs,
  handler: (validated: TArgs) => Promise<Record<string, any>>
): Promise<McpReturn> {
  const start = Date.now();
  try {
    const validated = inputSchema.parse(args);
    const result = await handler(validated);
    return buildSuccessResponse({ ...result, executionTime: `${Date.now() - start}ms` });
  } catch (error: any) {
    return buildErrorResponse({ error: error.message, executionTime: `${Date.now() - start}ms` });
  }
}

export function buildJsonResponse(payload: unknown) {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(payload, null, 2)
    }]
  };
}

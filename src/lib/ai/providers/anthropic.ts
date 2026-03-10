import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Calls the Anthropic API with the pre-built prompt and returns the raw text
 * response. JSON parsing and validation happen in generate.ts.
 *
 * Only generate.ts imports this module — no other part of the codebase
 * may import @anthropic-ai/sdk directly (Section 4.6).
 */
export async function generateWithAnthropic(prompt: string): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  if (block.type !== "text") {
    throw new Error(
      `Unexpected Anthropic response content type: ${block.type}`
    );
  }

  return block.text;
}

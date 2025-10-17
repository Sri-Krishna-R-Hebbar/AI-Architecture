const OpenAI = require("openai");

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY not set. Set it in .env");
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * generateArchitectureFromConversation
 * - convoText: string (concatenated conversation + previous mermaid code if present)
 * - options: { diagramType?: string }
 *
 * Returns an object: { title, problem, tech_stack, mermaid }
 */
async function generateArchitectureFromConversation(convoText, options = {}) {
  const diagramHint = options.diagramType
    ? `Prefer a ${options.diagramType} mermaid diagram.`
    : "Prefer a concise flowchart-style mermaid diagram appropriate for architecture diagrams.";

  const systemPrompt = `
You are an assistant that reads a conversation and outputs a JSON object (and only the JSON, no extra text) describing an architecture design.
The JSON must contain these fields:
- "title": a short descriptive title (string).
- "problem": a concise, clear problem statement (string) - 150 to 250 words (only paragraphs and bullet points).
- "tech_stack": an array of probable technologies and components to implement this (array of strings).
- "mermaid": a mermaid diagram code string (use mermaid flowchart/graph or sequence as appropriate).

Important:
- Return EXACTLY a JSON object, and nothing else (no markdown, no explanations).
- If you must wrap output, use the markers %%JSON_START%% and %%JSON_END%% around the JSON only.
- Use the mermaid code in the "mermaid" field (no surrounding triple backticks).
${diagramHint}
`;

  const userPrompt = `
Conversation / Context (use this to create the architecture, update the previous diagram, and produce required fields):
"""${convoText}"""
  
Instructions:
- Produce a JSON object with keys: title, problem, tech_stack, mermaid.
- Keep "title" succinct (<= 80 chars).
- "tech_stack" should be an array containing 4-8 likely techs (e.g. "Node.js", "React", "Postgres", "Redis", "OpenAI", "Docker", "Nginx").
- "mermaid" must be valid mermaid source (flowchart/graph LR/TD or sequence) that diagrams the architecture described.
`;

  // Use chat completions (structured)
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  // call model
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini", // change model if you prefer
    messages,
    temperature: 0.15,
    max_tokens: 1200,
  });

  let text = "";
  if (completion && completion.choices && completion.choices.length > 0) {
    text =
      completion.choices[0].message?.content ??
      completion.choices[0].delta?.content ??
      "";
  }

  // If wrapped with markers, extract JSON between them
  const startMarker = "%%JSON_START%%";
  const endMarker = "%%JSON_END%%";
  if (text.includes(startMarker) && text.includes(endMarker)) {
    text = text.split(startMarker)[1].split(endMarker)[0].trim();
  }

  // Try to find the first JSON object in the response using regex
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    // fallback: try to clean common wrapping like ```json ... ```
    text = text.replace(/```json\s*/i, "").replace(/```/g, "").trim();
    const fallbackMatch = text.match(/\{[\s\S]*\}/);
    if (!fallbackMatch) {
      throw new Error("OpenAI response did not contain JSON output.");
    } else {
      text = fallbackMatch[0];
    }
  } else {
    text = jsonMatch[0];
  }

  // parse JSON safely
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    // Try to make minor fixes (trailing commas -> remove)
    try {
      const cleaned = text.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
      parsed = JSON.parse(cleaned);
    } catch (err2) {
      throw new Error("Failed to parse JSON from OpenAI response: " + err2.message);
    }
  }

  // Basic validation & normalization
  const result = {
    title: parsed.title ? String(parsed.title).trim() : "Architecture Diagram",
    problem: parsed.problem ? String(parsed.problem).trim() : convoText.slice(0, 600),
    tech_stack: Array.isArray(parsed.tech_stack)
      ? parsed.tech_stack.map((t) => String(t).trim())
      : typeof parsed.tech_stack === "string"
      ? parsed.tech_stack.split(",").map((t) => t.trim())
      : [],
    mermaid: parsed.mermaid ? String(parsed.mermaid).trim() : "",
  };

  return result;
}

module.exports = { generateArchitectureFromConversation };

const OpenAI = require('openai');

if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY not set. Set it in .env');
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * generateMermaidFromProblem
 * - problem: user-provided problem statement
 * - options: { diagramType } optional hint to the model
 *
 * Returns a mermaid diagram string (no surrounding quotes). If the response contains code fences,
 * this function strips them out and returns the raw mermaid script.
 */
async function generateMermaidFromProblem(problem, options = {}) {
  const diagramHint = options.diagramType ? `Prefer a ${options.diagramType} mermaid diagram.` : 'Prefer a concise flowchart-style mermaid diagram.';

  // System prompt to ensure model returns only mermaid code
  const systemPrompt = `
You are an assistant that translates an architecture problem statement into mermaid.js diagram code.
Output EXACTLY the mermaid script (no explanation, no markdown, no extra text).
If you must include multi-line code, output it starting with "%%MERMAID_START%%" on its own line and ending with "%%MERMAID_END%%".
Use mermaid flowchart or graph LR/TD syntax suitable for architecture diagrams. ${diagramHint}
`;

  // Compose user prompt — instruct to include labels and components
  const userPrompt = `
Problem statement:
"""${problem}"""

Requirements:
- Provide mermaid code only (or use the %%MERMAID_START%% / %%MERMAID_END%% wrapper).
- Make components named and include arrows for flow and data stores where applicable.
- Keep the diagram readable; avoid extremely long single lines.
- If the problem references user actions, services, databases, or third-party APIs, include them as nodes.
Return only the mermaid script.
`;

  // Use the Chat Completions or Responses endpoint depending on SDK; here we use chat completions
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  // Call OpenAI chat completions
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini', // choose appropriate model; you can change as needed
    messages,
    temperature: 0.2,
    max_tokens: 1200
  });

  // The new SDK returns structured object; extract text
  let text = '';
  if (completion && completion.choices && completion.choices.length > 0) {
    text = completion.choices[0].message?.content ?? completion.choices[0].delta?.content ?? '';
  }

  // If model wrapped content, extract between markers
  const startMarker = '%%MERMAID_START%%';
  const endMarker = '%%MERMAID_END%%';
  if (text.includes(startMarker) && text.includes(endMarker)) {
    text = text.split(startMarker)[1].split(endMarker)[0].trim();
  }

  // Remove triple-backtick fences if present
  text = text.replace(/```mermaid\s*/i, '').replace(/```/g, '').trim();

  return text;
}

module.exports = { generateMermaidFromProblem };

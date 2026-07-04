export const llm = {
  name: 'llm',
  description: 'Interact with a local in-browser LLM via WebGPU.',
  category: 'general',
  args: [
    { name: 'prompt', description: 'Optional initial prompt for the AI agent.', required: false }
  ],
  run: async (args, shell) => {
    try {
      const { llm: llmInstance } = await import('../llm.js');
      await llmInstance.run(args, shell);
    } catch (err) {
      shell.print(`Error starting LLM module: ${err.message}`, 'color-error');
      console.error(err);
    }
  }
};

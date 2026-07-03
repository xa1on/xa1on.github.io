export const llm = {
  helpText: 'Interact with a local in-browser LLM via WebGPU.',
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

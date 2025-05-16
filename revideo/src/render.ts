import { renderVideo } from '@revideo/renderer';

async function render() {
  try {
    console.log('Rendering video...');

    // Render the video based on the Revideo project file
    const outputFile = await renderVideo({
      projectFile: './src/project.tsx',
      settings: {
        logProgress: true, // Logs rendering progress to the console
      },
    });

    console.log(`Rendered video to ${outputFile}`);
  } catch (error) {
    console.error('Error during rendering:', error);
  }
}

render();

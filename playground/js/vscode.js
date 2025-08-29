// VS Code API - must be first script
const vscode = acquireVsCodeApi();

// Listen for messages from the extension
window.addEventListener('message', (event) => {
  const message = event.data;
  switch (message.command) {
    case 'loadBinary':
      loadBinaryFromBase64(message.data, message.fileName, message.config);
      break;
    case 'updateConfig':
      updateConfiguration(message.config);
      break;
  }
});

function resizeCanvas() {
  const canvas = document.getElementById('canvas-container');
  const vw = window.innerWidth - 48;
  const vh = window.innerHeight - 48;
  const aspect = 4 / 3;

  let width = vw;
  let height = width / aspect;

  if (height > vh) {
    height = vh;
    width = height * aspect;
  }

  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  // also fix internal resolution for crisp drawing
  canvas.width = width;
  canvas.height = height;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function updateConfiguration(config) {
  console.log('Configuration updated:', config);
  // Store config globally for use in other functions
  window.zeal8bitConfig = {
    uses: 'zealos',
    ...config,
  };

  // You can add logic here to respond to configuration changes
  // For example, update UI elements based on the 'uses' property
  if (config.uses) {
    console.log('Project uses:', config.uses);
    // Example: Update a status display or modify behavior based on the 'uses' property
  }
}

function loadBinaryFromBase64(base64Data, fileName, config) {
  try {
    const listing = document.querySelector('#list-view');
    listing.textContent = '';

    // Store config for use throughout the webview
    if (config) {
      updateConfiguration(config);
    }

    // Convert base64 to Uint8Array
    const binaryString = atob(base64Data);
    const bytes = Uint8Array.from(binaryString, (c) => c.charCodeAt(0));

    let listing_text = '';

    // Include configuration info in the listing
    if (config && config.uses) {
      listing_text += '\nProject uses: ' + config.uses;
    }

    // Show the emulator and hide loading message
    document.body.classList.remove('loading');

    // Load the binary into the emulator
    if (typeof code_run === 'function') {
      code_run(bytes);
    } else {
      // If code_run isn't available yet, wait a bit and try again
      setTimeout(() => {
        if (typeof code_run === 'function') {
          code_run(bytes);
        }
      }, 100);
    }

    console.log('Loaded binary:', fileName, bytes.length, 'bytes');

    listing.textContent = listing_text;
  } catch (error) {
    console.error('Failed to load binary:', error);
  }
}

// Flag to indicate we're in VS Code extension context
window.IS_VSCODE_EXTENSION = true;

let myTimerInterval;
let mySeconds = 0;

function myStartTimer(myArea) {
  mySeconds = 0;
  myArea.textContent = 'Thinking (0s)...';
  myTimerInterval = setInterval(() => {
    mySeconds++;
    myArea.textContent = `Thinking (${mySeconds}s)...`;
  }, 1000);
}

function myStopTimer() {
  clearInterval(myTimerInterval);
}

// Helper to get the ID of the currently active tab
async function getActiveTabId() {
  // This correctly targets the tab the user is currently looking at,
  // even if the side panel stays open when they switch tabs.
  const [myTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return myTab;
}

// Grabs and summarizes the text from the entire webpage.
async function mySummarizePage() {
  const mySummaryArea = document.getElementById('mySummaryArea');
  myStartTimer(mySummaryArea);

  const myTab = await getActiveTabId();

  // Check for a valid URL (security check for chrome://, etc.)
  if (myTab.url.startsWith('chrome://') || myTab.url.startsWith('chrome-extension://') || myTab.url.startsWith('file://')) {
    myStopTimer();
    mySummaryArea.textContent = 'Error: Cannot summarize this page due to security restrictions.';
    return;
  }

  // Use allFrames: true to ensure content from iframes is also captured.
  const myResults = await chrome.scripting.executeScript({
    target: { tabId: myTab.id },
    func: myGetPageText,
    allFrames: true 
  });

  // Aggregate results from all frames into a single string.
  const allFrameTexts = myResults.map(result => result.result).filter(text => text);
  const myPageText = allFrameTexts.join('\n\n--- Frame Boundary ---\n\n');

  if (myPageText && myPageText.trim().length > 0) {
    const mySummary = await mySummarizeWithPrompt(myPageText);
    myStopTimer();
    mySummaryArea.textContent = mySummary; // Simple text output
  } else {
    myStopTimer();
    mySummaryArea.textContent = 'Could not retrieve text from the page.';
  }
}

// Grabs and summarizes only the text the user has highlighted.
async function mySummarizeSelection() {
  const mySummaryArea = document.getElementById('mySummaryArea');
  myStartTimer(mySummaryArea);

  const myTab = await getActiveTabId();

  // Check for a valid URL
  if (myTab.url.startsWith('chrome://') || myTab.url.startsWith('chrome-extension://') || myTab.url.startsWith('file://')) {
    myStopTimer();
    mySummaryArea.textContent = 'Error: Cannot summarize this page due to security restrictions.';
    return;
  }

  const myResults = await chrome.scripting.executeScript({
    target: { tabId: myTab.id },
    func: myGetSelectedText,
    allFrames: true 
  });
  
  // Get the selected text (only one frame will return a result)
  const mySelectedText = myResults.map(result => result.result).filter(text => text)[0];

  if (mySelectedText) {
    const mySummary = await mySummarizeWithPrompt(mySelectedText);
    myStopTimer();
    mySummaryArea.textContent = mySummary; // Simple text output
  } else {
    myStopTimer();
    mySummaryArea.textContent = 'No text was selected on the page.';
  }
}

// This function is injected to get all text from the page body.
function myGetPageText() {
  return document.body.innerText;
}

// This function is injected to get only the selected text.
function myGetSelectedText() {
  return window.getSelection().toString();
}

// This is the function that uses the chrome.ai API with a prompt (simple text output).
async function mySummarizeWithPrompt(myText) {
  
  const myPrompt = `Summarize the following text, focusing only on the main points and ignoring navigation elements and frame boundaries. The text is:\n\n${myText}`;

  try {
    // Use the chrome.ai API with the format set to "text"
    const result = await chrome.ai.generativeService.prompt({
      prompt: myPrompt,
      config: { format: "text" } // Explicitly request plain text output
    });
    
    return result.text;
    
  } catch (error) {
    console.error('Error using chrome.ai API:', error);
    // Provide a clear user-facing error message upon failure
    return `AI Service Failed. Please ensure the chrome://flags/#enable-built-in-ai flag is set and Chrome is up to date. (Error: ${error.message})`;
  }
}

// Event listeners to handle button clicks.
document.addEventListener('DOMContentLoaded', () => {
  const myFullPageButton = document.getElementById('myFullPageButton');
  const mySelectionButton = document.getElementById('mySelectionButton');

  if (myFullPageButton) {
    myFullPageButton.addEventListener('click', mySummarizePage);
  }
  if (mySelectionButton) {
    mySelectionButton.addEventListener('click', mySummarizeSelection);
  }
});

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

// Grabs and summarizes the text from the entire webpage.
async function mySummarizePage() {
  const mySummaryArea = document.getElementById('mySummaryArea');
  myStartTimer(mySummaryArea);

  const [myTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Check for a valid URL
  if (myTab.url.startsWith('chrome://') || myTab.url.startsWith('chrome-extension://') || myTab.url.startsWith('file://')) {
    myStopTimer();
    mySummaryArea.textContent = 'Error: Cannot summarize this page due to security restrictions.';
    return;
  }

  // --- START OF FRAME-INJECTION CHANGE ---
  // The key addition is 'allFrames: true'
  const myResults = await chrome.scripting.executeScript({
    target: { tabId: myTab.id },
    func: myGetPageText,
    allFrames: true // Inject script into all frames (including iframes)
  });

  // Aggregate results from all frames. Filter out any frames that returned null/undefined.
  const allFrameTexts = myResults.map(result => result.result).filter(text => text);
  
  // Join all text content, separating the content from different frames clearly.
  const myPageText = allFrameTexts.join('\n\n--- Frame Boundary ---\n\n');
  // --- END OF FRAME-INJECTION CHANGE ---

  if (myPageText && myPageText.trim().length > 0) {
    const mySummary = await mySummarizeWithPrompt(myPageText);
    myStopTimer();
    mySummaryArea.textContent = mySummary;
  } else {
    myStopTimer();
    mySummaryArea.textContent = 'Could not retrieve text from the page.';
  }
}

// Grabs and summarizes only the text the user has highlighted.
async function mySummarizeSelection() {
  const mySummaryArea = document.getElementById('mySummaryArea');
  myStartTimer(mySummaryArea);

  const [myTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Check for a valid URL
  if (myTab.url.startsWith('chrome://') || myTab.url.startsWith('chrome-extension://') || myTab.url.startsWith('file://')) {
    myStopTimer();
    mySummaryArea.textContent = 'Error: Cannot summarize this page due to security restrictions.';
    return;
  }

  // --- START OF FRAME-INJECTION CHANGE ---
  // Since selected text only exists in one frame, we don't strictly need allFrames: true,
  // but it's often safer to check everywhere if you aren't certain which frame is active.
  const myResults = await chrome.scripting.executeScript({
    target: { tabId: myTab.id },
    func: myGetSelectedText,
    allFrames: true // Check all frames for user selection
  });
  
  // Aggregate results, finding the *single* selection made by the user.
  const mySelectedText = myResults.map(result => result.result).filter(text => text)[0];
  // --- END OF FRAME-INJECTION CHANGE ---

  if (mySelectedText) {
    const mySummary = await mySummarizeWithPrompt(mySelectedText);
    myStopTimer();
    mySummaryArea.textContent = mySummary;
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

// This is the function that uses the LanguageModel API with a prompt.
async function mySummarizeWithPrompt(myText) {
  if ('LanguageModel' in window) {
    try {
      // NOTE: We wrap the massive text inside the prompt to keep it short.
      const myPrompt = `Summarize the following text, which may contain content from multiple frames of a page. Focus only on the unique, main content and ignore navigational elements and frame separators:\n\n${myText}`;
      
      // Attempt to create the model (which may fail if hardware or model is unavailable)
      const myModel = await LanguageModel.create();
      
      const mySummary = await myModel.prompt(myPrompt);
      return mySummary;
    } catch (error) {
      console.error('Error using LanguageModel API:', error);
      return `Error: Failed to generate summary. The LanguageModel might be temporarily unavailable, or you may need to check the chrome://flags/#enable-built-in-ai flag. (Details: ${error.message})`;
    }
  } else {
    return 'The LanguageModel API is not supported in this browser or is not enabled.';
  }
}

// Event listeners to handle button clicks.
document.addEventListener('DOMContentLoaded', () => {
  const myFullPageButton = document.getElementById('myFullPageButton');
  const mySelectionButton = document.getElementById('mySelectionButton');

  // New: Check API availability on load for better UX
  if (!('LanguageModel' in window)) {
    const mySummaryArea = document.getElementById('mySummaryArea');
    mySummaryArea.textContent = 'Setup Required: The LanguageModel API is missing. Please check the chrome://flags/#enable-built-in-ai flag or update Chrome.';
    if (myFullPageButton) myFullPageButton.disabled = true;
    if (mySelectionButton) mySelectionButton.disabled = true;
  }

  if (myFullPageButton) {
    myFullPageButton.addEventListener('click', mySummarizePage);
  }
  if (mySelectionButton) {
    mySelectionButton.addEventListener('click', mySummarizeSelection);
  }
});

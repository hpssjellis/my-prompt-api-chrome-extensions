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

  const myResults = await chrome.scripting.executeScript({
    target: { tabId: myTab.id },
    func: myGetPageText,
    allFrames: true 
  });

  const allFrameTexts = myResults.map(result => result.result).filter(text => text);
  const myPageText = allFrameTexts.join('\n\n--- Frame Boundary ---\n\n');

  if (myPageText && myPageText.trim().length > 0) {
    const jsonSummary = await mySummarizeWithPrompt(myPageText);
    myStopTimer();

    // --- DISPLAY CHANGE: Display formatted JSON in the summary area ---
    try {
        const summaryObject = JSON.parse(jsonSummary);
        // Convert JSON object to a nicely formatted, readable string
        mySummaryArea.textContent = formatSummary(summaryObject);
    } catch (e) {
        mySummaryArea.textContent = `Error: Failed to parse AI response as JSON.\n\nRaw Response:\n${jsonSummary}`;
    }
    // ----------------------------------------------------------------
    
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

  const myResults = await chrome.scripting.executeScript({
    target: { tabId: myTab.id },
    func: myGetSelectedText,
    allFrames: true 
  });
  
  const mySelectedText = myResults.map(result => result.result).filter(text => text)[0];

  if (mySelectedText) {
    const jsonSummary = await mySummarizeWithPrompt(mySelectedText);
    myStopTimer();
    
    // --- DISPLAY CHANGE: Display formatted JSON in the summary area ---
    try {
        const summaryObject = JSON.parse(jsonSummary);
        mySummaryArea.textContent = formatSummary(summaryObject);
    } catch (e) {
        mySummaryArea.textContent = `Error: Failed to parse AI response as JSON.\n\nRaw Response:\n${jsonSummary}`;
    }
    // ----------------------------------------------------------------
  } else {
    myStopTimer();
    mySummaryArea.textContent = 'No text was selected on the page.';
  }
}

// Utility function to format the JSON summary for the user
function formatSummary(summaryObject) {
    let output = '--- Summarization Complete ---\n\n';
    
    if (summaryObject.summary) {
        summaryObject.summary.forEach((item, index) => {
            output += `\n${index + 1}. Main Idea: ${item.main}\n`;
            output += `   Supporting Detail: ${item.supporting}\n`;
        });
    } else {
         output += "The AI did not return a valid 'summary' array.";
    }
    
    return output;
}


// This function is injected to get all text from the page body.
function myGetPageText() {
  return document.body.innerText;
}

// This function is injected to get only the selected text.
function myGetSelectedText() {
  return window.getSelection().toString();
}


// --- CRITICAL CHANGE: Using chrome.ai for Structured JSON Output ---
async function mySummarizeWithPrompt(myText) {
  // Check if the 'ai' API is available
  if (!chrome.ai) {
    return JSON.stringify({ error: "The chrome.ai API is not available. Ensure you have the 'ai' permission in your manifest and the chrome://flags/#enable-built-in-ai flag is set." });
  }

  // 1. Define the JSON structure (schema) you want the model to follow
  const summarySchema = {
    type: "array",
    items: {
      type: "object",
      properties: {
        main: {
          type: "string",
          description: "The primary main idea or key point from the text."
        },
        supporting: {
          type: "string",
          description: "A short, concise explanation or piece of supporting evidence for the main idea."
        }
      },
      required: ["main", "supporting"]
    }
  };

  // 2. Craft the detailed instruction (prompt)
  const myPrompt = `Analyze the following webpage content. Extract 3 to 5 distinct main ideas and their supporting explanations. Return ONLY the JSON object following the provided schema. Do not include any other text or markdown outside of the JSON array. The text is:\n\n${myText}`;

  // 3. Configure the model call for JSON output
  const config = {
    responseSchema: {
      type: "object",
      properties: {
        summary: summarySchema
      },
      required: ["summary"]
    },
    // Setting 'format: "json"' helps ensure the model outputs raw JSON text
    format: "json" 
  };

  try {
    // Note: The new API uses the service name 'generativeService'
    const result = await chrome.ai.generativeService.prompt({
      prompt: myPrompt,
      config: config
    });
    
    // The result is a JSON string which we return to be parsed and formatted later
    return result.text;
    
  } catch (error) {
    console.error('Error using chrome.ai API for JSON output:', error);
    return JSON.stringify({ 
        error: `Failed to generate summary with chrome.ai. (Details: ${error.message})`,
        advice: "Check the chrome://flags/#enable-built-in-ai flag."
    });
  }
}
// --- END OF CRITICAL CHANGE ---


// Event listeners to handle button clicks.
document.addEventListener('DOMContentLoaded', () => {
  const myFullPageButton = document.getElementById('myFullPageButton');
  const mySelectionButton = document.getElementById('mySelectionButton');

  // Check API availability on load for better UX
  if (!chrome.ai) {
    const mySummaryArea = document.getElementById('mySummaryArea');
    mySummaryArea.textContent = 'Setup Required: The chrome.ai API is missing. Please check the chrome://flags/#enable-built-in-ai flag or ensure Chrome is updated.';
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

import * as fs from 'fs';
import * as path from 'path';

function parseLogs() {
  const logFile = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\64c1209b-aff1-4e18-8caf-c54a459a20aa\\.system_generated\\logs\\transcript_full.jsonl';
  
  if (!fs.existsSync(logFile)) {
    console.error("Log file not found!");
    return;
  }

  const lines = fs.readFileSync(logFile, 'utf8').split('\n');
  console.log(`Searching through ${lines.length} lines of logs...`);
  
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      // Check if this step is a browser subagent step
      if (obj.content && (obj.content.includes('verify') || obj.content.includes('failed') || obj.content.includes('error'))) {
        console.log(`\n--- Step Index: ${obj.step_index}, Type: ${obj.type} ---`);
        console.log(obj.content.substring(0, 1000));
      }
    } catch (e) {
      // ignore JSON parse errors
    }
  }
}

parseLogs();

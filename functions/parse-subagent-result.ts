import * as fs from 'fs';

function parseSubagent() {
  const logFile = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\64c1209b-aff1-4e18-8caf-c54a459a20aa\\.system_generated\\logs\\transcript_full.jsonl';
  if (!fs.existsSync(logFile)) return;

  const lines = fs.readFileSync(logFile, 'utf8').split('\n');
  
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'BROWSER_SUBAGENT') {
        console.log(`=== BROWSER SUBAGENT STEP INDEX ${obj.step_index} ===`);
        console.log(obj.content);
      }
    } catch (e) {}
  }
}

parseSubagent();

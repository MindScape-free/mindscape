
const { jsonRepair } = require('jsonrepair');

function manualRepair(targetText) {
    let extracted = targetText;
    
    // Clean up common AI truncation noise
    extracted = extracted.replace(/\[\s*\.\.\.\s*\]/g, '[]')
        .replace(/\.\.\.\s*\(truncated\)/g, '')
        .replace(/\.\.\./g, '');

    // Step Back Logic
    while (extracted.length > 0 && !/[,:\[\{]\s*$/.test(extracted)) {
        const lastMarker = Math.max(
            extracted.lastIndexOf(','),
            extracted.lastIndexOf(':'),
            extracted.lastIndexOf('['),
            extracted.lastIndexOf('{'),
            extracted.lastIndexOf('"')
        );
        if (lastMarker !== -1) {
            extracted = extracted.substring(0, lastMarker);
        } else {
            break;
        }
    }

    // Remove danging symbol
    extracted = extracted.replace(/[,:\[\{]\s*$/, '').trim();

    // Close structures
    const stack = [];
    let inString = false;
    let isEscaped = false;
    for (let i = 0; i < extracted.length; i++) {
        const char = extracted[i];
        if (isEscaped) { isEscaped = false; continue; }
        if (char === '\\') { isEscaped = true; continue; }
        if (char === '"') { inString = !inString; continue; }
        if (!inString) {
            if (char === '{' || char === '[') stack.push(char);
            else if (char === '}') { if (stack[stack.length - 1] === '{') stack.pop(); }
            else if (char === ']') { if (stack[stack.length - 1] === '[') stack.pop(); }
        }
    }

    while (stack.length > 0) {
        const openChar = stack.pop();
        extracted += (openChar === '{' ? '}' : ']');
    }
    
    return extracted;
}

const testCases = [
    {
        name: "Truncated attribute name",
        input: '{"topic": "Physics", "subTopics": [{"name": "Mechanics", "is',
        expected: true
    },
    {
        name: "Truncated attribute colon",
        input: '{"topic": "Physics", "subTopics": [{"name": "Mechanics", "is":',
        expected: true
    },
    {
        name: "Truncated value",
        input: '{"topic": "Physics", "subTopics": [{"name": "Mechanics", "desc": "The study of',
        expected: true
    }
];

console.log("🚀 Starting JSON Repair Verification...\n");

testCases.forEach(tc => {
    console.log(`Testing: ${tc.name}`);
    console.log(`Input: ${tc.input}`);
    
    let repaired;
    try {
        repaired = jsonRepair(tc.input);
        console.log(`✅ jsonrepair success: ${repaired}`);
    } catch (e) {
        console.warn(`⚠️ jsonrepair failed, trying manual...`);
        repaired = manualRepair(tc.input);
        console.log(`✅ manualRepair success: ${repaired}`);
    }
    
    try {
        const parsed = JSON.parse(repaired);
        console.log(`✅ Final Parse Success: ${JSON.stringify(parsed).substring(0, 50)}...`);
    } catch (e) {
        console.error(`❌ FAILED to parse: ${e.message}`);
    }
    console.log("-" .repeat(20));
});

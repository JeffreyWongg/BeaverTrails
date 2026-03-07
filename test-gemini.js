const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

const ai = new GoogleGenAI({ apiKey: '' });

async function run() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Respond strictly with a JSON object. { "key": "value" }',
      config: {
          responseMimeType: 'application/json',
          temperature: 0.7,
      }
    });
    console.log('SUCCESS:', response.text);
  } catch (err) {
    fs.writeFileSync('gemini-error.json', JSON.stringify(err, null, 2));
    console.log('Error written to gemini-error.json');
  }
}

run();

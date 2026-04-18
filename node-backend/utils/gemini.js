const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");

let genAI, fileManager;

exports.analyzeDocumentWithGemini = async (filePath, departmentNames) => {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("⚠️ GEMINI_API_KEY is not defined. Skipping AI Analysis.");
        return null;
    }

    if (!genAI) {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);
    }

    try {
        console.log(`📤 Uploading to Gemini: ${filePath}...`);
        
        const uploadResult = await fileManager.uploadFile(filePath, { mimeType: "application/pdf" });
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });        
        
        const prompt = `
        You are a Document Sorting AI.
        Here is a list of valid departments: ${departmentNames.join(', ')}.
        Look at this document. Determine which department it belongs to.
        Rules:
        1. Return ONLY a valid JSON object.
        2. Format: { "department": "DepartmentName", "confidence": Integer(0-100) }
        3. If the document is clearly about a department topic, give high confidence (85-100).
        `;

        const result = await model.generateContent([
            { fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } },
            { text: prompt }
        ]);

        const responseText = result.response.text();
        console.log(`🤖 AI RESPONSE: ${responseText}`);
        
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) { 
        console.error("❌ AI Error:", e); 
        return null; 
    }
};
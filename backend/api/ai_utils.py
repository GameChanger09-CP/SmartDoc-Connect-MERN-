import google.generativeai as genai
import tempfile
import os
import json
import re
from dotenv import load_dotenv
# --- CONFIGURATION ---

load_dotenv()
GENAI_API_KEY = "GEMINI_API_KEY"  # ⚠️ REPLACE WITH REAL KEY
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

def analyze_document_with_gemini(uploaded_file, department_names):
    """
    Uploads the file directly to Gemini (handles Scanned PDFs & Images).
    """
    temp_path = None
    try:
        # 1. Create a temporary file on disk (Gemini needs a real file path)
        suffix = os.path.splitext(uploaded_file.name)[1]  # .pdf, .jpg, etc.
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            for chunk in uploaded_file.chunks():
                temp_file.write(chunk)
            temp_path = temp_file.name

        print(f"📤 Uploading to Gemini: {uploaded_file.name}...")

        # 2. Upload file to Gemini's server
        gemini_file = genai.upload_file(temp_path, mime_type="application/pdf")
        
        # 3. Create the Prompt
        prompt = f"""
        You are a Document Sorting AI.
        Here is a list of valid departments: {department_names}.

        Look at this document. Determine which department it belongs to.
        
        Rules:
        1. Return ONLY a valid JSON object.
        2. Format: {{ "department": "DepartmentName", "confidence": Integer(0-100) }}
        3. If the document is clearly about a department topic, give high confidence (85-100).
        4. If it's a scanned image or handwritten, do your best to read it.
        """

        # 4. Generate Content (Image + Text)
        model = genai.GenerativeModel('gemini-flash-latest')
        response = model.generate_content([gemini_file, prompt])
        
        # 5. Extract JSON
        print(f"🤖 AI RESPONSE: {response.text}")
        json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
        
        if json_match:
            return json.loads(json_match.group(0))
        else:
            return None

    except Exception as e:
        print(f"❌ AI ERROR: {e}")
        return None
        
    finally:
        # 6. Cleanup: Delete the temp file from your server
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
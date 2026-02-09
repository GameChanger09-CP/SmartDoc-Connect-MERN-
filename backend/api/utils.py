import google.generativeai as genai
from decouple import config
import PyPDF2
import json

# Configure Gemini
genai.configure(api_key=config('GEMINI_API_KEY'))

def extract_text_from_pdf(file_path):
    """Extracts raw text from the uploaded PDF."""
    try:
        with open(file_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text[:5000] # Limit to first 5000 chars to save tokens
    except Exception as e:
        return ""

def classify_document(file_path, departments):
    """
    Uses Gemini to analyze text and match it with departments.
    departments: List of dicts [{'name': 'Exam', 'keywords': ['fail', 'pass']}]
    """
    # 1. Extract Text
    text_content = extract_text_from_pdf(file_path)
    if not text_content:
        return None, 0.0 # OCR Failed

    # 2. Prepare the AI Prompt
    dept_options = json.dumps(departments)
    
    prompt = f"""
    Act as a Document Classification AI.
    Analyze the following document text and match it to the most relevant department based on their keywords and function.
    
    Departments: {dept_options}
    
    Document Text:
    "{text_content}"
    
    Return ONLY a JSON object with this format (no markdown):
    {{
        "department_name": "Exact Name from list",
        "confidence": 0.85
    }}
    If no department matches well, set confidence low (<0.5).
    """

    # 3. Call Gemini
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        
        # Clean response (sometimes Gemini adds ```json block)
        raw_json = response.text.replace('```json', '').replace('```', '').strip()
        result = json.loads(raw_json)
        
        return result.get('department_name'), float(result.get('confidence', 0.0))
    except Exception as e:
        print(f"AI Error: {e}")
        return None, 0.0
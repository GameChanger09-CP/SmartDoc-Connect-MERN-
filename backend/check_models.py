import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')

if not api_key:
    print("❌ Error: GEMINI_API_KEY not found in .env")
else:
    genai.configure(api_key=api_key)
    print(f"✅ Key found: {api_key[:10]}...")
    print("\n--- AVAILABLE MODELS FOR YOU ---")
    try:
        for m in genai.list_models():
            # Only show models that can generate content
            if 'generateContent' in m.supported_generation_methods:
                print(f"Model Name: {m.name}")
    except Exception as e:
        print(f"❌ Error listing models: {e}")
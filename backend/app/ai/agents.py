import json
import os
from google import genai
from google.genai import types
from typing import List, Dict, Any, Optional

# Standardize initialization using lazy evaluation and safety variables
_ai_client = None

def get_ai_client() -> genai.Client:
    global _ai_client
    if _ai_client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required for AI agents.")
        _ai_client = genai.Client(api_key=api_key)
    return _ai_client

# ============================================================================
# 1. Asset Recommendation Assistant
# ============================================================================
def recommend_assets(prompt: str, available_assets: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Ranks real available assets matching plain-language requirements without hallucinations.
    """
    if not available_assets:
        return {
            "recommendations": [],
            "summary": "No available assets matching the query exist within your organization right now."
        }
        
    ai = get_ai_client()
    assets_context = json.dumps(available_assets)
    
    response = ai.models.generateContent(
        model="gemini-3.6-flash",
        contents=f"User requirement: {prompt}\n\nCandidate Available Assets:\n{assets_context}",
        config=types.GenerateContentConfig(
            systemInstruction=(
                "You are the specialized Asset Recommendation Assistant for AssetFlow.\n"
                "Review the user's plain-language hardware/resource requests and rank the actually-available assets.\n"
                "Rules:\n"
                "1. ONLY recommend assets that are explicitly provided in the available assets list.\n"
                "2. Order the recommendations from best fit (rank 1) to least.\n"
                "3. Cite why they fit and provide a clear, professional, friendly summary."
            ),
            responseMimeType="application/json",
            responseSchema=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "recommendations": types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(
                            type=types.Type.OBJECT,
                            properties={
                                "assetTag": types.Schema(type=types.Type.STRING),
                                "rank": types.Schema(type=types.Type.INTEGER),
                                "confidence": types.Schema(type=types.Type.STRING),
                                "explanation": types.Schema(type=types.Type.STRING)
                            },
                            required=["assetTag", "rank", "confidence", "explanation"]
                        )
                    ),
                    "summary": types.Schema(type=types.Type.STRING)
                },
                required=["recommendations", "summary"]
            )
        )
    )
    return json.loads(response.text)

# ============================================================================
# 2. Smart Resource Booking Assistant
# ============================================================================
def parse_smart_booking(prompt: str, resources: List[Dict[str, Any]], current_time: str) -> Dict[str, Any]:
    """
    Extracts structured booking parameters (resource ID, dates) from natural language instructions.
    """
    ai = get_ai_client()
    resources_context = json.dumps(resources)
    
    response = ai.models.generateContent(
        model="gemini-3.6-flash",
        contents=f"User command: {prompt}\n\nCurrent context time: {current_time}\n\nCorporate resources:\n{resources_context}",
        config=types.GenerateContentConfig(
            systemInstruction=(
                "You are the Smart Resource Booking Assistant for AssetFlow.\n"
                "Deconstruct the user's plain-language request and find the matching resource and slot.\n"
                "Return the exact resource ID and start/end ISO strings (YYYY-MM-DDTHH:mm)."
            ),
            responseMimeType="application/json",
            responseSchema=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "matchedResourceId": types.Schema(type=types.Type.STRING),
                    "matchedResourceName": types.Schema(type=types.Type.STRING),
                    "startTime": types.Schema(type=types.Type.STRING),
                    "endTime": types.Schema(type=types.Type.STRING),
                    "explanation": types.Schema(type=types.Type.STRING)
                },
                required=["matchedResourceId", "matchedResourceName", "startTime", "endTime", "explanation"]
            )
        )
    )
    return json.loads(response.text)

# ============================================================================
# 3. AI Report Generator
# ============================================================================
def generate_strategic_report(stats: Dict[str, Any]) -> str:
    """
    Formulates professional insight summaries from true metric figures (Gemini handles narratives).
    """
    ai = get_ai_client()
    stats_context = json.dumps(stats)
    
    response = ai.models.generateContent(
        model="gemini-3.6-flash",
        contents=f"Quantitative Database Metrics:\n{stats_context}",
        config=types.GenerateContentConfig(
            systemInstruction=(
                "You are the executive AI Report Generator for AssetFlow.\n"
                "Take raw metrics about the company's hardware assets, maintenance logs, and room schedules,\n"
                "and write a high-level strategic narrative.\n"
                "Emphasize trends, status issues, category layouts, and draft 2-3 actionable advice columns.\n"
                "Write in refined, charming Markdown. No conversational headers (e.g. 'Here is your report')."
            )
        )
    )
    return response.text

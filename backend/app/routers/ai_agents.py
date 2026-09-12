import os
from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import (
    AssetRecommendationRequest, SmartBookingRequest, ReportGeneratorRequest
)
from app.ai.agents import recommend_assets, parse_smart_booking, generate_strategic_report

router = APIRouter()

@router.post("/recommend-assets")
@router.post("/recommend")
def get_recommendations(payload: AssetRecommendationRequest):
    """
    Ranks real available inventory assets based on plain-language requirement prompts.
    """
    try:
        results = recommend_assets(payload.prompt, payload.assets)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/smart-booking")
@router.post("/book")
def get_smart_booking(payload: SmartBookingRequest):
    """
    Parses plain text commands to derive structured resource allocation slots.
    """
    try:
        current_time = payload.currentTime or "2026-08-09T09:00"
        results = parse_smart_booking(payload.prompt, payload.resources, current_time)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-report")
@router.post("/report")
def get_strategic_report(payload: ReportGeneratorRequest):
    """
    Formulates professional insight summaries from raw operational stats.
    """
    try:
        report_text = generate_strategic_report(payload.stats)
        return {"report": report_text, "reportMarkdown": report_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

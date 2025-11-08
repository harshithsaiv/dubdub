"""
DubDub Python ML Service
AI-powered language learning features
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
from typing import Optional, List, Dict
import edge_tts
import asyncio
import base64
import io
import os
from openai import AsyncOpenAI

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize OpenAI client
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable is required")
openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

app = FastAPI(
    title="DubDub ML Service",
    description="AI-powered language learning backend with NLP, TTS, and morphology analysis",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Add Private Network Access header for Chrome
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

class PrivateNetworkAccessMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Access-Control-Allow-Private-Network"] = "true"
        return response

app.add_middleware(PrivateNetworkAccessMiddleware)

# ============================================================================
# Request/Response Models
# ============================================================================

class LemmatizeRequest(BaseModel):
    """Request to get lemma (root form) of a word"""
    word: str
    sentence: str
    language: str

class LemmatizeResponse(BaseModel):
    """Response with lemma and morphology"""
    word: str
    lemma: str
    pos: str  # Part of speech
    features: dict  # Morphological features

class DefinitionRequest(BaseModel):
    """Request for context-aware definition"""
    word: str
    sentence: str
    language: str

class DefinitionResponse(BaseModel):
    """Response with context-aware definition"""
    word: str
    lemma: str
    definition: str
    context_score: float
    examples: List[str]
    source: str

class TTSRequest(BaseModel):
    """Request to generate text-to-speech audio"""
    text: str
    language: str
    speed: str = "normal"  # "normal" or "slow"

class TTSResponse(BaseModel):
    """Response with audio data"""
    text: str
    language: str
    speed: str
    audio_base64: str
    duration: float
    sample_rate: int

class IPARequest(BaseModel):
    """Request for IPA pronunciation"""
    word: str
    language: str

class IPAResponse(BaseModel):
    """Response with IPA transcription"""
    word: str
    ipa: str
    syllables: List[str]

# Note: IPA endpoint temporarily disabled due to epitran build issues on Windows
# We'll use alternative methods or spaCy's phonetics features later

# ============================================================================
# Endpoints
# ============================================================================

@app.get("/api/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "dubdub-python-ml",
        "version": "1.0.0"
    }

@app.post("/api/lemmatize", response_model=LemmatizeResponse)
async def lemmatize(request: LemmatizeRequest):
    """
    Get lemma (root form) and morphology of a word using GPT-4
    
    Example:
    {
        "word": "corrió",
        "sentence": "El perro corrió rápidamente",
        "language": "es"
    }
    
    Returns:
    {
        "word": "corrió",
        "lemma": "correr",
        "pos": "VERB",
        "features": {
            "Tense": "Preterite",
            "Person": "Third",
            "Number": "Singular"
        }
    }
    """
    logger.info(f"Lemmatize request: {request.word} ({request.language})")
    
    try:
        # Create a focused prompt for lemmatization
        prompt = f"""You are a linguistics expert. Analyze this word in context:

Word: "{request.word}"
Sentence: "{request.sentence}"
Language: {request.language}

Provide:
1. The lemma (base/dictionary form)
2. Part of speech (NOUN, VERB, ADJ, ADV, etc.)
3. Morphological features (tense, person, number, gender, mood, etc.)

Respond in JSON format:
{{
  "lemma": "base form",
  "pos": "PART_OF_SPEECH",
  "features": {{
    "Feature1": "Value1",
    "Feature2": "Value2"
  }}
}}"""

        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",  # Fast and cheap model
            messages=[
                {"role": "system", "content": "You are a linguistics expert specializing in morphological analysis. Always respond with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=300
        )
        
        import json
        result = json.loads(response.choices[0].message.content)
        
        logger.info(f"GPT-4 lemmatization: {request.word} → {result.get('lemma')}")
        
        return LemmatizeResponse(
            word=request.word,
            lemma=result.get("lemma", request.word),
            pos=result.get("pos", "UNKNOWN"),
            features=result.get("features", {})
        )
        
    except Exception as e:
        logger.error(f"Lemmatization failed: {str(e)}")
        # Fallback to simple rule-based
        return LemmatizeResponse(
            word=request.word,
            lemma=request.word.lower(),
            pos="UNKNOWN",
            features={"error": "AI unavailable, showing word as-is"}
        )

@app.post("/api/definition", response_model=DefinitionResponse)
async def get_definition(request: DefinitionRequest):
    """
    Get context-aware definition using GPT-4
    
    Example:
    {
        "word": "banco",
        "sentence": "Me senté en el banco del parque",
        "language": "es"
    }
    
    Returns context-appropriate definition (park bench, not bank/financial)
    """
    logger.info(f"Definition request: {request.word} in '{request.sentence}'")
    
    try:
        # Create a comprehensive prompt for language learners
        language_names = {
            "en": "English",
            "es": "Spanish",
            "fr": "French",
            "de": "German",
            "it": "Italian",
            "pt": "Portuguese",
            "ja": "Japanese",
            "ko": "Korean",
            "zh": "Chinese",
            "ar": "Arabic",
            "hi": "Hindi"
        }
        lang_name = language_names.get(request.language, request.language)
        
        prompt = f"""You are a language learning tutor. A student clicked on the word "{request.word}" in this sentence:

"{request.sentence}"

Language: {lang_name}

Provide:
1. The base form (lemma) of this word
2. A clear, simple definition that explains what it means IN THIS SPECIFIC CONTEXT
3. 2-3 example sentences showing how this word is commonly used
4. A confidence score (0.0-1.0) for how well the definition matches the context

Respond in JSON format:
{{
  "lemma": "base form of the word",
  "definition": "Simple, context-aware definition in English",
  "context_score": 0.95,
  "examples": [
    "Example sentence 1",
    "Example sentence 2"
  ]
}}

Make the definition beginner-friendly and specific to how the word is used in the given sentence."""

        response = await openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert language tutor who explains words clearly and simply to beginners. Always respond with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.5,
            max_tokens=500
        )
        
        import json
        result = json.loads(response.choices[0].message.content)
        
        logger.info(f"GPT-4 definition: {request.word} → {result.get('definition', '')[:50]}...")
        
        return DefinitionResponse(
            word=request.word,
            lemma=result.get("lemma", request.word),
            definition=result.get("definition", "No definition available"),
            context_score=result.get("context_score", 0.85),
            examples=result.get("examples", []),
            source="gpt-4o-mini"
        )
        
    except Exception as e:
        logger.error(f"Definition lookup failed: {str(e)}")
        # Fallback
        return DefinitionResponse(
            word=request.word,
            lemma=request.word.lower(),
            definition="AI temporarily unavailable. Please try again.",
            context_score=0.0,
            examples=[],
            source="fallback"
        )

@app.post("/api/tts", response_model=TTSResponse)
async def generate_tts(request: TTSRequest):
    """
    Generate text-to-speech audio using edge-tts
    
    Example:
    {
        "text": "Bonjour",
        "language": "fr",
        "speed": "normal"
    }
    
    Returns base64-encoded audio (MP3 format)
    """
    logger.info(f"TTS request: '{request.text}' ({request.language}, {request.speed})")
    
    try:
        # Map language codes to edge-tts voice names
        voice_map = {
            "en": "en-US-AriaNeural",
            "es": "es-ES-ElviraNeural",
            "fr": "fr-FR-DeniseNeural",
            "de": "de-DE-KatjaNeural",
            "it": "it-IT-ElsaNeural",
            "pt": "pt-BR-FranciscaNeural",
            "ja": "ja-JP-NanamiNeural",
            "ko": "ko-KR-SunHiNeural",
            "zh": "zh-CN-XiaoxiaoNeural",
            "ar": "ar-SA-ZariyahNeural",
            "hi": "hi-IN-SwaraNeural",
        }
        
        # Get voice or use default
        voice = voice_map.get(request.language, "en-US-AriaNeural")
        
        # Adjust rate based on speed
        rate = "-20%" if request.speed == "slow" else "+0%"
        
        # Generate TTS audio
        communicate = edge_tts.Communicate(request.text, voice, rate=rate)
        
        # Collect audio chunks in memory
        audio_data = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.write(chunk["data"])
        
        # Encode to base64
        audio_data.seek(0)
        audio_bytes = audio_data.read()
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        # Estimate duration (rough approximation: ~10 chars per second at normal speed)
        duration = len(request.text) / (7 if request.speed == "slow" else 10)
        
        logger.info(f"Generated {len(audio_bytes)} bytes of audio ({duration:.2f}s estimated)")
        
        return TTSResponse(
            text=request.text,
            language=request.language,
            speed=request.speed,
            audio_base64=audio_base64,
            duration=duration,
            sample_rate=24000  # edge-tts default
        )
        
    except Exception as e:
        logger.error(f"TTS generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")

# IPA endpoint temporarily disabled - epitran has C++ build issues on Windows
# @app.post("/api/ipa", response_model=IPAResponse)
# async def get_ipa(request: IPARequest):
#     """Get IPA (International Phonetic Alphabet) pronunciation"""
#     logger.info(f"IPA request: {request.word} ({request.language})")
#     # TODO: Implement epitran or alternative
#     return IPAResponse(
#         word=request.word,
#         ipa="/ˌkəmjuːnɪˈkeɪʃən/",
#         syllables=["kə", "mju", "nɪ", "keɪ", "ʃən"]
#     )

# ============================================================================
# Startup
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )

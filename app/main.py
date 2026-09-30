import os
import shutil
import uuid
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel

from app.config import GEMINI_API_KEY, UPLOAD_DIR
from app.services.gemini_service import GeminiService
from app.services.export_service import ExportService
from app.services.web_service import WebService
from app.services.image_service import ImageService

app = FastAPI(title="Resumo de Conteúdo com IA", description="Resumo inteligente de vídeos, imagens, YouTube, Facebook e websites com exportação")

gemini_service = GeminiService()

STATIC_DIR = Path(__file__).resolve().parent / "static"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

class ExportRequest(BaseModel):
    title: str
    markdown: str

class KeyUpdateRequest(BaseModel):
    api_key: str

class UrlSummarizeRequest(BaseModel):
    url: str
    style: str = "balanced"
    focus: str = "all"
    language: str = "pt-PT"
    custom_instructions: str = ""
    api_key: str = ""

class GenerateIllustrationRequest(BaseModel):
    title: str
    markdown: str
    style: str = "breakdown"
    aspect_ratio: str = "landscape"
    custom_prompt: str = ""

class DownloadIllustrationRequest(BaseModel):
    image_url: str
    title: str = "ilustracao"


@app.get("/")
async def root():
    return FileResponse(STATIC_DIR / "index.html")

@app.get("/favicon.ico")
async def favicon():
    # Retornar ícone SVG embutido
    svg_icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%230f766e" stroke-width="2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>'
    return Response(content=svg_icon, media_type="image/svg+xml")

@app.get("/api/status")
async def get_status():
    has_key = bool(gemini_service.api_key or os.getenv("GEMINI_API_KEY"))
    return {
        "configured": has_key,
        "model": "gemini-2.5-flash"
    }

@app.post("/api/set-key")
async def set_api_key(req: KeyUpdateRequest):
    key = req.api_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="A chave de API não pode estar vazia.")
    gemini_service.set_api_key(key)
    return {"success": True, "message": "Chave API configurada com sucesso."}

@app.post("/api/summarize-url")
async def summarize_url(req: UrlSummarizeRequest):
    if req.api_key:
        gemini_service.set_api_key(req.api_key)

    if not gemini_service.api_key:
        raise HTTPException(
            status_code=400,
            detail="Chave API do Gemini em falta. Por favor, insere a tua chave nas definições da aplicação ou no ficheiro .env."
        )

    if not req.url or not req.url.strip():
        raise HTTPException(status_code=400, detail="Por favor insere um link (URL) válido.")

    temp_video_path = None
    try:
        web_data = await WebService.fetch_url_content(req.url.strip())
        
        if web_data.get("is_downloaded_video"):
            temp_video_path = Path(web_data["file_path"])
            result = gemini_service.summarize_media(
                file_path=temp_video_path,
                style=req.style,
                focus=req.focus,
                language=req.language,
                custom_instructions=req.custom_instructions
            )
            result["title"] = web_data.get("title", result.get("title"))
            return result

        result = gemini_service.summarize_text_content(
            title=web_data["title"],
            text_content=web_data["text"],
            source_url=web_data["url"],
            style=req.style,
            language=req.language,
            custom_instructions=req.custom_instructions
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_video_path and temp_video_path.exists():
            try:
                temp_video_path.unlink()
            except Exception:
                pass

@app.post("/api/summarize")
async def summarize_media(
    file: UploadFile = File(...),
    style: str = Form("balanced"),
    focus: str = Form("all"),
    language: str = Form("pt-PT"),
    custom_instructions: str = Form(""),
    api_key: str = Form("")
):
    if api_key:
        gemini_service.set_api_key(api_key)

    if not gemini_service.api_key:
        raise HTTPException(
            status_code=400,
            detail="Chave API do Gemini em falta. Por favor, insere a tua chave nas definições da aplicação ou no ficheiro .env."
        )

    filename = file.filename or "upload"
    ext = Path(filename).suffix.lower()
    allowed_exts = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".mp4", ".mov", ".avi", ".webm", ".mkv"}
    
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Formato não suportado '{ext}'. Por favor envia uma imagem (PNG, JPG, WEBP) ou vídeo (MP4, MOV, WEBM, MKV)."
        )

    temp_filename = f"{uuid.uuid4().hex}{ext}"
    temp_path = UPLOAD_DIR / temp_filename

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = gemini_service.summarize_media(
            file_path=temp_path,
            style=style,
            focus=focus,
            language=language,
            custom_instructions=custom_instructions
        )
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if temp_path.exists():
            try:
                temp_path.unlink()
            except Exception:
                pass

@app.post("/api/extract-links")
async def extract_links_endpoint(
    file: UploadFile = File(...),
    language: str = Form("pt-PT"),
    api_key: str = Form("")
):
    if api_key:
        gemini_service.set_api_key(api_key)

    if not gemini_service.api_key:
        raise HTTPException(
            status_code=400,
            detail="Chave API do Gemini em falta. Por favor, insere a tua chave nas definições da aplicação ou no ficheiro .env."
        )

    filename = file.filename or "upload"
    ext = Path(filename).suffix.lower()
    allowed_exts = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".mp4", ".mov", ".avi", ".webm", ".mkv"}
    
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Formato não suportado '{ext}'. Por favor envia uma imagem ou vídeo."
        )

    temp_filename = f"links_{uuid.uuid4().hex}{ext}"
    temp_path = UPLOAD_DIR / temp_filename

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = gemini_service.extract_links_from_media(
            file_path=temp_path,
            language=language
        )
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if temp_path.exists():
            try:
                temp_path.unlink()
            except Exception:
                pass

@app.post("/api/export/pdf")
async def export_pdf_endpoint(req: ExportRequest):
    try:
        pdf_bytes = ExportService.export_pdf(req.title, req.markdown)
        clean_filename = "".join(c for c in req.title if c.isalnum() or c in (" ", "_", "-")).rstrip() or "resumo"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{clean_filename}.pdf"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar PDF: {str(e)}")

@app.post("/api/export/docx")
async def export_docx_endpoint(req: ExportRequest):
    try:
        docx_bytes = ExportService.export_docx(req.title, req.markdown)
        clean_filename = "".join(c for c in req.title if c.isalnum() or c in (" ", "_", "-")).rstrip() or "resumo"
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="{clean_filename}.docx"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar DOCX: {str(e)}")

@app.post("/api/export/image")
async def export_image_endpoint(req: ExportRequest):
    try:
        img_bytes = ExportService.export_image(req.title, req.markdown)
        clean_filename = "".join(c for c in req.title if c.isalnum() or c in (" ", "_", "-")).rstrip() or "resumo"
        return Response(
            content=img_bytes,
            media_type="image/png",
            headers={"Content-Disposition": f'attachment; filename="{clean_filename}.png"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar Imagem: {str(e)}")

@app.post("/api/export/markdown")
async def export_markdown_endpoint(req: ExportRequest):
    try:
        clean_filename = "".join(c for c in req.title if c.isalnum() or c in (" ", "_", "-")).rstrip() or "resumo"
        return Response(
            content=req.markdown.encode("utf-8"),
            media_type="text/markdown; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{clean_filename}.md"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar Markdown: {str(e)}")

@app.post("/api/generate-illustration")
async def generate_illustration_endpoint(req: GenerateIllustrationRequest):
    try:
        width, height = 1280, 720
        if req.aspect_ratio == "square":
            width, height = 1024, 1024
        elif req.aspect_ratio == "portrait":
            width, height = 720, 1280

        prompt = req.custom_prompt.strip() if req.custom_prompt and req.custom_prompt.strip() else ""
        if not prompt:
            prompt = gemini_service.generate_image_prompt(
                title=req.title,
                summary_excerpt=req.markdown,
                style=req.style
            )

        image_url = ImageService.build_pollinations_url(
            prompt=prompt,
            width=width,
            height=height,
            model="flux"
        )

        return {
            "success": True,
            "prompt": prompt,
            "image_url": image_url,
            "style": req.style,
            "width": width,
            "height": height
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar ilustração com IA: {str(e)}")

@app.post("/api/download-illustration")
async def download_illustration_endpoint(req: DownloadIllustrationRequest):
    try:
        img_bytes = await ImageService.fetch_image_bytes(req.image_url)
        clean_filename = "".join(c for c in req.title if c.isalnum() or c in (" ", "_", "-")).rstrip() or "ilustracao-ia"
        return Response(
            content=img_bytes,
            media_type="image/jpeg",
            headers={"Content-Disposition": f'attachment; filename="{clean_filename}.jpg"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao descarregar ilustração: {str(e)}")


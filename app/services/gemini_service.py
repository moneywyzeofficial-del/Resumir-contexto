import time
from pathlib import Path
from typing import Optional, Dict, Any, List
from google import genai
from google.genai import types
from app.config import GEMINI_API_KEY, DEFAULT_MODEL

FALLBACK_MODELS = [
    DEFAULT_MODEL,
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-pro-preview",
    "gemini-3-flash-preview",
    "gemini-flash-latest"
]

class GeminiService:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or GEMINI_API_KEY
        if not self.api_key:
            self.client = None
        else:
            self.client = genai.Client(api_key=self.api_key)

    def set_api_key(self, api_key: str):
        self.api_key = api_key
        self.client = genai.Client(api_key=self.api_key)

    def get_mime_type(self, file_path: Path) -> str:
        ext = file_path.suffix.lower()
        mime_map = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp",
            ".gif": "image/gif",
            ".bmp": "image/bmp",
            ".mp4": "video/mp4",
            ".mov": "video/quicktime",
            ".avi": "video/x-msvideo",
            ".webm": "video/webm",
            ".mkv": "video/x-matroska",
        }
        return mime_map.get(ext, "application/octet-stream")

    def is_video(self, file_path: Path) -> bool:
        mime = self.get_mime_type(file_path)
        return mime.startswith("video/")

    def _get_style_instruction(self, style: str) -> str:
        style_prompts = {
            "short": "Cria um resumo executivo ultra conciso, direto ao ponto, com as ideias principais.",
            "balanced": "Cria um resumo equilibrado, bem estruturado, com os pontos mais relevantes e detalhes essenciais.",
            "detailed": "Cria um resumo aprofundado e minucioso, cobrindo todos os tópicos, explicações e dados apresentados.",
            "bullets": "Apresenta o resumo exclusivamente em listas de tópicos com marcadores (bullet points), organizados por secções.",
            "actions": "Foca o resumo nas conclusões, decisões tomadas, tarefas a realizar e passos práticos indicados no conteúdo."
        }
        return style_prompts.get(style, style_prompts["balanced"])

    def _generate_with_fallback(self, contents: List[Any]) -> types.GenerateContentResponse:
        """Tenta gerar conteúdo usando uma lista de modelos com fallback automático."""
        last_err = None
        used_models = []
        for model in FALLBACK_MODELS:
            if model in used_models:
                continue
            used_models.append(model)
            try:
                response = self.client.models.generate_content(
                    model=model,
                    contents=contents
                )
                return response
            except Exception as e:
                last_err = e
                continue
        if last_err:
            raise last_err
        raise RuntimeError("Não foi possível gerar conteúdo com os modelos Gemini disponíveis.")

    def summarize_media(
        self,
        file_path: Path,
        style: str = "balanced",
        focus: str = "all",
        language: str = "pt-PT",
        custom_instructions: str = ""
    ) -> Dict[str, Any]:
        if not self.client:
            raise ValueError("Chave API do Google Gemini não configurada. Por favor, define a tua GEMINI_API_KEY.")

        mime_type = self.get_mime_type(file_path)
        is_vid = self.is_video(file_path)
        style_instruction = self._get_style_instruction(style)

        focus_prompts = {
            "text_ocr": "Dá prioridade máxima ao texto visível (slides, notas, quadros, ecrãs, gráficos, documentos legíveis). Extrai e resume com precisão todo o texto visível.",
            "all": "Analisa tanto o texto visível na imagem/vídeo como todo o contexto visual e sonoro/narrativo."
        }
        focus_instruction = focus_prompts.get(focus, focus_prompts["all"])

        prompt = f"""
És um assistente perito em análise e síntese de conteúdos multimédia (vídeos, apresentações e imagens com texto).
Analisa detalhadamente o ficheiro fornecido e produz um resumo de altíssima qualidade no idioma: {language}.

Diretrizes de Estilo:
- {style_instruction}
- {focus_instruction}
{f"- Instruções adicionais do utilizador: {custom_instructions}" if custom_instructions else ""}

A tua resposta DEVE seguir rigorosamente a seguinte estrutura em Markdown:

# [Título Conciso e Claro do Conteúdo]

## 📌 Resumo Principal
[Um ou dois parágrafos a resumir o tema central e o objetivo do conteúdo]

## 🎯 Pontos-Chave
- [Ponto chave 1 com explicação clara]
- [Ponto chave 2 com explicação clara]
- [Ponto chave 3 com explicação clara]

## 📝 Detalhes e Conteúdo Extraído
[Secção com o desenvolvimento dos tópicos abordados, dados relevantes, fórmulas, citações ou notas de slides extraídas]

## 💡 Conclusões e Ações Recomendadas
- [Conclusão/Ação 1]
- [Conclusão/Ação 2]
"""

        uploaded_file = None
        try:
            if is_vid:
                uploaded_file = self.client.files.upload(file=str(file_path))
                max_wait = 120
                waited = 0
                while uploaded_file.state.name == "PROCESSING" and waited < max_wait:
                    time.sleep(3)
                    waited += 3
                    uploaded_file = self.client.files.get(name=uploaded_file.name)

                if uploaded_file.state.name == "FAILED":
                    raise RuntimeError("O processamento do vídeo falhou na API da Google.")

                response = self._generate_with_fallback(contents=[uploaded_file, prompt])
            else:
                with open(file_path, "rb") as f:
                    image_bytes = f.read()

                part = types.Part.from_bytes(
                    data=image_bytes,
                    mime_type=mime_type
                )
                response = self._generate_with_fallback(contents=[part, prompt])

            summary_text = response.text.strip() if response.text else "Não foi possível gerar um resumo."
            
            title = "Resumo de Conteúdo"
            for line in summary_text.splitlines():
                if line.startswith("# "):
                    title = line.replace("# ", "").strip()
                    break

            return {
                "success": True,
                "title": title,
                "markdown": summary_text,
                "model": DEFAULT_MODEL,
                "file_type": "video" if is_vid else "image"
            }

        finally:
            if uploaded_file:
                try:
                    self.client.files.delete(name=uploaded_file.name)
                except Exception:
                    pass

    def summarize_text_content(
        self,
        title: str,
        text_content: str,
        source_url: str = "",
        style: str = "balanced",
        language: str = "pt-PT",
        custom_instructions: str = ""
    ) -> Dict[str, Any]:
        if not self.client:
            raise ValueError("Chave API do Google Gemini não configurada. Por favor, define a tua GEMINI_API_KEY.")

        style_instruction = self._get_style_instruction(style)

        prompt = f"""
És um assistente perito em sintetizar vídeos do YouTube, artigos, notícias e páginas web.
Analisa o seguinte conteúdo:
Título: {title}
Fonte: {source_url or 'Web / Vídeo'}

Conteúdo e Discurso:
{text_content}

Diretrizes:
- Idioma do Resumo: {language}
- {style_instruction}
{f"- Instruções adicionais do utilizador: {custom_instructions}" if custom_instructions else ""}

A tua resposta DEVE seguir rigorosamente a seguinte estrutura em Markdown:

# [Título Conciso e Claro do Vídeo ou Artigo]

## 📌 Resumo Principal
[Um ou dois parágrafos a resumir o tema central, contexto e mensagem principal]

## 🎯 Pontos-Chave
- [Ponto chave 1 com explicação clara e timestamps relevantes se aplicável]
- [Ponto chave 2 com explicação clara]
- [Ponto chave 3 com explicação clara]

## 📝 Passo a Passo e Conteúdo Detalhado
[Secção com o desenvolvimento detalhado dos procedimentos explicados, produtos usados, técnicas ou argumentos apresentados]

## 💡 Conclusões e Dicas Práticas
- [Dica prática ou conclusão 1]
- [Dica prática ou conclusão 2]
"""

        response = self._generate_with_fallback(contents=[prompt])

        summary_text = response.text.strip() if response.text else "Não foi possível gerar um resumo."
        
        extracted_title = title or "Resumo de Conteúdo"
        for line in summary_text.splitlines():
            if line.startswith("# "):
                extracted_title = line.replace("# ", "").strip()
                break

        return {
            "success": True,
            "title": extracted_title,
            "markdown": summary_text,
            "model": DEFAULT_MODEL,
            "file_type": "url",
            "source_url": source_url
        }

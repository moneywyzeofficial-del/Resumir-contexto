import re
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

def normalize_and_linkify_markdown(text: str) -> str:
    """Garante que todos os links em Markdown são válidos e converte URLs em texto simples em links clicáveis."""
    if not text:
        return ""

    # 1. Normalizar links Markdown existentes [Texto](url) para terem sempre https:// se faltar
    def fix_md_link(match):
        label = match.group(1)
        url = match.group(2).strip()
        if not (url.startswith("http://") or url.startswith("https://") or url.startswith("mailto:") or url.startswith("#")):
            url = "https://" + url
        return f"[{label}]({url})"

    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', fix_md_link, text)

    # 2. Converter URLs soltos que comecem por http://, https:// ou www. que não estejam já dentro de []()
    def linkify_bare_url(match):
        url = match.group(0)
        href = url if url.startswith("http://") or url.startswith("https://") else f"https://{url}"
        return f"[{url}]({href})"

    # Procura URLs que não sejam precedidos por ]( ou ="
    bare_url_pattern = r'(?<!\]\()(?<!=")(?<!\')(https?://[^\s<>\)\]]+|www\.[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}[^\s<>\)\]]*)'
    text = re.sub(bare_url_pattern, linkify_bare_url, text)

    return text

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
            "text_ocr": "Dá prioridade máxima ao texto visível (slides, notas, quadros, ecrãs, gráficos, documentos legíveis). Extrai e resume com precisão todo o texto visível e converte todos os links e URLs encontrados em hiperligações clicáveis.",
            "links_ocr": "Foco prioritário absoluto na deteção, identificação, extração e conversão de todos os links, URLs, websites, domínios, códigos QR e perfis de redes presentes na imagem/vídeo em hiperligações Markdown clicáveis e funcionais.",
            "all": "Analisa tanto o texto visível na imagem/vídeo como todo o contexto visual e sonoro/narrativo. Identifica e converte automaticamente qualquer link ou website visível em hiperligação clicável."
        }
        focus_instruction = focus_prompts.get(focus, focus_prompts["all"])

        prompt = f"""
És um assistente perito em análise, OCR e síntese de conteúdos multimédia (vídeos, apresentações e imagens com texto e links).
Analisa detalhadamente o ficheiro fornecido e produz um resumo de altíssima qualidade no idioma: {language}.

Diretrizes de Estilo & OCR:
- {style_instruction}
- {focus_instruction}
- Deteção e Conversão de Links: Identifica rigorosamente quaisquer links, URLs (ex: https://..., www...., domínios .com, .pt, .org, bit.ly), perfis sociais ou endereços web visíveis na imagem ou vídeo. Converte SEMPRE cada link ou URL em hiperligação Markdown clicável no formato `[Título ou URL](https://...)` (assegura o prefixo https:// para que abra diretamente ao clicar).
- Se existirem links detetados na imagem/vídeo, inclui a secção `## 🔗 Links e Recursos Detetados na Imagem` com a lista organizada de hiperligações funcionais.
{f"- Instruções adicionais do utilizador: {custom_instructions}" if custom_instructions else ""}

A tua resposta DEVE seguir a seguinte estrutura em Markdown:

# [Título Conciso e Claro do Conteúdo]

## 📌 Resumo Principal
[Um ou dois parágrafos a resumir o tema central e o objetivo do conteúdo]

## 🎯 Pontos-Chave
- [Ponto chave 1 com explicação clara]
- [Ponto chave 2 com explicação clara]
- [Ponto chave 3 com explicação clara]

## 📝 Detalhes e Conteúdo Extraído
[Secção com o desenvolvimento dos tópicos abordados, dados relevantes, fórmulas, citações ou notas de slides extraídas]

## 🔗 Links e Recursos Detetados na Imagem
[Lista com todos os links, sites e referências web visíveis na imagem convertidos em hiperligações Markdown clicáveis: ex: - [Nome do Recurso / Website](https://url-extraida.com) - Descrição breve de onde aparece. Se não houver nenhum link visível na imagem, omite esta secção.]

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
            summary_text = normalize_and_linkify_markdown(summary_text)
            
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

    def extract_links_from_media(self, file_path: Path, language: str = "pt-PT") -> Dict[str, Any]:
        """Extrai exclusivamente todos os links e referências web de uma imagem ou vídeo e converte em hiperligações clicáveis."""
        if not self.client:
            raise ValueError("Chave API do Google Gemini não configurada. Por favor, define a tua GEMINI_API_KEY.")

        mime_type = self.get_mime_type(file_path)
        is_vid = self.is_video(file_path)

        prompt = f"""
És um especialista em Visão Computacional, OCR de Alta Resolução e Extração de Links e URLs a partir de ficheiros multimédia.
Analisa detalhadamente a imagem ou vídeo fornecido e identifica rigorosamente TODOS os links, websites, URLs, domínios (ex: .com, .pt, .org, .net, .io, .dev), encurtadores (bit.ly, t.co, etc.), perfis de redes sociais (@handle) ou endereços web visíveis em qualquer parte (banners, slides, capturas de ecrã, cabeçalhos, rodapés, botões ou marcas de água).

Instruções:
1. Extrai cada link/URL com precisão e converte todo o texto de link em hiperligação Markdown clicável: `[Título ou Domínio](https://...)`
2. Certifica-te de que todas as hiperligações têm o protocolo `https://` para que funcionem ao clicar.
3. Formata a resposta no idioma {language} da seguinte forma:

# 🔗 Links e Recursos Detetados na Imagem

## 📋 Lista de Hiperligações Clicáveis
- [Nome/Texto do Link 1](https://url-1.com) — *Contexto: onde e como aparece na imagem*
- [Nome/Texto do Link 2](https://url-2.com) — *Contexto: descrição breve*

## 💡 Resumo do Contexto dos Links
[Um parágrafo breve a explicar para que servem os links detetados e o objetivo do conteúdo]

Se NÃO for encontrado nenhum link, URL ou website visível na imagem, indica claramente:
"Nenhum link ou endereço web foi detetado nesta imagem." e faz um breve resumo do texto visual presente.
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

            result_text = response.text.strip() if response.text else "Não foi possível extrair links."
            result_text = normalize_and_linkify_markdown(result_text)

            # Extrair URLs individuais para retorno estruturado
            found_urls = re.findall(r'\[([^\]]+)\]\((https?://[^)]+)\)', result_text)
            links_list = [{"label": label, "url": url} for label, url in found_urls]

            return {
                "success": True,
                "title": "Links Detetados na Imagem",
                "markdown": result_text,
                "links": links_list,
                "total_links": len(links_list)
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
        summary_text = normalize_and_linkify_markdown(summary_text)
        
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

    def generate_image_prompt(self, title: str, summary_excerpt: str, style: str = "breakdown") -> str:
        """Usa o Gemini para gerar o melhor prompt visual em inglês para o motor de imagem."""
        if not self.client:
            from app.services.image_service import ImageService
            return ImageService.get_prompt_for_style(style, title)

        style_descriptions = {
            "breakdown": "3D exploded view schematic breakdown, isometric deconstructed components, floating parts with technical diagram callouts, octane 3D render, dark minimalist background, 8k",
            "isometric": "3D isometric miniature diorama, smooth clean materials, vibrant lighting, Blender 3D render, modern tech aesthetic, 8k",
            "concept": "Cinematic digital concept art, volumetric lighting, rich detail, artstation trending, 8k wallpaper",
            "editorial": "Modern flat vector editorial illustration, elegant harmonious color palette, clean outlines, Behance graphic design style",
            "photorealistic": "Professional editorial studio photograph, commercial quality, 85mm lens, sharp focus, 8k resolution",
            "watercolor": "Artistic watercolor and ink illustration, delicate washes on textured paper, detailed line art"
        }
        chosen_style = style_descriptions.get(style, style_descriptions["breakdown"])

        meta_prompt = f"""
Based on this title and summary excerpt, write a single concise and highly descriptive English text-to-image prompt (30-45 words).
The prompt MUST capture the core subject in the following visual style:
Style: {chosen_style}

Title: {title}
Context: {summary_excerpt[:600]}

Rules:
- Output ONLY the prompt string in English.
- Do NOT include quotes, explanations or markdown.
"""
        try:
            resp = self._generate_with_fallback(contents=[meta_prompt])
            prompt_text = resp.text.strip().replace('"', '').replace('\n', ' ')
            if len(prompt_text) > 10:
                return prompt_text
        except Exception:
            pass

        from app.services.image_service import ImageService
        return ImageService.get_prompt_for_style(style, title)


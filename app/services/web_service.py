import re
import uuid
from pathlib import Path
from typing import Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup
from youtube_transcript_api import YouTubeTranscriptApi
import yt_dlp
from app.config import UPLOAD_DIR

class WebService:
    @staticmethod
    def is_youtube_url(url: str) -> bool:
        return "youtube.com" in url or "youtu.be" in url

    @staticmethod
    def is_social_video_url(url: str) -> bool:
        social_domains = [
            "facebook.com", "fb.watch", "fb.com", "fb.gg",
            "instagram.com", "tiktok.com", "twitter.com", "x.com", "vimeo.com"
        ]
        return any(domain in url.lower() for domain in social_domains)

    @staticmethod
    def extract_youtube_video_id(url: str) -> Optional[str]:
        patterns = [
            r"(?:v=|\/embed\/|\/v\/|youtu\.be\/|\/shorts\/|\/watch\?v=)([\w-]{11})",
            r"^([\w-]{11})$"
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None

    @classmethod
    async def fetch_youtube_content(cls, url: str) -> Dict[str, Any]:
        """Obtém metadados e a transcrição/legendas de um vídeo do YouTube."""
        video_id = cls.extract_youtube_video_id(url)
        if not video_id:
            raise ValueError("Não foi possível identificar o ID do vídeo do YouTube.")

        video_title = "Vídeo do YouTube"
        author_name = "Canal YouTube"
        thumbnail_url = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"

        try:
            oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(oembed_url)
                if res.status_code == 200:
                    data = res.json()
                    video_title = data.get("title", video_title)
                    author_name = data.get("author_name", author_name)
                    thumbnail_url = data.get("thumbnail_url", thumbnail_url)
        except Exception:
            pass

        transcript_text = ""
        try:
            ytt = YouTubeTranscriptApi()
            fetched_transcript = ytt.fetch(video_id)
            
            formatted_lines = []
            snippets = getattr(fetched_transcript, 'snippets', None)
            
            if snippets:
                for snippet in snippets:
                    start_sec = int(snippet.start)
                    minutes = start_sec // 60
                    seconds = start_sec % 60
                    time_str = f"{minutes:02d}:{seconds:02d}"
                    text = snippet.text.strip()
                    if text and text not in ["[Música]", "[Aplausos]", "[Risos]"]:
                        formatted_lines.append(f"[{time_str}] {text}")
            elif hasattr(fetched_transcript, 'to_raw_data'):
                for item in fetched_transcript.to_raw_data():
                    start_sec = int(item.get('start', 0))
                    minutes = start_sec // 60
                    seconds = start_sec % 60
                    time_str = f"{minutes:02d}:{seconds:02d}"
                    text = item.get('text', '').strip()
                    if text:
                        formatted_lines.append(f"[{time_str}] {text}")

            transcript_text = "\n".join(formatted_lines).strip()

        except Exception as e:
            transcript_text = (
                f"[Aviso: Não foi possível obter legendas para este vídeo ({str(e)}). "
                f"O vídeo intitula-se '{video_title}' do canal '{author_name}']"
            )

        full_content = f"Canal: {author_name}\nVídeo: {video_title}\nLink: https://www.youtube.com/watch?v={video_id}\n\nTranscrição e Discurso do Vídeo:\n{transcript_text}"

        return {
            "title": f"YouTube: {video_title}",
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "text": full_content,
            "is_youtube": True,
            "is_downloaded_video": False,
            "author": author_name,
            "thumbnail_url": thumbnail_url
        }

    @classmethod
    def download_social_video(cls, url: str) -> Dict[str, Any]:
        """Descarrega vídeo público do Facebook/Instagram/TikTok com yt-dlp."""
        temp_id = uuid.uuid4().hex[:8]
        out_template = str(UPLOAD_DIR / f"social_{temp_id}.%(ext)s")

        ydl_opts = {
            'format': 'best[ext=mp4]/best[height<=720]/best',
            'outtmpl': out_template,
            'quiet': True,
            'no_warnings': True,
            'noplaylist': True,
            'max_filesize': 80 * 1024 * 1024, # Máximo 80MB para rapidez
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                title = info.get('title', 'Vídeo do Facebook / Rede Social')
                
                # Encontrar o ficheiro descarregado
                downloaded_files = list(UPLOAD_DIR.glob(f"social_{temp_id}.*"))
                if not downloaded_files:
                    raise ValueError("Ficheiro de vídeo não foi guardado.")

                video_path = downloaded_files[0]
                return {
                    "is_downloaded_video": True,
                    "file_path": video_path,
                    "title": title,
                    "url": url
                }

        except yt_dlp.utils.DownloadError as e:
            err_msg = str(e)
            if "login" in err_msg.lower() or "private" in err_msg.lower() or "permission" in err_msg.lower():
                raise ValueError(
                    "Este vídeo do Facebook é privado ou requer início de sessão. "
                    "Para o resumir, podes descarregar o ficheiro e carregá-lo no separador 'Ficheiro Local'."
                )
            raise ValueError(f"Não foi possível descarregar o vídeo ({err_msg}).")
        except Exception as e:
            raise ValueError(f"Erro ao processar vídeo: {str(e)}")

    @classmethod
    async def fetch_url_content(cls, url: str) -> Dict[str, Any]:
        """Descarrega o conteúdo de uma página web, vídeo do YouTube ou vídeo de redes sociais."""
        clean_url = url.strip()

        # 1. YouTube
        if cls.is_youtube_url(clean_url):
            return await cls.fetch_youtube_content(clean_url)

        # 2. Facebook, Instagram, TikTok, etc.
        if cls.is_social_video_url(clean_url):
            return cls.download_social_video(clean_url)

        # 3. Página Web / Artigo normal
        if not clean_url.startswith("http://") and not clean_url.startswith("https://"):
            clean_url = "https://" + clean_url

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        }

        async with httpx.AsyncClient(follow_redirects=True, timeout=20.0) as client:
            response = await client.get(clean_url, headers=headers)
            response.raise_for_status()
            html = response.text

        soup = BeautifulSoup(html, "html.parser")

        title = ""
        og_title = soup.find("meta", property="og:title")
        if og_title and og_title.get("content"):
            title = og_title["content"].strip()
        elif soup.title and soup.title.string:
            title = soup.title.string.strip()

        for tag in soup(["script", "style", "nav", "footer", "header", "aside", "noscript", "iframe", "svg", "form"]):
            tag.decompose()

        main_content = soup.find("article") or soup.find("main") or soup.find("div", {"role": "main"}) or soup.body

        if not main_content:
            raise ValueError("Não foi possível extrair o conteúdo textual desta página.")

        lines = []
        for element in main_content.find_all(["h1", "h2", "h3", "h4", "p", "li", "blockquote"]):
            text = element.get_text(separator=" ", strip=True)
            if not text:
                continue
            
            tag_name = element.name.lower()
            if tag_name in ["h1", "h2", "h3", "h4"]:
                lines.append(f"\n### {text}\n")
            elif tag_name == "li":
                lines.append(f"- {text}")
            elif tag_name == "blockquote":
                lines.append(f"> {text}")
            else:
                lines.append(text)

        cleaned_text = "\n".join(lines).strip()

        if len(cleaned_text) > 40000:
            cleaned_text = cleaned_text[:40000] + "\n\n... [Conteúdo truncado para otimização]"

        if len(cleaned_text) < 50:
            cleaned_text = soup.get_text(separator="\n", strip=True)

        return {
            "title": title or "Artigo / Página Web",
            "url": str(response.url),
            "text": cleaned_text,
            "is_youtube": False,
            "is_downloaded_video": False
        }

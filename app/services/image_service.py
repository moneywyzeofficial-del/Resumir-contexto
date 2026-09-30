import urllib.parse
import random
import httpx
from typing import Dict, Any, Optional

STYLE_PRESETS = {
    "breakdown": "3D exploded view schematic breakdown of {topic}, isometric deconstructed components, floating parts with technical diagram markers, clean studio lighting, dark minimalist background, octane 3D render, hyper-detailed 8k",
    "isometric": "3D isometric diorama depicting {topic}, clean modern aesthetic, smooth materials, vibrant studio lighting, soft shadows, Blender 3D render, high resolution 8k",
    "concept": "Cinematic concept art illustrating {topic}, dramatic volumetric lighting, futuristic and clean environment, artstation trending, 8k digital painting",
    "editorial": "Modern editorial vector illustration of {topic}, minimalist flat design, sophisticated harmonious color palette, clean outlines, Behance award-winning graphic",
    "photorealistic": "Professional editorial studio photograph representing {topic}, commercial quality, sharp focus, 85mm lens, beautiful depth of field, 8k resolution",
    "watercolor": "Artistic watercolor and fine ink illustration of {topic}, hand-drawn feel, elegant color washes on textured paper, detailed and clean"
}

class ImageService:
    @staticmethod
    def build_pollinations_url(prompt: str, width: int = 1280, height: int = 720, model: str = "flux") -> str:
        """
        Gera o URL direto do Pollinations AI com o modelo FLUX/Turbo.
        100% gratuito e sem necessidade de chave de API.
        """
        seed = random.randint(1000, 999999)
        encoded_prompt = urllib.parse.quote(prompt)
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&model={model}&nologo=true&enhance=true&seed={seed}"
        return url

    @staticmethod
    def get_prompt_for_style(style_key: str, topic: str) -> str:
        template = STYLE_PRESETS.get(style_key, STYLE_PRESETS["breakdown"])
        return template.format(topic=topic)

    @staticmethod
    async def fetch_image_bytes(image_url: str) -> bytes:
        """Descarrega os bytes da imagem gerada pelo Pollinations"""
        async with httpx.AsyncClient(timeout=45.0, follow_redirects=True) as client:
            resp = await client.get(image_url)
            if resp.status_code != 200:
                raise Exception(f"Falha ao descarregar a imagem gerada (HTTP {resp.status_code})")
            return resp.content

import io
import re
from datetime import datetime
from typing import List, Tuple
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from PIL import Image, ImageDraw, ImageFont

class ExportService:
    @staticmethod
    def _parse_markdown_to_blocks(markdown_text: str) -> List[Tuple[str, str]]:
        """Converte markdown simples em blocos (tipo, texto)."""
        lines = markdown_text.splitlines()
        blocks = []
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            if stripped.startswith("# "):
                blocks.append(("h1", stripped[2:].strip()))
            elif stripped.startswith("## "):
                blocks.append(("h2", stripped[3:].strip()))
            elif stripped.startswith("### "):
                blocks.append(("h3", stripped[4:].strip()))
            elif stripped.startswith("- ") or stripped.startswith("* "):
                blocks.append(("bullet", stripped[2:].strip()))
            elif re.match(r"^\d+\.\s+", stripped):
                text_part = re.sub(r"^\d+\.\s+", "", stripped)
                blocks.append(("numbered", text_part))
            else:
                blocks.append(("p", stripped))
        return blocks

    @classmethod
    def export_pdf(cls, title: str, markdown_text: str) -> bytes:
        """Gera um PDF elegante e formatado."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=40,
            rightMargin=40,
            topMargin=40,
            bottomMargin=40
        )

        styles = getSampleStyleSheet()
        
        # Estilos personalizados
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#1e293b"),
            fontName="Helvetica-Bold",
            spaceAfter=8
        )
        
        meta_style = ParagraphStyle(
            'CustomMeta',
            parent=styles['Normal'],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#64748b"),
            fontName="Helvetica",
            spaceAfter=14
        )
        
        h2_style = ParagraphStyle(
            'CustomH2',
            parent=styles['Heading2'],
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#0f766e"),
            fontName="Helvetica-Bold",
            spaceBefore=14,
            spaceAfter=6
        )

        h3_style = ParagraphStyle(
            'CustomH3',
            parent=styles['Heading3'],
            fontSize=11,
            leading=15,
            textColor=colors.HexColor("#334155"),
            fontName="Helvetica-Bold",
            spaceBefore=8,
            spaceAfter=4
        )

        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#334155"),
            fontName="Helvetica",
            spaceAfter=6
        )

        bullet_style = ParagraphStyle(
            'CustomBullet',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#1e293b"),
            fontName="Helvetica",
            leftIndent=15,
            firstLineIndent=-10,
            spaceAfter=4
        )

        story = []

        # Cabeçalho
        clean_title = title.replace("#", "").strip() or "Resumo de Conteúdo"
        story.append(Paragraph(clean_title, title_style))
        data_str = datetime.now().strftime("%d/%m/%Y às %H:%M")
        story.append(Paragraph(f"Gerado em {data_str} • Resumo Inteligente com Google Gemini", meta_style))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0f766e"), spaceAfter=15))

        # Conteúdo
        blocks = cls._parse_markdown_to_blocks(markdown_text)
        for block_type, text in blocks:
            # Limpar tags markdown inline comuns
            formatted_text = text.replace("**", "<b>").replace("__", "<b>")
            # Fechar tags se foram abertas
            count_b = formatted_text.count("<b>")
            if count_b % 2 != 0:
                formatted_text += "</b>"
            elif count_b > 0:
                # Substituir ocorrências alternadas por </b>
                parts = formatted_text.split("<b>")
                reconstructed = parts[0]
                for i in range(1, len(parts)):
                    tag = "</b>" if i % 2 == 0 else "<b>"
                    reconstructed += tag + parts[i]
                formatted_text = reconstructed

            if block_type == "h1" and text != clean_title:
                story.append(Paragraph(formatted_text, title_style))
            elif block_type == "h2":
                story.append(Paragraph(formatted_text, h2_style))
            elif block_type == "h3":
                story.append(Paragraph(formatted_text, h3_style))
            elif block_type == "bullet":
                story.append(Paragraph(f"• {formatted_text}", bullet_style))
            elif block_type == "numbered":
                story.append(Paragraph(f"• {formatted_text}", bullet_style))
            else:
                story.append(Paragraph(formatted_text, body_style))

        doc.build(story)
        return buffer.getvalue()

    @classmethod
    def export_docx(cls, title: str, markdown_text: str) -> bytes:
        """Gera um documento Word (.docx) formatado."""
        doc = Document()

        # Configurar margens
        sections = doc.sections
        for section in sections:
            section.top_margin = Inches(0.8)
            section.bottom_margin = Inches(0.8)
            section.left_margin = Inches(0.8)
            section.right_margin = Inches(0.8)

        # Título principal
        clean_title = title.replace("#", "").strip() or "Resumo de Conteúdo"
        p_title = doc.add_paragraph()
        run_title = p_title.add_run(clean_title)
        run_title.font.name = 'Calibri'
        run_title.font.size = Pt(22)
        run_title.font.bold = True
        run_title.font.color.rgb = RGBColor(15, 118, 110) # Teal
        p_title.paragraph_format.space_after = Pt(2)

        # Metadados
        data_str = datetime.now().strftime("%d/%m/%Y às %H:%M")
        p_meta = doc.add_paragraph()
        run_meta = p_meta.add_run(f"Gerado em {data_str} | Resumo Inteligente com Google Gemini")
        run_meta.font.name = 'Calibri'
        run_meta.font.size = Pt(9.5)
        run_meta.font.color.rgb = RGBColor(100, 116, 139)
        p_meta.paragraph_format.space_after = Pt(14)

        # Blocos
        blocks = cls._parse_markdown_to_blocks(markdown_text)
        for block_type, text in blocks:
            clean_text = text.replace("**", "").replace("__", "")
            if block_type == "h1" and text != clean_title:
                h = doc.add_paragraph()
                r = h.add_run(clean_text)
                r.font.name = 'Calibri'
                r.font.size = Pt(16)
                r.font.bold = True
                r.font.color.rgb = RGBColor(30, 41, 59)
                h.paragraph_format.space_before = Pt(12)
                h.paragraph_format.space_after = Pt(4)
            elif block_type == "h2":
                h = doc.add_paragraph()
                r = h.add_run(clean_text)
                r.font.name = 'Calibri'
                r.font.size = Pt(13)
                r.font.bold = True
                r.font.color.rgb = RGBColor(15, 118, 110)
                h.paragraph_format.space_before = Pt(10)
                h.paragraph_format.space_after = Pt(3)
            elif block_type == "h3":
                h = doc.add_paragraph()
                r = h.add_run(clean_text)
                r.font.name = 'Calibri'
                r.font.size = Pt(11.5)
                r.font.bold = True
                r.font.color.rgb = RGBColor(51, 65, 85)
                h.paragraph_format.space_before = Pt(6)
                h.paragraph_format.space_after = Pt(2)
            elif block_type in ["bullet", "numbered"]:
                p = doc.add_paragraph(style='List Bullet')
                r = p.add_run(clean_text)
                r.font.name = 'Calibri'
                r.font.size = Pt(10.5)
                r.font.color.rgb = RGBColor(30, 41, 59)
                p.paragraph_format.space_after = Pt(3)
            else:
                p = doc.add_paragraph()
                r = p.add_run(clean_text)
                r.font.name = 'Calibri'
                r.font.size = Pt(10.5)
                r.font.color.rgb = RGBColor(51, 65, 85)
                p.paragraph_format.space_after = Pt(5)

        buffer = io.BytesIO()
        doc.save(buffer)
        return buffer.getvalue()

    @classmethod
    def export_image(cls, title: str, markdown_text: str) -> bytes:
        """Gera uma imagem de resumo visual (PNG) com design profissional tipo cartão/infográfico."""
        # Dimensões da imagem (largura fixa, altura dinâmica)
        width = 1200
        padding = 60
        content_width = width - (padding * 2)

        # Tentar carregar fontes padrão do Windows
        try:
            font_title = ImageFont.truetype("arialbd.ttf", 36)
            font_h2 = ImageFont.truetype("arialbd.ttf", 26)
            font_body = ImageFont.truetype("arial.ttf", 20)
            font_bullet = ImageFont.truetype("arial.ttf", 20)
            font_meta = ImageFont.truetype("arial.ttf", 16)
        except Exception:
            font_title = ImageFont.load_default()
            font_h2 = ImageFont.load_default()
            font_body = ImageFont.load_default()
            font_bullet = ImageFont.load_default()
            font_meta = ImageFont.load_default()

        # Quebra de linhas de texto para caber na largura
        def wrap_text(text: str, font, max_w: int) -> List[str]:
            words = text.split()
            lines = []
            cur_line = []
            dummy_img = Image.new('RGB', (10, 10))
            draw = ImageDraw.Draw(dummy_img)

            for w in words:
                cur_line.append(w)
                line_str = " ".join(cur_line)
                bbox = draw.textbbox((0, 0), line_str, font=font)
                w_pixels = bbox[2] - bbox[0]
                if w_pixels > max_w:
                    cur_line.pop()
                    if cur_line:
                        lines.append(" ".join(cur_line))
                    cur_line = [w]
            if cur_line:
                lines.append(" ".join(cur_line))
            return lines or [""]

        # Calcular altura total necessária
        blocks = cls._parse_markdown_to_blocks(markdown_text)
        clean_title = title.replace("#", "").strip() or "Resumo de Conteúdo"
        
        y_cursor = padding + 120 # Espaço para o cabeçalho
        
        layout_items = []
        for block_type, text in blocks:
            clean_text = text.replace("**", "").replace("__", "")
            if block_type == "h1" and text == clean_title:
                continue
            if block_type == "h2":
                y_cursor += 25
                layout_items.append(("h2", [clean_text], y_cursor))
                y_cursor += 36
            elif block_type == "h3":
                y_cursor += 15
                layout_items.append(("h3", [clean_text], y_cursor))
                y_cursor += 30
            elif block_type in ["bullet", "numbered"]:
                wrapped = wrap_text(f"•  {clean_text}", font_bullet, content_width - 20)
                layout_items.append(("bullet", wrapped, y_cursor))
                y_cursor += (len(wrapped) * 28) + 8
            else:
                wrapped = wrap_text(clean_text, font_body, content_width)
                layout_items.append(("p", wrapped, y_cursor))
                y_cursor += (len(wrapped) * 28) + 10

        total_height = max(y_cursor + padding + 60, 800)

        # Criar imagem final
        img = Image.new('RGB', (width, total_height), color=(248, 250, 252)) # slate-50
        draw = ImageDraw.Draw(img)

        # Fundo do cartão principal com sombra suave
        card_x1, card_y1 = padding - 20, padding - 20
        card_x2, card_y2 = width - padding + 20, total_height - padding + 20
        draw.rounded_rectangle([card_x1, card_y1, card_x2, card_y2], radius=24, fill=(255, 255, 255), outline=(226, 232, 240), width=2)

        # Barra superior decorativa com cor de destaque Teal
        draw.rounded_rectangle([card_x1, card_y1, card_x2, card_y1 + 16], radius=8, fill=(15, 118, 110))

        # Título
        wrapped_title = wrap_text(clean_title, font_title, content_width)
        title_y = padding + 15
        for t_line in wrapped_title:
            draw.text((padding, title_y), t_line, font=font_title, fill=(30, 41, 59))
            title_y += 44

        # Metadados
        data_str = datetime.now().strftime("%d/%m/%Y às %H:%M")
        meta_text = f"Gerado em {data_str} • Resumo Inteligente com Google Gemini"
        draw.text((padding, title_y + 4), meta_text, font=font_meta, fill=(100, 116, 139))

        # Linha separadora
        sep_y = title_y + 35
        draw.line([(padding, sep_y), (width - padding, sep_y)], fill=(226, 232, 240), width=2)

        # Desenhar blocos de conteúdo
        for item_type, lines, y_pos in layout_items:
            # Ajustar y_pos relativo ao novo separador se necessário
            cur_y = y_pos + (title_y - (padding + 15))
            if item_type == "h2":
                draw.text((padding, cur_y), lines[0], font=font_h2, fill=(15, 118, 110))
            elif item_type == "h3":
                draw.text((padding, cur_y), lines[0], font=font_h2, fill=(51, 65, 85))
            elif item_type == "bullet":
                for idx, line in enumerate(lines):
                    draw.text((padding + (15 if idx > 0 else 0), cur_y + (idx * 28)), line, font=font_bullet, fill=(30, 41, 59))
            else:
                for idx, line in enumerate(lines):
                    draw.text((padding, cur_y + (idx * 28)), line, font=font_body, fill=(51, 65, 85))

        # Rodapé
        footer_y = total_height - padding
        draw.text((padding, footer_y), "Resumo de Conteúdo • Powered by Google Gemini AI", font=font_meta, fill=(148, 163, 184))

        buffer = io.BytesIO()
        img.save(buffer, format="PNG", quality=95)
        return buffer.getvalue()

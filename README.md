# Resumo de Conteúdo com IA (Vídeos Locais, YouTube, Imagens & Websites)

Aplicação web local moderna para resumir:
- 🎬 **Vídeos Locais:** `.mp4`, `.mov`, `.webm`, `.avi`, `.mkv`
- 📺 **Vídeos do YouTube:** Links diretos (`youtube.com/watch?v=...`, `youtu.be/...`, `shorts`)
- 🖼️ **Imagens com Texto (OCR):** Slides de apresentações, capturas de ecrã, quadros, documentos
- 🌐 **Websites & Artigos:** Notícias, documentação e blog posts

Com síntese inteligente via **Google Gemini API** e exportação para **PDF**, **Word (.docx)**, **Imagem (PNG)** e **Markdown**.

---

## 🚀 Como Iniciar Rápido (Windows)

Basta dar duplo clique no ficheiro:
```cmd
run.bat
```
O script verifica as dependências, inicia o servidor e abre automaticamente o browser em `http://localhost:8000`.

---

## 🔑 Configuração da Chave API (Google Gemini)

Podes configurar a chave de duas formas:
1. **Pela Interface Web:** Clica no botão **"Chave API"** no topo da página e cola a tua chave.
2. **No ficheiro `.env`:** Cria ou edita o ficheiro `.env` na raiz do projeto:
   ```env
   GEMINI_API_KEY=a_tua_chave_aqui
   ```
   *(Podes obter a chave gratuitamente no [Google AI Studio](https://aistudio.google.com/app/apikey)).*

---

## 🌟 Funcionalidades

- **Múltiplas Fontes de Conteúdo:**
  - **Ficheiro Local:** Vídeos e imagens com análise visual e OCR.
  - **Link:** Websites normais ou vídeos do YouTube com extração instantânea de transcrições e timestamps.
- **Personalização do Resumo:**
  - Estilos: *Equilibrado*, *Executivo/Curto*, *Detalhado*, *Tópicos*, *Ações e Decisões*.
  - Idioma: Português (Europeu ou Brasil), Inglês, Espanhol, Francês.
- **Editor em Tempo Real:**
  - Pré-visualização formatada ou edição direta do texto antes de descarregar.
- **Centro de Exportação:**
  - **PDF:** Documento formatado pronto para imprimir ou arquivar.
  - **Word (.docx):** Ficheiro editável com estilos de títulos e listas.
  - **Imagem (.png):** Cartão resumo visual de alta resolução tipo infográfico.
  - **Markdown / Copiar:** Descarregamento direto ou cópia para a área de transferência.

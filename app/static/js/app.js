// Variáveis de Estado
let currentInputMode = "file";
let currentFile = null;
let currentTitle = "Resumo de Conteúdo";
let currentMarkdown = "";
let currentViewTab = "preview";
let activeVisualTemplate = "infographic";
let easyMDEInstance = null;

// Inicialização da Página
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  checkApiStatus();
  initEasyMDE();
});

// Inicializar Editor Rico Open-Source EasyMDE
function initEasyMDE() {
  const textarea = document.getElementById('summaryEasyMDE');
  if (textarea && !easyMDEInstance && window.EasyMDE) {
    easyMDEInstance = new EasyMDE({
      element: textarea,
      spellChecker: false,
      placeholder: "Edita o resumo aqui...",
      status: false,
      toolbar: [
        "bold", "italic", "heading", "|",
        "quote", "unordered-list", "ordered-list", "|",
        "link", "table", "|",
        "preview", "side-by-side", "fullscreen"
      ],
      minHeight: "350px",
      autoDownloadFontAwesome: false
    });

    easyMDEInstance.codemirror.on("change", () => {
      currentMarkdown = easyMDEInstance.value();
      updateTitleFromMarkdown();
    });
  }
}

function updateTitleFromMarkdown() {
  for (const line of currentMarkdown.split('\n')) {
    if (line.startsWith('# ')) {
      currentTitle = line.replace('# ', '').trim();
      break;
    }
  }
}

// Elementos do DOM
const modeFileBtn = document.getElementById('modeFileBtn');
const modeUrlBtn = document.getElementById('modeUrlBtn');
const fileInputSection = document.getElementById('fileInputSection');
const urlInputSection = document.getElementById('urlInputSection');
const websiteUrlInput = document.getElementById('websiteUrlInput');
const pasteUrlBtn = document.getElementById('pasteUrlBtn');
const focusWrapper = document.getElementById('focusWrapper');

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const dropZonePrompt = document.getElementById('dropZonePrompt');
const filePreviewContainer = document.getElementById('filePreviewContainer');
const imagePreviewWrapper = document.getElementById('imagePreviewWrapper');
const imagePreview = document.getElementById('imagePreview');
const videoPreviewWrapper = document.getElementById('videoPreviewWrapper');
const videoPreview = document.getElementById('videoPreview');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const removeFileBtn = document.getElementById('removeFileBtn');

const summaryStyle = document.getElementById('summaryStyle');
const summaryFocus = document.getElementById('summaryFocus');
const summaryLanguage = document.getElementById('summaryLanguage');
const customInstructions = document.getElementById('customInstructions');
const generateBtn = document.getElementById('generateBtn');

const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const loadingTitle = document.getElementById('loadingTitle');
const loadingDesc = document.getElementById('loadingDesc');
const summaryPreview = document.getElementById('summaryPreview');
const editorWrapper = document.getElementById('editorWrapper');
const exportToolbar = document.getElementById('exportToolbar');
const viewTabs = document.getElementById('viewTabs');
const tabPreview = document.getElementById('tabPreview');
const tabEdit = document.getElementById('tabEdit');

const printA4Btn = document.getElementById('printA4Btn');
const openStudioBtn = document.getElementById('openStudioBtn');
const visualStudioModal = document.getElementById('visualStudioModal');
const closeStudioBtn = document.getElementById('closeStudioBtn');
const cancelStudioBtn = document.getElementById('cancelStudioBtn');
const downloadStudioImgBtn = document.getElementById('downloadStudioImgBtn');
const visualCanvasContainer = document.getElementById('visualCanvasContainer');

const exportPdfBtn = document.getElementById('exportPdfBtn');
const exportDocxBtn = document.getElementById('exportDocxBtn');
const exportMarkdownBtn = document.getElementById('exportMarkdownBtn');
const copyBtn = document.getElementById('copyBtn');

const apiKeyStatusBadge = document.getElementById('apiKeyStatusBadge');
const settingsModal = document.getElementById('settingsModal');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const apiKeyInput = document.getElementById('apiKeyInput');

// Toast Notification
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  const toastIcon = document.getElementById('toastIcon');

  toastMessage.textContent = message;
  toastIcon.setAttribute('data-lucide', isError ? 'alert-circle' : 'check-circle');
  toastIcon.className = `w-4 h-4 ${isError ? 'text-red-400' : 'text-emerald-400'}`;

  if (window.lucide) lucide.createIcons();

  toast.classList.remove('translate-y-20', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');

  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 3500);
}

// Alternar entre modo Ficheiro e modo URL
modeFileBtn.addEventListener('click', () => {
  currentInputMode = "file";
  modeFileBtn.className = "flex-1 py-2 rounded-lg bg-white text-slate-900 shadow-sm flex items-center justify-center space-x-1.5 transition-all";
  modeUrlBtn.className = "flex-1 py-2 rounded-lg text-slate-600 hover:text-slate-900 flex items-center justify-center space-x-1.5 transition-all";
  fileInputSection.classList.remove('hidden');
  urlInputSection.classList.add('hidden');
  focusWrapper.classList.remove('hidden');
});

modeUrlBtn.addEventListener('click', () => {
  currentInputMode = "url";
  modeUrlBtn.className = "flex-1 py-2 rounded-lg bg-white text-slate-900 shadow-sm flex items-center justify-center space-x-1.5 transition-all";
  modeFileBtn.className = "flex-1 py-2 rounded-lg text-slate-600 hover:text-slate-900 flex items-center justify-center space-x-1.5 transition-all";
  fileInputSection.classList.add('hidden');
  urlInputSection.classList.remove('hidden');
  focusWrapper.classList.add('hidden');
  websiteUrlInput.focus();
});

// Colar URL
pasteUrlBtn.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      websiteUrlInput.value = text.trim();
      showToast("Link colado com sucesso!");
    }
  } catch (err) {
    showToast("Não foi possível aceder à área de transferência.", true);
  }
});

// Verificar estado da API
async function checkApiStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.configured) {
      apiKeyStatusBadge.className = "hidden sm:flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200";
      apiKeyStatusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span><span>Gemini API Pronta</span>`;
    } else {
      apiKeyStatusBadge.className = "hidden sm:flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer";
      apiKeyStatusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-500 mr-2 animate-pulse"></span><span>Configurar Chave API</span>`;
      apiKeyStatusBadge.onclick = () => settingsModal.classList.remove('hidden');
    }
  } catch (err) {
    console.error(err);
  }
}

// Modal de Chave API
openSettingsBtn.addEventListener('click', () => {
  settingsModal.classList.remove('hidden');
  apiKeyInput.focus();
});
const closeModal = () => settingsModal.classList.add('hidden');
closeSettingsBtn.addEventListener('click', closeModal);
cancelSettingsBtn.addEventListener('click', closeModal);

saveApiKeyBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    showToast("Por favor insere uma chave válida.", true);
    return;
  }
  try {
    const res = await fetch('/api/set-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key })
    });
    const data = await res.json();
    if (res.ok) {
      showToast("Chave API guardada com sucesso!");
      closeModal();
      checkApiStatus();
      localStorage.setItem("gemini_api_key", key);
    } else {
      showToast(data.detail || "Erro ao guardar chave.", true);
    }
  } catch (err) {
    showToast("Erro na ligação com o servidor.", true);
  }
});

// Drag and Drop
['dragenter', 'dragover'].forEach(eventName => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
});
['dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
  });
});

dropZone.addEventListener('drop', (e) => {
  const files = e.dataTransfer.files;
  if (files && files.length > 0) handleFileSelection(files[0]);
});
fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files.length > 0) handleFileSelection(e.target.files[0]);
});

function handleFileSelection(file) {
  currentFile = file;
  fileNameDisplay.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
  dropZonePrompt.classList.add('hidden');
  filePreviewContainer.classList.remove('hidden');

  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      imagePreviewWrapper.classList.remove('hidden');
      videoPreviewWrapper.classList.add('hidden');
      videoPreview.pause();
    };
    reader.readAsDataURL(file);
  } else if (file.type.startsWith('video/')) {
    videoPreview.src = URL.createObjectURL(file);
    videoPreviewWrapper.classList.remove('hidden');
    imagePreviewWrapper.classList.add('hidden');
  }
  if (window.lucide) lucide.createIcons();
}

removeFileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  currentFile = null;
  fileInput.value = '';
  imagePreview.src = '';
  videoPreview.src = '';
  filePreviewContainer.classList.add('hidden');
  dropZonePrompt.classList.remove('hidden');
});

// Separadores Formatado / Editar (EasyMDE)
tabPreview.addEventListener('click', () => {
  if (currentViewTab === "preview") return;
  currentViewTab = "preview";
  tabPreview.className = "px-3 py-1.5 rounded-md bg-white text-slate-800 shadow-sm transition-all flex items-center gap-1.5";
  tabEdit.className = "px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5";

  if (easyMDEInstance) {
    currentMarkdown = easyMDEInstance.value();
    updateTitleFromMarkdown();
  }
  summaryPreview.innerHTML = marked.parse(currentMarkdown);
  editorWrapper.classList.add('hidden');
  summaryPreview.classList.remove('hidden');
});

tabEdit.addEventListener('click', () => {
  if (currentViewTab === "edit") return;
  currentViewTab = "edit";
  tabEdit.className = "px-3 py-1.5 rounded-md bg-white text-slate-800 shadow-sm transition-all flex items-center gap-1.5";
  tabPreview.className = "px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5";

  if (easyMDEInstance) {
    easyMDEInstance.value(currentMarkdown);
  }
  summaryPreview.classList.add('hidden');
  editorWrapper.classList.remove('hidden');
});

// Ação de Gerar Resumo
generateBtn.addEventListener('click', async () => {
  const savedLocalKey = localStorage.getItem("gemini_api_key") || "";

  if (currentInputMode === "file" && !currentFile) {
    showToast("Por favor carrega uma imagem ou vídeo primeiro.", true);
    return;
  }
  if (currentInputMode === "url") {
    const url = websiteUrlInput.value.trim();
    if (!url) {
      showToast("Por favor insere o link do vídeo ou website.", true);
      return;
    }
  }

  generateBtn.disabled = true;
  emptyState.classList.add('hidden');
  summaryPreview.classList.add('hidden');
  editorWrapper.classList.add('hidden');
  exportToolbar.classList.add('hidden');
  viewTabs.classList.add('hidden');
  loadingState.classList.remove('hidden');

  if (currentInputMode === "url") {
    loadingTitle.textContent = "A extrair e processar link...";
    loadingDesc.textContent = "A analisar transcrições/conteúdo e a estruturar o resumo.";
  } else {
    loadingTitle.textContent = "A analisar ficheiro com IA...";
    loadingDesc.textContent = "A examinar imagem, vídeo e texto para gerar a síntese.";
  }

  try {
    let res;
    if (currentInputMode === "file") {
      const formData = new FormData();
      formData.append('file', currentFile);
      formData.append('style', summaryStyle.value);
      formData.append('focus', summaryFocus.value);
      formData.append('language', summaryLanguage.value);
      formData.append('custom_instructions', customInstructions.value.trim());
      if (savedLocalKey) formData.append('api_key', savedLocalKey);

      res = await fetch('/api/summarize', { method: 'POST', body: formData });
    } else {
      res = await fetch('/api/summarize-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: websiteUrlInput.value.trim(),
          style: summaryStyle.value,
          focus: summaryFocus.value,
          language: summaryLanguage.value,
          custom_instructions: customInstructions.value.trim(),
          api_key: savedLocalKey
        })
      });
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Erro ao processar o conteúdo.");

    currentMarkdown = data.markdown;
    currentTitle = data.title || "Resumo de Conteúdo";

    summaryPreview.innerHTML = marked.parse(currentMarkdown);
    if (easyMDEInstance) easyMDEInstance.value(currentMarkdown);

    loadingState.classList.add('hidden');
    summaryPreview.classList.remove('hidden');
    exportToolbar.classList.remove('hidden');
    viewTabs.classList.remove('hidden');

    showToast("Resumo gerado com sucesso!");
    if (window.lucide) lucide.createIcons();

  } catch (err) {
    console.error(err);
    loadingState.classList.add('hidden');
    emptyState.classList.remove('hidden');
    showToast(err.message, true);
  } finally {
    generateBtn.disabled = false;
  }
});

// =========================================================
// IMPRESSÃO A4 COM PAGINAÇÃO INTELIGENTE
// =========================================================
printA4Btn.addEventListener('click', () => {
  if (currentViewTab === "edit" && easyMDEInstance) {
    currentMarkdown = easyMDEInstance.value();
    summaryPreview.innerHTML = marked.parse(currentMarkdown);
  }
  window.print();
});

// =========================================================
// MOTOR VISUAL MULTI-ESTILOS (ESTÚDIO VISUAL)
// =========================================================
openStudioBtn.addEventListener('click', () => {
  if (currentViewTab === "edit" && easyMDEInstance) {
    currentMarkdown = easyMDEInstance.value();
    updateTitleFromMarkdown();
  }
  renderVisualCanvas(activeVisualTemplate);
  visualStudioModal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
});

const closeStudio = () => visualStudioModal.classList.add('hidden');
closeStudioBtn.addEventListener('click', closeStudio);
cancelStudioBtn.addEventListener('click', closeStudio);

// Seletor de Estilos no Modal
document.querySelectorAll('.style-select-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.style-select-btn').forEach(b => {
      b.className = "style-select-btn px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all flex items-center gap-1.5";
    });
    const target = e.currentTarget;
    target.className = "style-select-btn px-3 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white shadow-sm transition-all flex items-center gap-1.5";
    activeVisualTemplate = target.getAttribute('data-style');
    renderVisualCanvas(activeVisualTemplate);
  });
});

// Parser de Markdown em Secções Estruturadas
function parseMarkdownSections(md) {
  const sections = [];
  let currentSection = { title: "Visão Geral", items: [], text: "" };
  const lines = md.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      // Título principal ignorado nas secções
      continue;
    } else if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      if (currentSection.items.length > 0 || currentSection.text.trim()) {
        sections.push(currentSection);
      }
      currentSection = { title: trimmed.replace(/^#+\s*/, ''), items: [], text: "" };
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s+/.test(trimmed)) {
      currentSection.items.push(trimmed.replace(/^[-*]\s+|\d+\.\s+/, ''));
    } else if (trimmed) {
      currentSection.text += (currentSection.text ? " " : "") + trimmed;
    }
  }
  if (currentSection.items.length > 0 || currentSection.text.trim()) {
    sections.push(currentSection);
  }
  return sections;
}

// Renderizar o Design Selecionado no Container
function renderVisualCanvas(style) {
  const sections = parseMarkdownSections(currentMarkdown);
  const nowStr = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  let html = "";

  if (style === "infographic") {
    html = `
      <div class="template-infographic p-8 space-y-6">
        <div class="border-b border-slate-200 pb-5">
          <div class="inline-block px-3 py-1 bg-brand-100 text-brand-800 rounded-full text-xs font-bold uppercase tracking-wider mb-2">Resumo Inteligente</div>
          <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">${currentTitle}</h1>
          <p class="text-xs text-slate-500 mt-2">Síntese visual gerada em ${nowStr}</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${sections.map((sec, idx) => `
            <div class="card-box p-5 ${idx === 0 ? 'md:col-span-2 bg-gradient-to-r from-teal-50/50 to-emerald-50/50 border-teal-200' : ''}">
              <h3 class="text-base font-bold text-teal-800 mb-2.5 flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
                ${sec.title}
              </h3>
              ${sec.text ? `<p class="text-xs sm:text-sm text-slate-700 leading-relaxed mb-3">${sec.text}</p>` : ''}
              ${sec.items.length > 0 ? `
                <ul class="space-y-1.5 text-xs sm:text-sm text-slate-800">
                  ${sec.items.map(item => `<li class="flex items-start gap-2"><span class="text-teal-600 font-bold">•</span><span>${item}</span></li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (style === "handwritten") {
    html = `
      <div class="template-handwritten p-8 space-y-6 relative border-4 border-slate-800 rounded-2xl bg-amber-50/30">
        <div class="border-b-2 border-dashed border-slate-700 pb-4 text-center">
          <h1 class="font-bold">${currentTitle}</h1>
          <p class="text-lg text-slate-600 mt-1">Notas e Destaques • ${nowStr}</p>
        </div>
        <div class="space-y-6">
          ${sections.map(sec => `
            <div class="p-4 border-2 border-slate-700 rounded-xl bg-white shadow-sm">
              <h2 class="font-bold border-b border-slate-300 pb-1 mb-2">${sec.title}</h2>
              ${sec.text ? `<p class="text-lg text-slate-800 mb-2">${sec.text}</p>` : ''}
              ${sec.items.length > 0 ? `
                <ul class="space-y-1 text-lg text-slate-900">
                  ${sec.items.map(item => `<li>👉 ${item}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (style === "postits") {
    const colors = ["postit-yellow", "postit-cyan", "postit-pink", "postit-green"];
    html = `
      <div class="template-postits p-8 space-y-6">
        <div class="text-center pb-4">
          <h1 class="text-2xl font-bold text-slate-800">${currentTitle}</h1>
          <p class="text-xs text-slate-500 mt-1">Quadro de Notas Rápidas • ${nowStr}</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          ${sections.map((sec, idx) => `
            <div class="${colors[idx % colors.length]} p-5 rounded-xl border border-black/10">
              <div class="w-3 h-3 rounded-full bg-red-400 mx-auto mb-2 shadow-sm border border-red-500"></div>
              <h3 class="font-bold text-sm text-slate-900 mb-2 border-b border-black/10 pb-1">${sec.title}</h3>
              ${sec.text ? `<p class="text-xs text-slate-800 mb-2 leading-relaxed">${sec.text}</p>` : ''}
              ${sec.items.map(item => `<p class="text-xs text-slate-900 font-medium mb-1">📌 ${item}</p>`).join('')}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (style === "bento") {
    html = `
      <div class="template-bento p-8 space-y-6 rounded-2xl">
        <div class="border-b border-slate-800 pb-4">
          <span class="text-[11px] font-mono uppercase tracking-widest text-teal-400">Bento Summary</span>
          <h1 class="text-2xl sm:text-3xl font-bold text-white mt-1">${currentTitle}</h1>
          <p class="text-xs text-slate-400 mt-1">Linear UI Layout • ${nowStr}</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${sections.map((sec, idx) => `
            <div class="bento-item p-5 ${idx === 0 ? 'md:col-span-2' : ''} ${idx === 1 ? 'md:col-span-1' : ''}">
              <h3 class="text-sm font-bold text-teal-300 mb-2 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-teal-400"></span>
                ${sec.title}
              </h3>
              ${sec.text ? `<p class="text-xs text-slate-300 leading-relaxed mb-3">${sec.text}</p>` : ''}
              ${sec.items.length > 0 ? `
                <ul class="space-y-1.5 text-xs text-slate-200">
                  ${sec.items.map(item => `<li class="flex items-start gap-1.5"><span class="text-teal-400">›</span><span>${item}</span></li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (style === "timeline") {
    html = `
      <div class="template-timeline p-8 space-y-6">
        <div class="border-b border-slate-200 pb-4">
          <h1 class="text-2xl font-bold text-slate-900">${currentTitle}</h1>
          <p class="text-xs text-slate-500 mt-1">Linha do Tempo e Passos • ${nowStr}</p>
        </div>
        <div class="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-teal-300">
          ${sections.map((sec, idx) => `
            <div class="relative">
              <div class="absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full bg-teal-600 border-2 border-white shadow"></div>
              <h3 class="text-sm font-bold text-teal-800 mb-1">Passo ${idx + 1}: ${sec.title}</h3>
              ${sec.text ? `<p class="text-xs text-slate-700 leading-relaxed mb-2">${sec.text}</p>` : ''}
              ${sec.items.map(item => `<p class="text-xs text-slate-800 font-medium pl-2 border-l border-slate-200 my-1">⏱️ ${item}</p>`).join('')}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (style === "editorial") {
    html = `
      <div class="template-editorial p-8 space-y-6 bg-[#fdfbf7] border-t-8 border-slate-900">
        <div class="text-center border-b-2 border-slate-900 pb-4">
          <p class="text-xs tracking-widest uppercase font-bold text-slate-600">Edição Especial de Síntese</p>
          <h1 class="text-3xl font-bold text-slate-900 mt-2">${currentTitle}</h1>
          <p class="text-xs italic text-slate-500 mt-1">Publicado em ${nowStr} • Inteligência Artificial</p>
        </div>
        <div class="space-y-5">
          ${sections.map((sec, idx) => `
            <div class="border-b border-slate-200 pb-4">
              <h2 class="text-lg font-bold text-slate-900 italic mb-2">${sec.title}</h2>
              ${sec.text ? `<p class="text-sm text-slate-800 leading-relaxed ${idx === 0 ? 'dropcap' : ''}">${sec.text}</p>` : ''}
              ${sec.items.length > 0 ? `
                <ul class="mt-2 space-y-1 text-sm text-slate-800">
                  ${sec.items.map(item => `<li>— ${item}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (style === "terminal") {
    html = `
      <div class="template-terminal p-6 space-y-4 shadow-2xl">
        <div class="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <div class="w-3 h-3 rounded-full bg-red-500"></div>
          <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div class="w-3 h-3 rounded-full bg-green-500"></div>
          <span class="text-xs text-slate-400 font-mono ml-2">summary@gemini:~$ cat resumo.md</span>
        </div>
        <div class="space-y-4 font-mono text-xs">
          <div>
            <span class="terminal-green font-bold"># ${currentTitle}</span>
            <p class="text-slate-400 text-[11px]">Date: ${nowStr}</p>
          </div>
          ${sections.map(sec => `
            <div>
              <p class="terminal-yellow font-bold">## [${sec.title}]</p>
              ${sec.text ? `<p class="text-slate-300 leading-relaxed pl-2">${sec.text}</p>` : ''}
              ${sec.items.map(item => `<p class="text-slate-200 pl-4">> ${item}</p>`).join('')}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  visualCanvasContainer.innerHTML = html;
}

// Descarregar Imagem PNG em Alta Resolução (html2canvas)
downloadStudioImgBtn.addEventListener('click', async () => {
  if (!window.html2canvas) {
    showToast("Biblioteca de imagem não carregada.", true);
    return;
  }

  showToast("A gerar imagem HD em alta resolução...");
  downloadStudioImgBtn.disabled = true;

  try {
    const canvas = await html2canvas(visualCanvasContainer, {
      scale: 2, // 2x resolução (Retina / HD)
      useCORS: true,
      backgroundColor: null,
      logging: false
    });

    const link = document.createElement('a');
    const cleanName = currentTitle.replace(/[^a-zA-Z0-9_-]/g, '_') || 'resumo_visual';
    link.download = `${cleanName}_${activeVisualTemplate}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast("Imagem descarregada com sucesso!");
  } catch (err) {
    console.error(err);
    showToast("Erro ao gerar imagem: " + err.message, true);
  } finally {
    downloadStudioImgBtn.disabled = false;
  }
});

// =========================================================
// EXPORTAÇÕES STANDARD (PDF, Word, Markdown, Copiar)
// =========================================================
async function triggerExport(endpoint, fileExtension) {
  const contentToExport = currentViewTab === "edit" && easyMDEInstance ? easyMDEInstance.value() : currentMarkdown;
  if (!contentToExport) {
    showToast("Nenhum conteúdo para exportar.", true);
    return;
  }

  showToast(`A gerar ficheiro ${fileExtension.toUpperCase()}...`);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: currentTitle,
        markdown: contentToExport
      })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "Erro na exportação.");
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    
    const contentDisposition = res.headers.get('Content-Disposition');
    let fileName = `resumo.${fileExtension}`;
    if (contentDisposition && contentDisposition.includes('filename=')) {
      fileName = contentDisposition.split('filename=')[1].replace(/["']/g, '');
    }
    
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    showToast(`Descarregado com sucesso: ${fileName}`);
  } catch (err) {
    console.error(err);
    showToast(err.message, true);
  }
}

exportPdfBtn.addEventListener('click', () => triggerExport('/api/export/pdf', 'pdf'));
exportDocxBtn.addEventListener('click', () => triggerExport('/api/export/docx', 'docx'));
exportMarkdownBtn.addEventListener('click', () => triggerExport('/api/export/markdown', 'md'));

// Copiar para a área de transferência
copyBtn.addEventListener('click', async () => {
  const text = currentViewTab === "edit" && easyMDEInstance ? easyMDEInstance.value() : currentMarkdown;
  if (!text) {
    showToast("Nenhum conteúdo para copiar.", true);
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast("Copiado para a área de transferência!");
  } catch (err) {
    showToast("Erro ao copiar texto.", true);
  }
});

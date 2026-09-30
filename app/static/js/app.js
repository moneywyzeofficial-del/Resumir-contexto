// Inicializar ícones do Lucide
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }
  checkApiStatus();
});

// Estado global da aplicação
let currentInputMode = "file"; // "file" ou "url"
let currentFile = null;
let currentTitle = "Resumo de Conteúdo";
let currentMarkdown = "";
let currentViewTab = "preview";

// Elementos de Modo de Entrada
const modeFileBtn = document.getElementById('modeFileBtn');
const modeUrlBtn = document.getElementById('modeUrlBtn');
const fileInputSection = document.getElementById('fileInputSection');
const urlInputSection = document.getElementById('urlInputSection');
const websiteUrlInput = document.getElementById('websiteUrlInput');
const pasteUrlBtn = document.getElementById('pasteUrlBtn');
const focusWrapper = document.getElementById('focusWrapper');

// Elementos de Ficheiro
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

// Elementos de Configuração do Resumo
const summaryStyle = document.getElementById('summaryStyle');
const summaryFocus = document.getElementById('summaryFocus');
const summaryLanguage = document.getElementById('summaryLanguage');
const customInstructions = document.getElementById('customInstructions');
const generateBtn = document.getElementById('generateBtn');

// Elementos de Visualização e Resultados
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const loadingTitle = document.getElementById('loadingTitle');
const loadingDesc = document.getElementById('loadingDesc');
const summaryPreview = document.getElementById('summaryPreview');
const summaryEditor = document.getElementById('summaryEditor');
const exportToolbar = document.getElementById('exportToolbar');
const viewTabs = document.getElementById('viewTabs');
const tabPreview = document.getElementById('tabPreview');
const tabEdit = document.getElementById('tabEdit');

// Elementos de Exportação
const exportPdfBtn = document.getElementById('exportPdfBtn');
const exportDocxBtn = document.getElementById('exportDocxBtn');
const exportImageBtn = document.getElementById('exportImageBtn');
const exportMarkdownBtn = document.getElementById('exportMarkdownBtn');
const copyBtn = document.getElementById('copyBtn');

// Modal e Status
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

  if (window.lucide) {
    lucide.createIcons();
  }

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

// Colar URL da área de transferência
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

// Verificar estado da Chave API no backend
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
    console.error("Erro ao verificar status:", err);
  }
}

// Gestão da Chave API / Modal
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

// Drag & Drop Handlers
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
  const dt = e.dataTransfer;
  const files = dt.files;
  if (files && files.length > 0) {
    handleFileSelection(files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files.length > 0) {
    handleFileSelection(e.target.files[0]);
  }
});

function handleFileSelection(file) {
  currentFile = file;
  fileNameDisplay.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
  
  dropZonePrompt.classList.add('hidden');
  filePreviewContainer.classList.remove('hidden');

  const isVid = file.type.startsWith('video/');
  const isImg = file.type.startsWith('image/');

  if (isImg) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.src = e.target.result;
      imagePreviewWrapper.classList.remove('hidden');
      videoPreviewWrapper.classList.add('hidden');
      videoPreview.pause();
    };
    reader.readAsDataURL(file);
  } else if (isVid) {
    const videoUrl = URL.createObjectURL(file);
    videoPreview.src = videoUrl;
    videoPreviewWrapper.classList.remove('hidden');
    imagePreviewWrapper.classList.add('hidden');
  }

  if (window.lucide) {
    lucide.createIcons();
  }
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

// Alternar entre Separadores Formatado / Editar
tabPreview.addEventListener('click', () => {
  if (currentViewTab === "preview") return;
  currentViewTab = "preview";
  tabPreview.className = "px-3 py-1 rounded-md bg-white text-slate-800 shadow-sm transition-all";
  tabEdit.className = "px-3 py-1 rounded-md text-slate-600 hover:text-slate-900 transition-all";

  currentMarkdown = summaryEditor.value;
  summaryPreview.innerHTML = marked.parse(currentMarkdown);
  summaryEditor.classList.add('hidden');
  summaryPreview.classList.remove('hidden');
});

tabEdit.addEventListener('click', () => {
  if (currentViewTab === "edit") return;
  currentViewTab = "edit";
  tabEdit.className = "px-3 py-1 rounded-md bg-white text-slate-800 shadow-sm transition-all";
  tabPreview.className = "px-3 py-1 rounded-md text-slate-600 hover:text-slate-900 transition-all";

  summaryEditor.value = currentMarkdown;
  summaryPreview.classList.add('hidden');
  summaryEditor.classList.remove('hidden');
});

summaryEditor.addEventListener('input', () => {
  currentMarkdown = summaryEditor.value;
  for (const line of currentMarkdown.split('\n')) {
    if (line.startsWith('# ')) {
      currentTitle = line.replace('# ', '').trim();
      break;
    }
  }
});

// Ação de Gerar Resumo
generateBtn.addEventListener('click', async () => {
  const savedLocalKey = localStorage.getItem("gemini_api_key") || "";

  // Validação conforme o modo
  if (currentInputMode === "file") {
    if (!currentFile) {
      showToast("Por favor carrega uma imagem ou vídeo primeiro.", true);
      return;
    }
  } else if (currentInputMode === "url") {
    const url = websiteUrlInput.value.trim();
    if (!url) {
      showToast("Por favor insere o link do website.", true);
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      websiteUrlInput.value = 'https://' + url;
    }
  }

  // Interface em estado de carregamento
  generateBtn.disabled = true;
  emptyState.classList.add('hidden');
  summaryPreview.classList.add('hidden');
  summaryEditor.classList.add('hidden');
  exportToolbar.classList.add('hidden');
  viewTabs.classList.add('hidden');
  loadingState.classList.remove('hidden');

  if (currentInputMode === "url") {
    loadingTitle.textContent = "A extrair página web e analisar...";
    loadingDesc.textContent = "A ler o artigo e a sintetizar os pontos principais com a IA.";
  } else {
    const isVideo = currentFile && currentFile.type.startsWith('video/');
    loadingTitle.textContent = isVideo ? "A processar vídeo e extrair texto..." : "A analisar imagem e OCR...";
    loadingDesc.textContent = "A IA está a examinar o conteúdo e a gerar o resumo estruturado.";
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

      res = await fetch('/api/summarize', {
        method: 'POST',
        body: formData
      });
    } else {
      res = await fetch('/api/summarize-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: websiteUrlInput.value.trim(),
          style: summaryStyle.value,
          language: summaryLanguage.value,
          custom_instructions: customInstructions.value.trim(),
          api_key: savedLocalKey
        })
      });
    }

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || "Erro ao processar o conteúdo.");
    }

    currentMarkdown = data.markdown;
    currentTitle = data.title || "Resumo de Conteúdo";

    // Atualizar UI com o resultado
    summaryPreview.innerHTML = marked.parse(currentMarkdown);
    summaryEditor.value = currentMarkdown;

    loadingState.classList.add('hidden');
    summaryPreview.classList.remove('hidden');
    exportToolbar.classList.remove('hidden');
    viewTabs.classList.remove('hidden');

    showToast("Resumo gerado com sucesso!");
    if (window.lucide) {
      lucide.createIcons();
    }

  } catch (err) {
    console.error(err);
    loadingState.classList.add('hidden');
    emptyState.classList.remove('hidden');
    showToast(err.message, true);
  } finally {
    generateBtn.disabled = false;
  }
});

// Funções de Exportação
async function triggerExport(endpoint, fileExtension) {
  const contentToExport = currentViewTab === "edit" ? summaryEditor.value : currentMarkdown;
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
exportImageBtn.addEventListener('click', () => triggerExport('/api/export/image', 'png'));
exportMarkdownBtn.addEventListener('click', () => triggerExport('/api/export/markdown', 'md'));

// Copiar para a área de transferência
copyBtn.addEventListener('click', async () => {
  const text = currentViewTab === "edit" ? summaryEditor.value : currentMarkdown;
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

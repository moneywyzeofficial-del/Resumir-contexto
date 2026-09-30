// Variáveis de Estado
let currentInputMode = "file";
let currentFile = null;
let currentTitle = "Resumo de Conteúdo";
let currentMarkdown = "";
let currentViewTab = "preview";
let activeVisualTemplate = "infographic";
let easyMDEInstance = null;
let currentProjectId = null;

// Inicialização da Página
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  checkApiStatus();
  initEasyMDE();
  updateProjectsBadge();
  checkDraftRecovery();
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
      triggerAutoSave();
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

function triggerAutoSave() {
  if (currentMarkdown && currentMarkdown.trim().length > 10) {
    const draft = {
      id: currentProjectId || 'draft_temp',
      title: currentTitle,
      markdown: currentMarkdown,
      updatedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem('resumos_active_draft', JSON.stringify(draft));
    } catch (e) {
      console.warn("Falha no auto-save:", e);
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
const summaryProgressCircle = document.getElementById('summaryProgressCircle');
const summaryProgressPercent = document.getElementById('summaryProgressPercent');
const summaryProgressBar = document.getElementById('summaryProgressBar');
const loadingStageTag = document.getElementById('loadingStageTag');

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

// Elementos do Gerador de Ilustração IA
const openAiIllustrationBtn = document.getElementById('openAiIllustrationBtn');
const aiIllustrationModal = document.getElementById('aiIllustrationModal');
const closeAiIllustrationBtn = document.getElementById('closeAiIllustrationBtn');
const aiIlluStyle = document.getElementById('aiIlluStyle');
const aiIlluPrompt = document.getElementById('aiIlluPrompt');
const aiIlluLoading = document.getElementById('aiIlluLoading');
const aiIlluImg = document.getElementById('aiIlluImg');
const aiIlluEmpty = document.getElementById('aiIlluEmpty');
const generateAiIllustrationBtn = document.getElementById('generateAiIllustrationBtn');
const insertBannerBtn = document.getElementById('insertBannerBtn');
const downloadAiIllustrationBtn = document.getElementById('downloadAiIllustrationBtn');

const aiIlluProgressCircle = document.getElementById('aiIlluProgressCircle');
const aiIlluPercent = document.getElementById('aiIlluPercent');
const aiIlluProgressBar = document.getElementById('aiIlluProgressBar');
const aiIlluStatusText = document.getElementById('aiIlluStatusText');

let currentIllustrationRatio = "landscape";
let currentGeneratedImageUrl = "";

let summaryProgressInterval = null;
let currentSummaryProgress = 0;

function setSummaryProgress(percent, stageTag, title, desc) {
  currentSummaryProgress = percent;
  if (summaryProgressCircle) {
    const offset = 264 - (264 * Math.min(percent, 100) / 100);
    summaryProgressCircle.style.strokeDashoffset = offset;
  }
  if (summaryProgressPercent) summaryProgressPercent.textContent = `${Math.round(percent)}%`;
  if (summaryProgressBar) summaryProgressBar.style.width = `${Math.min(percent, 100)}%`;
  if (stageTag && loadingStageTag) loadingStageTag.textContent = stageTag;
  if (title && loadingTitle) loadingTitle.textContent = title;
  if (desc && loadingDesc) loadingDesc.textContent = desc;
}

function startSummaryProgress(mode) {
  clearInterval(summaryProgressInterval);
  setSummaryProgress(5, "ETAPA 1/4", mode === 'url' ? "A aceder ao link..." : "A carregar ficheiro...", "A preparar o ambiente de análise...");

  summaryProgressInterval = setInterval(() => {
    if (currentSummaryProgress < 25) {
      setSummaryProgress(currentSummaryProgress + 1.5, "ETAPA 1/4", mode === 'url' ? "A extrair transcrição e dados..." : "A processar fotogramas e áudio...", "A recolher o conteúdo integral...");
    } else if (currentSummaryProgress < 60) {
      setSummaryProgress(currentSummaryProgress + 1.2, "ETAPA 2/4", "A analisar contexto com Gemini IA...", "A examinar discurso, tópicos e texto visual (OCR)...");
    } else if (currentSummaryProgress < 85) {
      setSummaryProgress(currentSummaryProgress + 0.8, "ETAPA 3/4", "A estruturar pontos-chave...", "A sintetizar conceitos principais e argumentos...");
    } else if (currentSummaryProgress < 96) {
      setSummaryProgress(currentSummaryProgress + 0.4, "ETAPA 4/4", "A formatar documento final...", "A gerar tabelas, destaques e conclusões...");
    }
  }, 250);
}

function completeSummaryProgress() {
  clearInterval(summaryProgressInterval);
  setSummaryProgress(100, "CONCLUÍDO", "Resumo Gerado com Sucesso!", "A renderizar o documento...");
}

function stopSummaryProgress() {
  clearInterval(summaryProgressInterval);
}

let illuProgressInterval = null;
let currentIlluProgress = 0;

function setIllustrationProgress(percent, status) {
  currentIlluProgress = percent;
  if (aiIlluProgressCircle) {
    const offset = 251 - (251 * Math.min(percent, 100) / 100);
    aiIlluProgressCircle.style.strokeDashoffset = offset;
  }
  if (aiIlluPercent) aiIlluPercent.textContent = `${Math.round(percent)}%`;
  if (aiIlluProgressBar) aiIlluProgressBar.style.width = `${Math.min(percent, 100)}%`;
  if (status && aiIlluStatusText) aiIlluStatusText.textContent = status;
}

function startIllustrationProgress() {
  clearInterval(illuProgressInterval);
  setIllustrationProgress(5, "A formular descrição visual com Gemini...");

  illuProgressInterval = setInterval(() => {
    if (currentIlluProgress < 30) {
      setIllustrationProgress(currentIlluProgress + 2.5, "A formular descrição visual com Gemini...");
    } else if (currentIlluProgress < 65) {
      setIllustrationProgress(currentIlluProgress + 1.8, "A renderizar arte 3D com modelo FLUX...");
    } else if (currentIlluProgress < 85) {
      setIllustrationProgress(currentIlluProgress + 1.0, "A refinar iluminação e texturas HD...");
    } else if (currentIlluProgress < 96) {
      setIllustrationProgress(currentIlluProgress + 0.4, "A finalizar renderização da imagem...");
    }
  }, 200);
}

function completeIllustrationProgress() {
  clearInterval(illuProgressInterval);
  setIllustrationProgress(100, "Ilustração Gerada com Sucesso!");
}

function stopIllustrationProgress() {
  clearInterval(illuProgressInterval);
}

const apiKeyStatusBadge = document.getElementById('apiKeyStatusBadge');
const settingsModal = document.getElementById('settingsModal');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const apiKeyInput = document.getElementById('apiKeyInput');

// Elementos de Gestão de Projetos & Auto-Save
const openProjectsBtn = document.getElementById('openProjectsBtn');
const projectsCountBadge = document.getElementById('projectsCountBadge');

const projectsModal = document.getElementById('projectsModal');
const closeProjectsBtn = document.getElementById('closeProjectsBtn');
const closeProjectsModalFooterBtn = document.getElementById('closeProjectsModalFooterBtn');
const saveProjectBtn = document.getElementById('saveProjectBtn');
const saveCurrentAsProjectBtn = document.getElementById('saveCurrentAsProjectBtn');
const newBlankProjectBtn = document.getElementById('newBlankProjectBtn');
const importProjectJsonBtn = document.getElementById('importProjectJsonBtn');
const importProjectFileInput = document.getElementById('importProjectFileInput');
const projectsListContainer = document.getElementById('projectsListContainer');
const noProjectsEmptyState = document.getElementById('noProjectsEmptyState');

const draftRestoreBanner = document.getElementById('draftRestoreBanner');
const draftRestoreDesc = document.getElementById('draftRestoreDesc');
const restoreDraftBtn = document.getElementById('restoreDraftBtn');
const discardDraftBtn = document.getElementById('discardDraftBtn');


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

// Elementos adicionais das Definições
const headerSettingsStatusDot = document.getElementById('headerSettingsStatusDot');
const settingsApiStatusBadge = document.getElementById('settingsApiStatusBadge');
const toggleApiKeyVisibilityBtn = document.getElementById('toggleApiKeyVisibilityBtn');
const clearApiKeyBtn = document.getElementById('clearApiKeyBtn');
const clearAllStorageBtn = document.getElementById('clearAllStorageBtn');
const settingsProjectsCountText = document.getElementById('settingsProjectsCountText');

// Verificar estado da API
async function checkApiStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    const isConfigured = data.configured || !!localStorage.getItem("gemini_api_key");

    if (headerSettingsStatusDot) {
      headerSettingsStatusDot.className = `w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-500 shadow-sm' : 'bg-amber-500 animate-pulse'}`;
    }

    if (settingsApiStatusBadge) {
      if (isConfigured) {
        settingsApiStatusBadge.className = "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800";
        settingsApiStatusBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>Conectado & Pronto`;
      } else {
        settingsApiStatusBadge.className = "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800";
        settingsApiStatusBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>Sem Chave Configurada`;
      }
    }
  } catch (err) {
    console.error(err);
  }
}

// Abrir e Fechar Modal de Definições
openSettingsBtn.addEventListener('click', () => {
  const savedKey = localStorage.getItem("gemini_api_key") || "";
  if (savedKey) apiKeyInput.value = savedKey;
  
  const projects = getSavedProjects();
  if (settingsProjectsCountText) {
    settingsProjectsCountText.textContent = `${projects.length} projeto(s) guardado(s)`;
  }
  
  checkApiStatus();
  settingsModal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
});

const closeSettingsModal = () => settingsModal.classList.add('hidden');
closeSettingsBtn.addEventListener('click', closeSettingsModal);
cancelSettingsBtn.addEventListener('click', closeSettingsModal);

// Alternar Visibilidade da Chave API
if (toggleApiKeyVisibilityBtn) {
  toggleApiKeyVisibilityBtn.addEventListener('click', () => {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    toggleApiKeyVisibilityBtn.innerHTML = `<i data-lucide="${isPassword ? 'eye-off' : 'eye'}" class="w-4 h-4"></i>`;
    if (window.lucide) lucide.createIcons();
  });
}

// Limpar Chave API
if (clearApiKeyBtn) {
  clearApiKeyBtn.addEventListener('click', () => {
    apiKeyInput.value = '';
    localStorage.removeItem("gemini_api_key");
    checkApiStatus();
    showToast("Chave API limpa do navegador.");
  });
}

// Guardar Chave API
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
      localStorage.setItem("gemini_api_key", key);
      checkApiStatus();
      closeSettingsModal();
      showToast("Definições e chave guardadas com sucesso!");
    } else {
      showToast(data.detail || "Erro ao guardar chave.", true);
    }
  } catch (err) {
    showToast("Erro na ligação com o servidor.", true);
  }
});

// Limpar Todo o Armazenamento Local
if (clearAllStorageBtn) {
  clearAllStorageBtn.addEventListener('click', () => {
    if (!confirm("Tens a certeza de que queres limpar todos os rascunhos e projetos guardados localmente?")) return;
    localStorage.removeItem('resumos_projects');
    localStorage.removeItem('resumos_active_draft');
    updateProjectsBadge();
    if (settingsProjectsCountText) settingsProjectsCountText.textContent = '0 projetos guardados';
    renderProjectsList();
    showToast("Armazenamento local limpo com sucesso!");
  });
}


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

  // Limpar estado da ilustração anterior para novo pedido
  resetAiIllustrationState();

  // Iniciar animação do loader com percentagem e etapas
  startSummaryProgress(currentInputMode);

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

    // Finalizar loader em 100%
    completeSummaryProgress();
    await new Promise(r => setTimeout(r, 400));

    currentMarkdown = data.markdown;
    currentTitle = data.title || "Resumo de Conteúdo";
    currentProjectId = null;

    summaryPreview.innerHTML = marked.parse(currentMarkdown);
    if (easyMDEInstance) easyMDEInstance.value(currentMarkdown);

    triggerAutoSave();

    loadingState.classList.add('hidden');
    summaryPreview.classList.remove('hidden');
    exportToolbar.classList.remove('hidden');
    viewTabs.classList.remove('hidden');

    showToast("Resumo gerado com sucesso!");
    if (window.lucide) lucide.createIcons();

  } catch (err) {
    console.error(err);
    stopSummaryProgress();
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
      b.className = "style-select-btn shrink-0 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all flex items-center gap-1.5 active:scale-95";
    });
    const target = e.currentTarget;
    target.className = "style-select-btn shrink-0 px-3 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white shadow-xs transition-all flex items-center gap-1.5 active:scale-95";
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
      <div class="template-infographic p-4 sm:p-8 space-y-4 sm:space-y-6">
        <div class="border-b border-slate-200 pb-4 sm:pb-5">
          <div class="inline-block px-3 py-1 bg-brand-100 text-brand-800 rounded-full text-xs font-bold uppercase tracking-wider mb-2">Resumo Inteligente</div>
          <h1 class="text-xl sm:text-3xl font-extrabold text-slate-900 leading-tight">${currentTitle}</h1>
          <p class="text-xs text-slate-500 mt-1.5">Síntese visual gerada em ${nowStr}</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          ${sections.map((sec, idx) => `
            <div class="card-box p-4 sm:p-5 ${idx === 0 ? 'md:col-span-2 bg-gradient-to-r from-teal-50/50 to-emerald-50/50 border-teal-200' : ''}">
              <h3 class="text-sm sm:text-base font-bold text-teal-800 mb-2 sm:mb-2.5 flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-teal-600 shrink-0"></span>
                <span class="truncate">${sec.title}</span>
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
      <div class="template-handwritten p-4 sm:p-8 space-y-4 sm:space-y-6 relative border-2 sm:border-4 border-slate-800 rounded-2xl bg-amber-50/30">
        <div class="border-b-2 border-dashed border-slate-700 pb-3 sm:pb-4 text-center">
          <h1 class="text-2xl sm:text-3xl font-bold">${currentTitle}</h1>
          <p class="text-base sm:text-lg text-slate-600 mt-1">Notas e Destaques • ${nowStr}</p>
        </div>
        <div class="space-y-4 sm:space-y-6">
          ${sections.map(sec => `
            <div class="p-3.5 sm:p-4 border-2 border-slate-700 rounded-xl bg-white shadow-xs">
              <h2 class="text-xl sm:text-2xl font-bold border-b border-slate-300 pb-1 mb-2">${sec.title}</h2>
              ${sec.text ? `<p class="text-base sm:text-lg text-slate-800 mb-2">${sec.text}</p>` : ''}
              ${sec.items.length > 0 ? `
                <ul class="space-y-1 text-base sm:text-lg text-slate-900">
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
      <div class="template-postits p-4 sm:p-8 space-y-4 sm:space-y-6">
        <div class="text-center pb-3 sm:pb-4">
          <h1 class="text-xl sm:text-2xl font-bold text-slate-800">${currentTitle}</h1>
          <p class="text-xs text-slate-500 mt-1">Quadro de Notas Rápidas • ${nowStr}</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          ${sections.map((sec, idx) => `
            <div class="${colors[idx % colors.length]} p-4 sm:p-5 rounded-xl border border-black/10">
              <div class="w-3 h-3 rounded-full bg-red-400 mx-auto mb-2 shadow-xs border border-red-500"></div>
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
      <div class="template-bento p-4 sm:p-8 space-y-4 sm:space-y-6 rounded-2xl">
        <div class="border-b border-slate-800 pb-3 sm:pb-4">
          <span class="text-[11px] font-mono uppercase tracking-widest text-teal-400">Bento Summary</span>
          <h1 class="text-xl sm:text-3xl font-bold text-white mt-1">${currentTitle}</h1>
          <p class="text-xs text-slate-400 mt-1">Linear UI Layout • ${nowStr}</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
          ${sections.map((sec, idx) => `
            <div class="bento-item p-4 sm:p-5 ${idx === 0 ? 'md:col-span-2' : ''} ${idx === 1 ? 'md:col-span-1' : ''}">
              <h3 class="text-sm font-bold text-teal-300 mb-2 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-teal-400 shrink-0"></span>
                <span>${sec.title}</span>
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
      <div class="template-timeline p-4 sm:p-8 space-y-4 sm:space-y-6">
        <div class="border-b border-slate-200 pb-3 sm:pb-4">
          <h1 class="text-xl sm:text-2xl font-bold text-slate-900">${currentTitle}</h1>
          <p class="text-xs text-slate-500 mt-1">Linha do Tempo e Passos • ${nowStr}</p>
        </div>
        <div class="relative pl-5 sm:pl-6 space-y-5 sm:space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-teal-300">
          ${sections.map((sec, idx) => `
            <div class="relative">
              <div class="absolute -left-[25px] sm:-left-[27px] top-1.5 w-3.5 h-3.5 rounded-full bg-teal-600 border-2 border-white shadow-xs"></div>
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
      <div class="template-editorial p-4 sm:p-8 space-y-4 sm:space-y-6 bg-[#fdfbf7] border-t-8 border-slate-900">
        <div class="text-center border-b-2 border-slate-900 pb-3 sm:pb-4">
          <p class="text-[10px] sm:text-xs tracking-widest uppercase font-bold text-slate-600">Edição Especial de Síntese</p>
          <h1 class="text-2xl sm:text-3xl font-bold text-slate-900 mt-1.5 sm:mt-2">${currentTitle}</h1>
          <p class="text-xs italic text-slate-500 mt-1">Publicado em ${nowStr} • Inteligência Artificial</p>
        </div>
        <div class="space-y-4 sm:space-y-5">
          ${sections.map((sec, idx) => `
            <div class="border-b border-slate-200 pb-3 sm:pb-4">
              <h2 class="text-base sm:text-lg font-bold text-slate-900 italic mb-1.5 sm:mb-2">${sec.title}</h2>
              ${sec.text ? `<p class="text-xs sm:text-sm text-slate-800 leading-relaxed ${idx === 0 ? 'dropcap' : ''}">${sec.text}</p>` : ''}
              ${sec.items.length > 0 ? `
                <ul class="mt-2 space-y-1 text-xs sm:text-sm text-slate-800">
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
      <div class="template-terminal p-4 sm:p-6 space-y-3.5 sm:space-y-4 shadow-2xl">
        <div class="flex items-center space-x-2 border-b border-slate-800 pb-2.5 sm:pb-3">
          <div class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500"></div>
          <div class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500"></div>
          <div class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500"></div>
          <span class="text-[11px] sm:text-xs text-slate-400 font-mono ml-2 truncate">summary@gemini:~$ cat resumo.md</span>
        </div>
        <div class="space-y-3.5 sm:space-y-4 font-mono text-xs">
          <div>
            <span class="terminal-green font-bold"># ${currentTitle}</span>
            <p class="text-slate-400 text-[10px] sm:text-[11px]">Date: ${nowStr}</p>
          </div>
          ${sections.map(sec => `
            <div>
              <p class="terminal-yellow font-bold">## [${sec.title}]</p>
              ${sec.text ? `<p class="text-slate-300 leading-relaxed pl-2 text-[11px] sm:text-xs">${sec.text}</p>` : ''}
              ${sec.items.map(item => `<p class="text-slate-200 pl-3 sm:pl-4 text-[11px] sm:text-xs">> ${item}</p>`).join('')}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (style === "breakdown") {
    const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
    html = `
      <div class="template-breakdown p-4 sm:p-10 space-y-5 sm:space-y-8 rounded-2xl relative overflow-hidden">
        <!-- Marcadores técnicos de canto (Crosshairs) -->
        <div class="blueprint-crosshair top-3 left-3">+</div>
        <div class="blueprint-crosshair top-3 right-3">+</div>
        <div class="blueprint-crosshair bottom-3 left-3">+</div>
        <div class="blueprint-crosshair bottom-3 right-3">+</div>

        <!-- Barra Superior de Telemetria e Diagnóstico -->
        <div class="flex flex-wrap items-center justify-between gap-2 sm:gap-3 border-b border-sky-500/30 pb-3 text-[10px] sm:text-[11px] font-mono text-sky-400">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span class="font-bold tracking-wider uppercase text-cyan-300">EXPLODED SCHEMATIC // CONCEPT BREAKDOWN</span>
          </div>
          <div class="flex items-center gap-2 sm:gap-4 text-slate-400">
            <span>MÓDULOS: <strong class="text-sky-300">0${sections.length}</strong></span>
            <span>•</span>
            <span>PARÂMETROS: <strong class="text-sky-300">${totalItems}</strong></span>
            <span>•</span>
            <span class="text-emerald-400 font-bold">STATUS: READY</span>
          </div>
        </div>

        <!-- HUB CENTRAL: NÚCLEO DO CONCEITO (Exploded Core) -->
        <div class="breakdown-hub p-4 sm:p-8 text-center relative my-3 sm:my-4">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/50 text-[10px] font-mono text-sky-300 uppercase tracking-widest mb-2 sm:mb-3">
            <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            NÚCLEO PRINCIPAL // OBJETO CENTRAL
          </div>
          <h1 class="text-xl sm:text-4xl font-black text-white tracking-tight leading-tight">${currentTitle}</h1>
          <p class="text-xs sm:text-sm text-sky-200/80 font-mono mt-2 max-w-2xl mx-auto">
            DESCONSTRUÇÃO ANALÍTICA • SÍNTESE MULTIMODAL • ${nowStr}
          </p>
        </div>

        <!-- CONECTOR CENTRAL SVG (Branching Bus) -->
        <div class="flex items-center justify-center -my-2 sm:-my-3">
          <div class="flex items-center gap-2 text-sky-400 font-mono text-xs">
            <span>▼</span>
            <span class="tracking-widest uppercase text-[10px]">RAMIFICAÇÃO DE COMPONENTES</span>
            <span>▼</span>
          </div>
        </div>

        <!-- GRELHA DE DESCONSTRUÇÃO ESTRUTURAL (Exploded Parts Cards) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 relative">
          ${sections.map((sec, idx) => `
            <div class="breakdown-card p-4 sm:p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <!-- Topo do Módulo com Identificador Numérico -->
                <div class="flex items-center justify-between border-b border-sky-500/20 pb-3 mb-4">
                  <div class="flex items-center gap-2.5">
                    <span class="breakdown-pin px-2.5 py-1 rounded-md text-xs">#0${idx + 1}</span>
                    <h3 class="text-base font-bold text-white font-mono tracking-wide uppercase">${sec.title}</h3>
                  </div>
                  <span class="text-[10px] font-mono text-sky-400/80 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/50">PART_${idx + 1}</span>
                </div>

                <!-- Explicação / Tese do Módulo -->
                ${sec.text ? `
                  <div class="mb-4 text-xs sm:text-sm text-slate-300 leading-relaxed pl-3 border-l-2 border-cyan-400/70 bg-cyan-950/20 py-1.5 rounded-r">
                    ${sec.text}
                  </div>
                ` : ''}

                <!-- Lista de Sub-Itens e Parâmetros Desconstruídos -->
                ${sec.items.length > 0 ? `
                  <div class="space-y-2 mt-4">
                    <div class="text-[10px] font-mono text-sky-400 uppercase tracking-wider flex items-center gap-1">
                      <span>⚡</span>
                      <span>ELEMENTOS-CHAVE:</span>
                    </div>
                    <div class="space-y-1.5">
                      ${sec.items.map((item, itemIdx) => `
                        <div class="breakdown-item-pill p-2.5 flex items-start gap-2.5 text-xs text-slate-200">
                          <span class="text-cyan-400 font-mono font-bold mt-0.5">›</span>
                          <span class="leading-relaxed">${item}</span>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>

              <!-- Rodapé da Carta com Tag de Circuito -->
              <div class="mt-4 pt-3 border-t border-sky-500/10 flex items-center justify-between text-[10px] font-mono text-sky-400/60">
                <span>CONNECT: BUS_NODE_${idx + 1}</span>
                <span>OK [100%]</span>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- PAINEL INFERIOR DE DIAGNÓSTICO & CONCLUSÃO -->
        <div class="p-4 rounded-xl bg-slate-950/80 border border-sky-500/30 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-sky-300">
          <div class="flex items-center gap-2">
            <span class="text-cyan-400 font-bold">█║▌│█│║▌║</span>
            <span class="text-slate-400">ID: RESUMO-SYS-${Math.floor(1000 + Math.random() * 9000)}</span>
          </div>
          <div class="text-slate-400 text-right">
            <span>DOCUMENTO ESTRUTURADO POR IA • EXPORTAÇÃO HD</span>
          </div>
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

// =========================================================
// GERADOR DE ILUSTRAÇÃO IA (POLLINATIONS / FLUX)
// =========================================================
function resetAiIllustrationState() {
  currentGeneratedImageUrl = "";
  if (aiIlluPrompt) aiIlluPrompt.value = "";
  if (aiIlluImg) {
    aiIlluImg.src = "";
    aiIlluImg.classList.add('hidden');
  }
  if (aiIlluLoading) aiIlluLoading.classList.add('hidden');
  if (aiIlluEmpty) aiIlluEmpty.classList.remove('hidden');
  if (insertBannerBtn) insertBannerBtn.classList.add('hidden');
  if (downloadAiIllustrationBtn) downloadAiIllustrationBtn.classList.add('hidden');
  if (generateAiIllustrationBtn) generateAiIllustrationBtn.disabled = false;
}

openAiIllustrationBtn.addEventListener('click', () => {
  if (currentViewTab === "edit" && easyMDEInstance) {
    currentMarkdown = easyMDEInstance.value();
    updateTitleFromMarkdown();
  }
  if (!currentMarkdown) {
    showToast("Gera ou carrega um resumo primeiro.", true);
    return;
  }
  aiIllustrationModal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
});

const closeAiIllustration = () => aiIllustrationModal.classList.add('hidden');
closeAiIllustrationBtn.addEventListener('click', closeAiIllustration);

// Seleção de Proporção
document.querySelectorAll('.ai-ratio-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.ai-ratio-btn').forEach(b => {
      b.className = "ai-ratio-btn px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 flex items-center justify-center gap-1";
    });
    const target = e.currentTarget;
    target.className = "ai-ratio-btn px-2.5 py-2 rounded-xl text-xs font-semibold bg-teal-600 text-white border border-teal-600 flex items-center justify-center gap-1";
    currentIllustrationRatio = target.getAttribute('data-ratio');
  });
});

// Gerar Ilustração com IA (Puter.js FLUX / Zero Paywalls)
generateAiIllustrationBtn.addEventListener('click', async () => {
  const contentToUse = currentViewTab === "edit" && easyMDEInstance ? easyMDEInstance.value() : currentMarkdown;
  if (!contentToUse) {
    showToast("Nenhum resumo disponível para ilustrar.", true);
    return;
  }

  aiIlluLoading.classList.remove('hidden');
  aiIlluEmpty.classList.add('hidden');
  aiIlluImg.classList.add('hidden');
  generateAiIllustrationBtn.disabled = true;

  // Iniciar barra de progresso visual com percentagem
  startIllustrationProgress();

  try {
    // 1. Obter prompt visual otimizado em inglês pelo Gemini
    const res = await fetch('/api/generate-illustration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: currentTitle,
        markdown: contentToUse,
        style: aiIlluStyle.value,
        aspect_ratio: currentIllustrationRatio,
        custom_prompt: aiIlluPrompt.value.trim()
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Erro ao comunicar com o servidor.");
    }

    const data = await res.json();
    aiIlluPrompt.value = data.prompt;
    const promptToRender = data.prompt;

    // 2. Gerar com Puter.js (100% Gratuito no browser, sem x402 / sem paywalls)
    if (window.puter && window.puter.ai && typeof window.puter.ai.txt2img === 'function') {
      try {
        const generatedImgElement = await puter.ai.txt2img(promptToRender);
        completeIllustrationProgress();
        await new Promise(r => setTimeout(r, 400));

        currentGeneratedImageUrl = generatedImgElement.src;
        aiIlluImg.src = currentGeneratedImageUrl;
        aiIlluImg.classList.remove('hidden');
        aiIlluLoading.classList.add('hidden');
        insertBannerBtn.classList.remove('hidden');
        downloadAiIllustrationBtn.classList.remove('hidden');
        generateAiIllustrationBtn.disabled = false;
        showToast("Ilustração gerada com sucesso!");
        return;
      } catch (puterErr) {
        console.warn("Puter.js falhou, a tentar fallback direto:", puterErr);
      }
    }

    // 3. Fallback Direto
    currentGeneratedImageUrl = data.image_url;
    const tempImg = new Image();
    tempImg.onload = async () => {
      completeIllustrationProgress();
      await new Promise(r => setTimeout(r, 400));

      aiIlluImg.src = currentGeneratedImageUrl;
      aiIlluImg.classList.remove('hidden');
      aiIlluLoading.classList.add('hidden');
      insertBannerBtn.classList.remove('hidden');
      downloadAiIllustrationBtn.classList.remove('hidden');
      generateAiIllustrationBtn.disabled = false;
      showToast("Ilustração gerada com sucesso!");
    };
    tempImg.onerror = () => {
      stopIllustrationProgress();
      aiIlluLoading.classList.add('hidden');
      aiIlluEmpty.classList.remove('hidden');
      generateAiIllustrationBtn.disabled = false;
      showToast("O fornecedor público externo aplicou restrições. Podes copiar o prompt e gerar no Copilot/ImageFX!", true);
    };
    tempImg.src = currentGeneratedImageUrl;

  } catch (err) {
    console.error(err);
    stopIllustrationProgress();
    aiIlluLoading.classList.add('hidden');
    aiIlluEmpty.classList.remove('hidden');
    generateAiIllustrationBtn.disabled = false;
    showToast("Erro ao gerar imagem: " + err.message, true);
  }
});

// Inserir Banner no Topo do Resumo
insertBannerBtn.addEventListener('click', () => {
  if (!currentGeneratedImageUrl) return;

  const bannerMarkdown = `![Ilustração IA](${currentGeneratedImageUrl})\n\n`;
  
  // Se já tiver uma imagem de banner no início, substituir; senão, prepend
  if (currentMarkdown.startsWith('![Ilustração IA](')) {
    currentMarkdown = currentMarkdown.replace(/^!\[Ilustração IA\]\([^\)]+\)\n\n/, bannerMarkdown);
  } else {
    currentMarkdown = bannerMarkdown + currentMarkdown;
  }

  if (easyMDEInstance) {
    easyMDEInstance.value(currentMarkdown);
  }
  summaryPreview.innerHTML = marked.parse(currentMarkdown);
  closeAiIllustration();
  showToast("Ilustração inserida como cabeçalho no resumo!");
});

// Descarregar Imagem HD
downloadAiIllustrationBtn.addEventListener('click', async () => {
  if (!currentGeneratedImageUrl) return;
  showToast("A descarregar imagem HD...");

  try {
    const res = await fetch('/api/download-illustration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: currentGeneratedImageUrl,
        title: currentTitle
      })
    });

    if (!res.ok) throw new Error("Erro ao descarregar a imagem.");

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${currentTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_ilustracao.jpg`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    showToast("Imagem descarregada com sucesso!");
  } catch (err) {
    console.error(err);
    // Fallback: abrir imagem diretamente numa nova aba
    window.open(currentGeneratedImageUrl, '_blank');
  }
});

// =========================================================
// SISTEMA DE GESTÃO DE PROJETOS, RASCUNHOS & BACKUP
// =========================================================

function getSavedProjects() {
  try {
    const raw = localStorage.getItem('resumos_projects');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Erro ao ler projetos:", e);
    return [];
  }
}

function persistProjects(list) {
  try {
    localStorage.setItem('resumos_projects', JSON.stringify(list));
    updateProjectsBadge();
  } catch (e) {
    console.error("Erro ao guardar lista de projetos:", e);
    showToast("Aviso: Limite de armazenamento local atingido.", true);
  }
}

function updateProjectsBadge() {
  const projects = getSavedProjects();
  if (projectsCountBadge) {
    if (projects.length > 0) {
      projectsCountBadge.textContent = projects.length;
      projectsCountBadge.classList.remove('hidden');
    } else {
      projectsCountBadge.classList.add('hidden');
    }
  }
}

// Verificar Rascunho Não Finalizado ao Abrir a Aplicação
function checkDraftRecovery() {
  try {
    const draftRaw = localStorage.getItem('resumos_active_draft');
    if (!draftRaw) return;

    const draft = JSON.parse(draftRaw);
    if (!draft || !draft.markdown || draft.markdown.trim().length < 15) return;

    // Se a app ainda estiver no estado vazio, mostrar banner de recuperação
    if (!currentMarkdown) {
      const dateObj = new Date(draft.updatedAt || Date.now());
      const dateStr = dateObj.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      draftRestoreDesc.textContent = `Projeto: "${draft.title || 'Sem título'}" guardado automaticamente em ${dateStr}.`;
      draftRestoreBanner.classList.remove('hidden');
      if (window.lucide) lucide.createIcons();
    }
  } catch (e) {
    console.warn("Erro ao verificar rascunho:", e);
  }
}

// Restaurar Rascunho
restoreDraftBtn.addEventListener('click', () => {
  try {
    const draft = JSON.parse(localStorage.getItem('resumos_active_draft'));
    if (!draft) return;

    currentMarkdown = draft.markdown;
    currentTitle = draft.title || "Resumo Restaurado";
    currentProjectId = draft.id !== 'draft_temp' ? draft.id : null;

    if (easyMDEInstance) easyMDEInstance.value(currentMarkdown);
    summaryPreview.innerHTML = marked.parse(currentMarkdown);

    emptyState.classList.add('hidden');
    loadingState.classList.add('hidden');
    summaryPreview.classList.remove('hidden');
    exportToolbar.classList.remove('hidden');
    viewTabs.classList.remove('hidden');
    draftRestoreBanner.classList.add('hidden');

    showToast("Trabalho restaurado com sucesso!");
    if (window.lucide) lucide.createIcons();
  } catch (e) {
    console.error(e);
    showToast("Erro ao restaurar rascunho.", true);
  }
});

// Descartar Rascunho
discardDraftBtn.addEventListener('click', () => {
  localStorage.removeItem('resumos_active_draft');
  draftRestoreBanner.classList.add('hidden');
  showToast("Rascunho descartado.");
});

// Guardar Projeto Atual
function saveCurrentProject() {
  const contentToSave = currentViewTab === "edit" && easyMDEInstance ? easyMDEInstance.value() : currentMarkdown;
  if (!contentToSave || contentToSave.trim().length < 5) {
    showToast("Não há conteúdo para guardar no projeto.", true);
    return;
  }

  updateTitleFromMarkdown();
  const projects = getSavedProjects();
  const now = new Date().toISOString();

  let targetId = currentProjectId;
  let existingIndex = targetId ? projects.findIndex(p => p.id === targetId) : -1;

  if (existingIndex >= 0) {
    // Atualizar projeto existente
    projects[existingIndex].title = currentTitle;
    projects[existingIndex].markdown = contentToSave;
    projects[existingIndex].updatedAt = now;
    projects[existingIndex].illustrationUrl = currentGeneratedImageUrl || projects[existingIndex].illustrationUrl || "";
  } else {
    // Criar novo projeto
    targetId = 'proj_' + Date.now();
    currentProjectId = targetId;
    projects.unshift({
      id: targetId,
      title: currentTitle,
      markdown: contentToSave,
      updatedAt: now,
      sourceUrl: currentInputMode === 'url' ? websiteUrlInput.value.trim() : (currentFile ? currentFile.name : ""),
      illustrationUrl: currentGeneratedImageUrl || ""
    });
  }

  persistProjects(projects);
  triggerAutoSave();
  showToast(`Projeto "${currentTitle}" guardado com sucesso!`);
  renderProjectsList();
}

saveProjectBtn.addEventListener('click', saveCurrentProject);
saveCurrentAsProjectBtn.addEventListener('click', saveCurrentProject);

// Criar Novo Projeto em Branco
newBlankProjectBtn.addEventListener('click', () => {
  currentProjectId = 'proj_' + Date.now();
  currentTitle = "Novo Resumo";
  currentMarkdown = "# Novo Resumo\n\n## 📌 Introdução\nEscreve aqui o teu resumo ou notas...\n";
  
  if (easyMDEInstance) easyMDEInstance.value(currentMarkdown);
  summaryPreview.innerHTML = marked.parse(currentMarkdown);

  emptyState.classList.add('hidden');
  loadingState.classList.add('hidden');
  summaryPreview.classList.add('hidden');
  editorWrapper.classList.remove('hidden');
  exportToolbar.classList.remove('hidden');
  viewTabs.classList.remove('hidden');

  // Selecionar separador de Edição
  currentViewTab = "edit";
  tabEdit.className = "px-3 py-1.5 rounded-md bg-white text-slate-800 shadow-sm transition-all flex items-center gap-1.5";
  tabPreview.className = "px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5";

  resetAiIllustrationState();
  triggerAutoSave();
  projectsModal.classList.add('hidden');
  showToast("Novo projeto em branco pronto para edição.");
});

// Renderizar Lista de Projetos no Modal
function renderProjectsList() {
  const projects = getSavedProjects();
  projectsListContainer.innerHTML = "";

  if (projects.length === 0) {
    noProjectsEmptyState.classList.remove('hidden');
    return;
  }
  noProjectsEmptyState.classList.add('hidden');

  projects.forEach((proj) => {
    const card = document.createElement('div');
    card.className = "p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all space-y-2.5";

    const dateObj = new Date(proj.updatedAt);
    const dateFormatted = dateObj.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const plainSnippet = proj.markdown
      .replace(/^#+\s+/gm, '')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/[*_`]/g, '')
      .slice(0, 140) + '...';

    card.innerHTML = `
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div class="space-y-1 flex-1 min-w-[200px]">
          <div class="flex items-center gap-2">
            <h4 class="font-bold text-slate-900 text-sm hover:text-brand-700 cursor-pointer project-open-title">${proj.title || 'Sem título'}</h4>
            ${proj.id === currentProjectId ? '<span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">Ativo</span>' : ''}
          </div>
          <p class="text-[11px] text-slate-400 font-medium">Última alteração: ${dateFormatted} ${proj.sourceUrl ? `• Fonte: ${proj.sourceUrl.slice(0, 30)}...` : ''}</p>
        </div>
        <div class="flex items-center space-x-1.5">
          <button class="project-open-btn px-3 py-1.5 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1" data-id="${proj.id}">
            <i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i>
            <span>Abrir</span>
          </button>
          <button class="project-export-btn p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors" title="Exportar Backup JSON" data-id="${proj.id}">
            <i data-lucide="download" class="w-4 h-4"></i>
          </button>
          <button class="project-delete-btn p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar Projeto" data-id="${proj.id}">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
      <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">${plainSnippet}</p>
    `;

    // Eventos dos botões do cartão
    card.querySelector('.project-open-btn').addEventListener('click', () => loadProject(proj.id));
    card.querySelector('.project-open-title').addEventListener('click', () => loadProject(proj.id));
    card.querySelector('.project-export-btn').addEventListener('click', () => exportSingleProjectJson(proj.id));
    card.querySelector('.project-delete-btn').addEventListener('click', () => deleteProject(proj.id));

    projectsListContainer.appendChild(card);
  });

  if (window.lucide) lucide.createIcons();
}

// Carregar Projeto Selecionado
function loadProject(projectId) {
  const projects = getSavedProjects();
  const proj = projects.find(p => p.id === projectId);
  if (!proj) {
    showToast("Projeto não encontrado.", true);
    return;
  }

  currentProjectId = proj.id;
  currentTitle = proj.title;
  currentMarkdown = proj.markdown;

  if (easyMDEInstance) easyMDEInstance.value(currentMarkdown);
  summaryPreview.innerHTML = marked.parse(currentMarkdown);

  emptyState.classList.add('hidden');
  loadingState.classList.add('hidden');
  summaryPreview.classList.remove('hidden');
  editorWrapper.classList.add('hidden');
  exportToolbar.classList.remove('hidden');
  viewTabs.classList.remove('hidden');
  draftRestoreBanner.classList.add('hidden');

  currentViewTab = "preview";
  tabPreview.className = "px-3 py-1.5 rounded-md bg-white text-slate-800 shadow-sm transition-all flex items-center gap-1.5";
  tabEdit.className = "px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5";

  triggerAutoSave();
  projectsModal.classList.add('hidden');
  showToast(`Projeto "${proj.title}" carregado com sucesso!`);
  if (window.lucide) lucide.createIcons();
}

// Eliminar Projeto
function deleteProject(projectId) {
  if (!confirm("Tens a certeza de que queres eliminar este projeto guardado?")) return;

  let projects = getSavedProjects();
  projects = projects.filter(p => p.id !== projectId);
  persistProjects(projects);

  if (currentProjectId === projectId) {
    currentProjectId = null;
  }

  renderProjectsList();
  showToast("Projeto eliminado.");
}

// Exportar Backup JSON de um Projeto
function exportSingleProjectJson(projectId) {
  const projects = getSavedProjects();
  const proj = projects.find(p => p.id === projectId);
  if (!proj) return;

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(proj, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  const cleanName = (proj.title || 'projeto').replace(/[^a-zA-Z0-9_-]/g, '_');
  downloadAnchor.setAttribute("download", `${cleanName}_backup.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast("Ficheiro de backup JSON descarregado!");
}

// Importar Backup JSON
importProjectJsonBtn.addEventListener('click', () => importProjectFileInput.click());
importProjectFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if (!imported.title || !imported.markdown) {
        throw new Error("Formato de ficheiro de projeto inválido.");
      }

      const projects = getSavedProjects();
      imported.id = 'proj_' + Date.now();
      imported.updatedAt = new Date().toISOString();
      projects.unshift(imported);
      persistProjects(projects);
      
      renderProjectsList();
      showToast(`Projeto "${imported.title}" importado com sucesso!`);
    } catch (err) {
      console.error(err);
      showToast("Erro ao importar ficheiro: " + err.message, true);
    }
  };
  reader.readAsText(file);
  importProjectFileInput.value = '';
});

// Abertura e Fecho do Modal de Projetos
openProjectsBtn.addEventListener('click', () => {
  renderProjectsList();
  projectsModal.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
});

const closeProjectsModal = () => projectsModal.classList.add('hidden');
closeProjectsBtn.addEventListener('click', closeProjectsModal);
closeProjectsModalFooterBtn.addEventListener('click', closeProjectsModal);



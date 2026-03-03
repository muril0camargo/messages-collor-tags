// Kommo Message Tags - content script
// ------------------------------------------------------------
// Este script procura mensagens na interface da Kommo,
// adiciona um botão "+ Tag" em cada mensagem, permite cadastrar
// uma tag personalizada e persiste os dados em localStorage.

(() => {
  // Chave usada para armazenar todas as tags da extensão no localStorage.
  const STORAGE_KEY = 'kommo_message_tags_v1';

  // Seletores possíveis para mensagens da Kommo.
  // Incluímos várias opções para cobrir mudanças de layout/classe.
  const MESSAGE_SELECTORS = [
    '[data-id][class*="message"]',
    '[data-id][class*="chat"]',
    '[data-message-id]',
    '[data-id][class*="talk"]',
    '.js-message',
    '.message',
    '.chat-message',
    '.talk__message'
  ];

  // Classe usada como marcador para não processar a mesma mensagem 2x.
  const PROCESSED_CLASS = 'kmt-processed';

  /**
   * Lê objeto de tags salvo no localStorage.
   * @returns {Record<string, string[]>}
   */
  function getStoredTags() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      console.warn('[Kommo Message Tags] Falha ao ler localStorage:', error);
      return {};
    }
  }

  /**
   * Salva objeto completo de tags no localStorage.
   * @param {Record<string, string[]>} data
   */
  function setStoredTags(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('[Kommo Message Tags] Falha ao salvar localStorage:', error);
    }
  }

  /**
   * Gera um identificador estável para a mensagem.
   * Priorizamos atributos existentes do DOM (data-id, data-message-id etc.).
   * @param {HTMLElement} messageEl
   * @returns {string | null}
   */
  function getMessageId(messageEl) {
    const explicitId =
      messageEl.getAttribute('data-id') ||
      messageEl.getAttribute('data-message-id') ||
      messageEl.dataset.id ||
      messageEl.dataset.messageId;

    if (explicitId) return String(explicitId);

    // Fallback: gera hash simples com conteúdo textual da mensagem.
    // Útil quando não há data-id disponível.
    const text = (messageEl.innerText || messageEl.textContent || '').trim();
    if (!text) return null;

    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return `generated-${Math.abs(hash)}`;
  }

  /**
   * Renderiza visualmente as tags de uma mensagem.
   * @param {HTMLElement} container
   * @param {string[]} tags
   */
  function renderTags(container, tags) {
    container.innerHTML = '';

    if (!tags || tags.length === 0) {
      const emptyInfo = document.createElement('span');
      emptyInfo.className = 'kmt-empty';
      emptyInfo.textContent = 'Sem tags';
      container.appendChild(emptyInfo);
      return;
    }

    tags.forEach((tag) => {
      const chip = document.createElement('span');
      chip.className = 'kmt-tag-chip';
      chip.textContent = `#${tag}`;
      container.appendChild(chip);
    });
  }

  /**
   * Adiciona UI de tags em uma mensagem específica.
   * @param {HTMLElement} messageEl
   */
  function attachTagUI(messageEl) {
    if (messageEl.classList.contains(PROCESSED_CLASS)) return;

    const messageId = getMessageId(messageEl);
    if (!messageId) return;

    messageEl.classList.add(PROCESSED_CLASS);

    // Wrapper com botão e área de tags.
    const wrapper = document.createElement('div');
    wrapper.className = 'kmt-wrapper';

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'kmt-add-btn';
    addButton.textContent = '+ Tag';

    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'kmt-tags-container';

    // Carrega tags já salvas desta mensagem.
    const saved = getStoredTags();
    const currentTags = saved[messageId] || [];
    renderTags(tagsContainer, currentTags);

    addButton.addEventListener('click', () => {
      const input = window.prompt('Digite a tag para esta mensagem:');
      if (!input) return;

      const newTag = input.trim();
      if (!newTag) return;

      const store = getStoredTags();
      const existing = Array.isArray(store[messageId]) ? store[messageId] : [];

      // Evita duplicatas simples (case-insensitive).
      const alreadyExists = existing.some((t) => t.toLowerCase() === newTag.toLowerCase());
      if (!alreadyExists) {
        existing.push(newTag);
      }

      store[messageId] = existing;
      setStoredTags(store);
      renderTags(tagsContainer, existing);
    });

    wrapper.appendChild(addButton);
    wrapper.appendChild(tagsContainer);

    // Inserimos após o conteúdo da mensagem (lado/abaixo).
    messageEl.appendChild(wrapper);
  }

  /**
   * Processa todas as mensagens visíveis no momento.
   */
  function processMessages() {
    const selector = MESSAGE_SELECTORS.join(',');
    const messages = document.querySelectorAll(selector);

    messages.forEach((messageEl) => {
      if (messageEl instanceof HTMLElement) {
        attachTagUI(messageEl);
      }
    });
  }

  // Processamento inicial quando o conteúdo está pronto.
  processMessages();

  // Observer para capturar mensagens adicionadas dinamicamente pela Kommo.
  const observer = new MutationObserver(() => {
    processMessages();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();

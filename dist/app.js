const STORAGE_KEY = "couple-puzzle-progress-v1";
const SETTINGS_KEY = "couple-puzzle-settings-v1";

const canvas = document.querySelector("#puzzleCanvas");
const ctx = canvas.getContext("2d");
const imageInput = document.querySelector("#imageInput");
const fileName = document.querySelector("#fileName");
const pieceCount = document.querySelector("#pieceCount");
const setupPanel = document.querySelector(".setup-panel");
const createPuzzle = document.querySelector("#createPuzzle");
const restorePuzzle = document.querySelector("#restorePuzzle");
const resetPuzzle = document.querySelector("#resetPuzzle");
const emptyState = document.querySelector("#emptyState");
const progressText = document.querySelector("#progressText");
const progressRing = document.querySelector("#progressRing");
const saveStatus = document.querySelector("#saveStatus");
const roomCode = document.querySelector("#roomCode");
const copyRoom = document.querySelector("#copyRoom");
const tableTitle = document.querySelector("#tableTitle");
const playerNameInput = document.querySelector("#playerNameInput");
const partnerNameInput = document.querySelector("#partnerNameInput");
const tableNameInput = document.querySelector("#tableNameInput");
const roomInput = document.querySelector("#roomInput");
const applyRoom = document.querySelector("#applyRoom");
const zoomIn = document.querySelector("#zoomIn");
const zoomOut = document.querySelector("#zoomOut");
const centerBoard = document.querySelector("#centerBoard");
const musicToggle = document.querySelector("#musicToggle");
const celebrateButton = document.querySelector("#celebrateButton");
const placedCount = document.querySelector("#placedCount");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const chatMessages = document.querySelector("#chatMessages");
const userCursor = document.querySelector("#userCursor");
const partnerCursor = document.querySelector("#partnerCursor");
const boardWrap = document.querySelector(".board-wrap");
const playerNameLabel = document.querySelector("#playerNameLabel");
const partnerNameLabel = document.querySelector("#partnerNameLabel");
const playerAvatar = document.querySelector("#playerAvatar");
const partnerAvatar = document.querySelector("#partnerAvatar");
const userCursorName = document.querySelector("#userCursorName");
const partnerCursorName = document.querySelector("#partnerCursorName");
const partnerStatus = document.querySelector("#partnerStatus");
const syncStatus = document.querySelector("#syncStatus");
const syncCard = document.querySelector(".sync-card");
const valenScore = document.querySelector("#valenScore");
const partnerScore = document.querySelector("#partnerScore");
const valenPercent = document.querySelector("#valenPercent");
const partnerPercent = document.querySelector("#partnerPercent");
const valenBar = document.querySelector("#valenBar");
const partnerBar = document.querySelector("#partnerBar");
const leaderText = document.querySelector("#leaderText");
const playerScoreName = document.querySelector("#playerScoreName");
const partnerScoreName = document.querySelector("#partnerScoreName");
const rewardPercentInput = document.querySelector("#rewardPercentInput");
const rewardTextInput = document.querySelector("#rewardTextInput");
const addReward = document.querySelector("#addReward");
const rewardList = document.querySelector("#rewardList");
const rewardCount = document.querySelector("#rewardCount");
const customCard = document.querySelector(".custom-card");
const rewardCard = document.querySelector(".reward-card");
const toggleSetup = document.querySelector("#toggleSetup");

const state = {
  imageData: "",
  image: null,
  pieces: [],
  rows: 0,
  cols: 0,
  board: { x: 360, y: 120, width: 560, height: 360 },
  scale: 1,
  pan: { x: 0, y: 0 },
  selectedId: null,
  dragOffset: { x: 0, y: 0 },
  lastPointer: null,
  isPanning: false,
  dirty: false,
  room: "AMOR-0427",
  particles: [],
  musicOn: false,
  audioContext: null,
  musicTimer: 0,
  musicStep: 0,
  role: "host",
  peer: null,
  conn: null,
  peerReady: false,
  lastCursorSent: 0,
  tableName: "Puzle a Distancia",
  playerName: "Valentino",
  partnerName: "Tu pareja",
  rewards: [],
  invitedByUrl: false,
  setupVisible: true,
};

function makeRoomCode() {
  const words = ["luna", "sol", "roma", "mate", "beso", "viaje"];
  const word = words[Math.floor(Math.random() * words.length)];
  const random = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(0, 5);
  return `puzle-amor-${word}-${random}`;
}

function normalizeRoom(value) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
  return normalized || makeRoomCode();
}

function getRoomFromUrl() {
  return new URLSearchParams(window.location.search).get("room");
}

function getShareUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("room", state.room);
  return url.toString();
}

function setSyncStatus(text, offline = false) {
  syncStatus.textContent = text;
  syncCard.classList.toggle("offline", offline);
}

function setPartnerOnline(online) {
  partnerStatus.textContent = online ? "conectado en vivo" : "listo para invitar";
}

function cleanName(value, fallback) {
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned || fallback;
}

function getInitial(name) {
  return cleanName(name, "?").slice(0, 1).toUpperCase();
}

function getPlayerRole() {
  return state.role === "host" ? "host" : "guest";
}

function getRemoteRole() {
  return state.role === "host" ? "guest" : "host";
}

function getNameForRole(role) {
  return role === "host" ? state.playerName : state.partnerName;
}

function updateNames(playerName = state.playerName, partnerName = state.partnerName, announce = false) {
  state.playerName = cleanName(playerName, "Valentino");
  state.partnerName = cleanName(partnerName, "Tu pareja");
  playerNameInput.value = state.playerName;
  partnerNameInput.value = state.partnerName;
  playerNameLabel.textContent = state.playerName;
  partnerNameLabel.textContent = state.partnerName;
  playerAvatar.textContent = getInitial(state.playerName);
  partnerAvatar.textContent = getInitial(state.partnerName);
  userCursorName.textContent = getPlayerName();
  partnerCursorName.textContent = getRemoteName();
  playerScoreName.textContent = state.playerName;
  partnerScoreName.textContent = state.partnerName;
  updateProgress();
  saveSettings();
  if (announce) sendRealtime("meta", {
    tableName: state.tableName,
    playerName: state.playerName,
    partnerName: state.partnerName,
    rewards: state.rewards,
  });
}

function applyIncomingNames(playerName, partnerName) {
  const keepGuestName = state.role === "guest" && state.partnerName !== "Tu pareja" && (!partnerName || partnerName === "Tu pareja");
  updateNames(
    playerName || state.playerName,
    keepGuestName ? state.partnerName : partnerName || state.partnerName,
  );
}

function updateTableName(name, announce = false) {
  state.tableName = name.trim() || "Puzle a Distancia";
  tableTitle.textContent = state.tableName;
  tableNameInput.value = state.tableName;
  document.title = state.tableName;
  saveSettings();
  if (announce) sendRealtime("meta", {
    tableName: state.tableName,
    playerName: state.playerName,
    partnerName: state.partnerName,
    rewards: state.rewards,
  });
}

function updateRoomDisplay() {
  roomCode.textContent = state.room;
  roomInput.value = state.room;
}

function sortRewards(rewards) {
  return [...rewards].sort((a, b) => a.percent - b.percent || a.text.localeCompare(b.text));
}

function normalizeRewards(rewards = []) {
  return sortRewards(rewards)
    .map((reward) => ({
      id: reward.id || `reward-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      percent: Math.min(100, Math.max(1, Number(reward.percent) || 1)),
      text: cleanName(reward.text || "", ""),
      unlocked: Boolean(reward.unlocked),
      unlockedAt: reward.unlockedAt || null,
    }))
    .filter((reward) => reward.text);
}

function renderRewards() {
  state.rewards = normalizeRewards(state.rewards);
  rewardCount.textContent = state.rewards.length === 1 ? "1 regla" : `${state.rewards.length} reglas`;

  if (!state.rewards.length) {
    rewardList.innerHTML = '<p class="system-message">Agrega premios por porcentaje antes o durante la partida.</p>';
    return;
  }

  rewardList.innerHTML = state.rewards.map((reward) => `
    <div class="reward-item ${reward.unlocked ? "unlocked" : ""}" data-reward-id="${escapeHtml(reward.id)}">
      <span class="reward-percent">${reward.percent}%</span>
      <span class="reward-copy">
        <strong>${escapeHtml(reward.text)}</strong>
        <small>${reward.unlocked ? "Desbloqueado" : "Pendiente"}</small>
      </span>
      <button class="reward-remove" type="button" aria-label="Quitar premio" data-remove-reward="${escapeHtml(reward.id)}">x</button>
    </div>
  `).join("");
}

function setSetupVisible(visible) {
  state.setupVisible = visible;
  setupPanel.classList.toggle("is-hidden", !visible);
  customCard.classList.toggle("is-hidden", !visible);
  rewardCard.classList.toggle("is-hidden", !visible);
  toggleSetup.classList.toggle("is-hidden", visible);
  toggleSetup.textContent = visible ? "Ocultar configuración" : "Editar sala";
}

function enterPlayMode() {
  setSetupVisible(false);
}

function saveAndBroadcastRewards() {
  renderRewards();
  saveSettings();
  sendRealtime("meta", {
    tableName: state.tableName,
    playerName: state.playerName,
    partnerName: state.partnerName,
    rewards: state.rewards,
  });
}

function addRewardRule() {
  const percent = Math.min(100, Math.max(1, Number(rewardPercentInput.value) || 1));
  const text = rewardTextInput.value.trim();
  if (!text) {
    saveStatus.textContent = "Escribe el premio";
    rewardTextInput.focus();
    return;
  }

  state.rewards.push({
    id: `reward-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    percent,
    text,
    unlocked: false,
    unlockedAt: null,
  });
  rewardTextInput.value = "";
  rewardPercentInput.value = Math.min(100, percent + 20);
  saveAndBroadcastRewards();
  checkRewards(getPuzzlePercent(), true);
  saveStatus.textContent = "Premio agregado";
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    tableName: state.tableName,
    room: state.room,
    playerName: state.playerName,
    partnerName: state.partnerName,
    rewards: state.rewards,
  }));
}

function restoreSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    updateNames(saved.playerName || state.playerName, saved.partnerName || state.partnerName);
    if (saved.tableName) updateTableName(saved.tableName);
    if (saved.room) state.room = normalizeRoom(saved.room);
    state.rewards = normalizeRewards(saved.rewards);
    renderRewards();
  } catch {
    updateNames(state.playerName, state.partnerName);
    updateTableName(state.tableName);
    renderRewards();
  }
}

function askGuestName() {
  const current = cleanName(state.partnerName, "Tu pareja");
  if (current !== "Tu pareja") return;
  const typed = window.prompt("¿Cómo quieres aparecer en la mesa?", "");
  if (typed) updateNames(state.playerName, typed);
}

function getSnapshot() {
  return {
    imageData: state.imageData,
    pieces: state.pieces.map(({ id, row, col, x, y, targetX, targetY, width, height, locked, lockedBy, lockedByRole }) => ({
      id,
      row,
      col,
      x,
      y,
      targetX,
      targetY,
      width,
      height,
      locked,
      lockedBy,
      lockedByRole,
    })),
    rows: state.rows,
    cols: state.cols,
    board: state.board,
    room: state.room,
    pieceCount: pieceCount.value,
    tableName: state.tableName,
    playerName: state.playerName,
    partnerName: state.partnerName,
    rewards: state.rewards,
  };
}

function sendRealtime(type, payload) {
  if (!state.conn?.open) return;
  state.conn.send({ type, payload });
}

function getPlayerName() {
  return getNameForRole(getPlayerRole());
}

function getRemoteName() {
  return getNameForRole(getRemoteRole());
}

async function applySnapshot(snapshot, message = "Sala sincronizada") {
  if (!snapshot?.imageData || !snapshot?.pieces?.length) return;
  state.imageData = snapshot.imageData;
  state.image = await loadImage(snapshot.imageData);
  state.pieces = snapshot.pieces;
  state.rows = snapshot.rows;
  state.cols = snapshot.cols;
  state.board = snapshot.board;
  state.room = snapshot.room || state.room;
  if (snapshot.tableName) updateTableName(snapshot.tableName);
  if (snapshot.playerName || snapshot.partnerName) applyIncomingNames(snapshot.playerName, snapshot.partnerName);
  if (snapshot.rewards) {
    state.rewards = normalizeRewards(snapshot.rewards);
    renderRewards();
  }
  pieceCount.value = snapshot.pieceCount || String(snapshot.pieces.length);
  updateRoomDisplay();
  emptyState.classList.add("hidden");
  fileName.textContent = "Foto sincronizada en la sala";
  updateProgress();
  persist();
  draw();
  enterPlayMode();
  saveStatus.textContent = message;
}

async function handleRealtimeData(message) {
  if (!message?.type) return;

  if (message.type === "snapshot") {
    await applySnapshot(message.payload);
  }

  if (message.type === "request-snapshot" && state.imageData && state.pieces.length) {
    sendRealtime("snapshot", getSnapshot());
  }

  if (message.type === "piece") {
    const incoming = message.payload;
    const piece = state.pieces.find((item) => item.id === incoming.id);
    if (!piece) return;
    piece.x = incoming.x;
    piece.y = incoming.y;
    piece.locked = incoming.locked;
    piece.lockedBy = incoming.lockedBy;
    piece.lockedByRole = incoming.lockedByRole || incoming.lockedBy;
    updateProgress();
    persist();
    draw();
  }

  if (message.type === "reset") {
    localStorage.removeItem(STORAGE_KEY);
    state.imageData = "";
    state.image = null;
    state.pieces = [];
    state.selectedId = null;
    fileName.textContent = "La imagen se queda en tu navegador.";
    emptyState.classList.remove("hidden");
    updateProgress();
    draw();
    setSetupVisible(true);
    saveStatus.textContent = "Mesa reiniciada por la sala";
  }

  if (message.type === "meta") {
    if (message.payload.tableName) updateTableName(message.payload.tableName);
    if (message.payload.playerName || message.payload.partnerName) {
      applyIncomingNames(message.payload.playerName, message.payload.partnerName);
    }
    if (message.payload.rewards) {
      state.rewards = normalizeRewards(message.payload.rewards);
      renderRewards();
      saveSettings();
    }
  }

  if (message.type === "reward") {
    unlockReward(message.payload.id, false);
  }

  if (message.type === "chat") {
    appendChatMessage(message.payload.name, message.payload.text);
  }

  if (message.type === "cursor") {
    partnerCursor.style.display = "flex";
    partnerCursor.style.left = `${message.payload.x * 100}%`;
    partnerCursor.style.top = `${message.payload.y * 100}%`;
  }

  if (message.type === "celebrate") {
    launchCelebration(message.payload.x, message.payload.y, message.payload.amount || 36);
    playSoftPop();
  }
}

function attachConnection(conn) {
  state.conn = conn;
  setSyncStatus("Conectando con tu pareja...");
  conn.on("open", () => {
    setPartnerOnline(true);
    setSyncStatus("Sala online: movimientos en vivo");
    if (state.role === "host" && state.imageData && state.pieces.length) {
      sendRealtime("snapshot", getSnapshot());
    } else {
      sendRealtime("request-snapshot", {});
    }
  });
  conn.on("data", handleRealtimeData);
  conn.on("close", () => {
    setPartnerOnline(false);
    setSyncStatus("La otra persona se desconectó", true);
  });
  conn.on("error", () => setSyncStatus("No se pudo mantener la conexión", true));
}

function closeRealtime() {
  if (state.conn) {
    state.conn.close();
    state.conn = null;
  }
  if (state.peer) {
    state.peer.destroy();
    state.peer = null;
  }
  state.peerReady = false;
  setPartnerOnline(false);
}

function initRealtime(nextRoom = null, nextRole = null) {
  closeRealtime();
  const invitedRoom = getRoomFromUrl();
  state.invitedByUrl = Boolean(invitedRoom);
  state.role = nextRole || (invitedRoom ? "guest" : "host");
  if (state.role === "guest") askGuestName();
  state.room = normalizeRoom(nextRoom || invitedRoom || state.room || makeRoomCode());
  updateRoomDisplay();
  updateNames(state.playerName, state.partnerName);
  saveSettings();
  setSyncStatus(state.role === "host" ? "Abriendo sala online..." : "Buscando la sala...");

  if (!window.Peer) {
    setSyncStatus("Modo local: no cargó la conexión online", true);
    return;
  }

  const peer = state.role === "host" ? new Peer(state.room) : new Peer();
  state.peer = peer;

  peer.on("open", () => {
    state.peerReady = true;
    if (state.role === "host") {
      setSyncStatus("Sala lista: copia el link para invitar");
    } else {
      setSyncStatus("Entrando a la sala...");
      attachConnection(peer.connect(state.room, { reliable: true }));
    }
  });

  peer.on("connection", attachConnection);
  peer.on("error", (error) => {
    const text = error?.type === "unavailable-id"
      ? "Esa sala ya está abierta en otra pestaña"
      : "No se pudo abrir la sala online";
    setSyncStatus(text, true);
  });

  window.setTimeout(() => {
    if (!state.peerReady && state.peer === peer) {
      setSyncStatus("La sala tarda en abrir. Revisa conexión o recarga.", true);
    }
  }, 8000);
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(640, Math.floor(rect.width * ratio));
  canvas.height = Math.max(520, Math.floor(rect.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  draw();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function chooseGrid(total) {
  const aspect = state.image ? state.image.width / state.image.height : 1.45;
  let cols = Math.max(2, Math.round(Math.sqrt(total * aspect)));
  let rows = Math.max(2, Math.round(total / cols));

  while (rows * cols < total) {
    if (cols / rows < aspect) cols += 1;
    else rows += 1;
  }

  return { rows, cols };
}

function fitBoard() {
  const width = canvas.clientWidth || 900;
  const height = canvas.clientHeight || 600;
  const maxWidth = Math.min(width * 0.48, 720);
  const maxHeight = Math.min(height * 0.64, 520);
  const aspect = state.image.width / state.image.height;
  let boardWidth = maxWidth;
  let boardHeight = boardWidth / aspect;

  if (boardHeight > maxHeight) {
    boardHeight = maxHeight;
    boardWidth = boardHeight * aspect;
  }

  state.board = {
    x: width * 0.46,
    y: Math.max(48, (height - boardHeight) / 2),
    width: boardWidth,
    height: boardHeight,
  };
  state.pan = { x: 0, y: 0 };
  state.scale = 1;
}

function createPieces(total) {
  const { rows, cols } = chooseGrid(total);
  state.rows = rows;
  state.cols = cols;

  const pieceW = state.board.width / cols;
  const pieceH = state.board.height / rows;
  const spreadLeft = 28;
  const spreadTop = 46;
  const spreadWidth = Math.max(210, state.board.x - 72);
  const spreadHeight = Math.max(360, canvas.clientHeight - 120);

  state.pieces = Array.from({ length: rows * cols }, (_, id) => {
    const row = Math.floor(id / cols);
    const col = id % cols;
    const targetX = state.board.x + col * pieceW;
    const targetY = state.board.y + row * pieceH;
    return {
      id,
      row,
      col,
      x: spreadLeft + Math.random() * spreadWidth,
      y: spreadTop + Math.random() * spreadHeight,
      targetX,
      targetY,
      width: pieceW,
      height: pieceH,
      locked: false,
      lockedBy: null,
      lockedByRole: null,
    };
  });
}

async function startPuzzle() {
  if (!state.imageData) {
    saveStatus.textContent = "Primero elige una foto";
    return;
  }

  state.image = await loadImage(state.imageData);
  fitBoard();
  createPieces(Number(pieceCount.value));
  roomCode.textContent = state.room;
  emptyState.classList.add("hidden");
  updateProgress();
  persist();
  sendRealtime("snapshot", getSnapshot());
  draw();
  enterPlayMode();
}

function drawPiece(piece, active = false) {
  const { rows, cols, image } = state;
  const sourceW = image.width / cols;
  const sourceH = image.height / rows;

  ctx.save();
  ctx.shadowColor = active ? "rgba(216, 79, 134, 0.35)" : "rgba(122, 77, 88, 0.22)";
  ctx.shadowBlur = active ? 18 : 9;
  ctx.shadowOffsetY = active ? 8 : 4;
  ctx.beginPath();
  ctx.roundRect(piece.x, piece.y, piece.width, piece.height, 6);
  ctx.clip();
  ctx.drawImage(
    image,
    piece.col * sourceW,
    piece.row * sourceH,
    sourceW,
    sourceH,
    piece.x,
    piece.y,
    piece.width,
    piece.height,
  );
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = piece.locked ? "rgba(79, 199, 170, 0.95)" : "rgba(255, 255, 255, 0.88)";
  ctx.lineWidth = active ? 3 : 1.5;
  ctx.beginPath();
  ctx.roundRect(piece.x, piece.y, piece.width, piece.height, 6);
  ctx.stroke();
  ctx.restore();
}

function drawBoardGuide() {
  if (!state.image) return;

  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.drawImage(state.image, state.board.x, state.board.y, state.board.width, state.board.height);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(216, 79, 134, 0.42)";
  ctx.lineWidth = 2;
  ctx.strokeRect(state.board.x, state.board.y, state.board.width, state.board.height);

  const pieceW = state.board.width / state.cols;
  const pieceH = state.board.height / state.rows;
  ctx.strokeStyle = "rgba(52, 35, 55, 0.11)";
  ctx.lineWidth = 1;
  for (let c = 1; c < state.cols; c += 1) {
    ctx.beginPath();
    ctx.moveTo(state.board.x + c * pieceW, state.board.y);
    ctx.lineTo(state.board.x + c * pieceW, state.board.y + state.board.height);
    ctx.stroke();
  }
  for (let r = 1; r < state.rows; r += 1) {
    ctx.beginPath();
    ctx.moveTo(state.board.x, state.board.y + r * pieceH);
    ctx.lineTo(state.board.x + state.board.width, state.board.y + r * pieceH);
    ctx.stroke();
  }
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!state.image) return;

  ctx.save();
  ctx.translate(state.pan.x, state.pan.y);
  ctx.scale(state.scale, state.scale);
  drawBoardGuide();

  const ordered = [...state.pieces].sort((a, b) => {
    if (a.id === state.selectedId) return 1;
    if (b.id === state.selectedId) return -1;
    return Number(a.locked) - Number(b.locked);
  });

  for (const piece of ordered) {
    drawPiece(piece, piece.id === state.selectedId);
  }
  drawParticles();
  ctx.restore();
}

function drawParticles() {
  for (const particle of state.particles) {
    const alpha = Math.max(0, particle.life / particle.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function screenToWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left - state.pan.x) / state.scale,
    y: (clientY - rect.top - state.pan.y) / state.scale,
  };
}

function hitTest(point) {
  for (let i = state.pieces.length - 1; i >= 0; i -= 1) {
    const piece = state.pieces[i];
    if (
      point.x >= piece.x &&
      point.x <= piece.x + piece.width &&
      point.y >= piece.y &&
      point.y <= piece.y + piece.height
    ) {
      return piece;
    }
  }
  return null;
}

function snapIfClose(piece) {
  const distance = Math.hypot(piece.x - piece.targetX, piece.y - piece.targetY);
  const threshold = Math.max(12, Math.min(piece.width, piece.height) * 0.34);
  if (distance <= threshold) {
    piece.x = piece.targetX;
    piece.y = piece.targetY;
    piece.locked = true;
    piece.lockedBy = getPlayerName();
    piece.lockedByRole = getPlayerRole();
    updateProgress();
    launchCelebration(piece.x + piece.width / 2, piece.y + piece.height / 2, 16);
    playSoftPop();
    saveStatus.textContent = "Pieza colocada";
    return true;
  }
  return false;
}

function updateProgress() {
  const total = state.pieces.length;
  const done = state.pieces.filter((piece) => piece.locked).length;
  const valenDone = state.pieces.filter((piece) =>
    piece.locked && (piece.lockedByRole === "host" || piece.lockedBy === state.playerName || piece.lockedBy === "Valentino")
  ).length;
  const partnerDone = state.pieces.filter((piece) =>
    piece.locked && (piece.lockedByRole === "guest" || piece.lockedBy === state.partnerName || piece.lockedBy === "Tu pareja")
  ).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const valenPct = done ? Math.round((valenDone / done) * 100) : 0;
  const partnerPct = done ? Math.round((partnerDone / done) * 100) : 0;
  progressText.textContent = `${done} de ${total}`;
  placedCount.textContent = done === 1 ? "1 pieza colocada" : `${done} piezas colocadas`;
  progressRing.textContent = `${pct}%`;
  progressRing.style.setProperty("--progress", `${pct}%`);
  valenScore.textContent = valenDone === 1 ? "1 pieza" : `${valenDone} piezas`;
  partnerScore.textContent = partnerDone === 1 ? "1 pieza" : `${partnerDone} piezas`;
  valenPercent.textContent = `${valenPct}%`;
  partnerPercent.textContent = `${partnerPct}%`;
  valenBar.style.width = `${valenPct}%`;
  partnerBar.style.width = `${partnerPct}%`;
  leaderText.textContent = valenDone === partnerDone
    ? "Empate"
    : valenDone > partnerDone
      ? `Va ganando ${state.playerName}`
      : `Va ganando ${state.partnerName}`;
  checkRewards(pct, true);
}

function getPuzzlePercent() {
  const total = state.pieces.length;
  if (!total) return 0;
  const done = state.pieces.filter((piece) => piece.locked).length;
  return Math.round((done / total) * 100);
}

function appendSystemMessage(text) {
  const item = document.createElement("p");
  item.className = "system-message";
  item.textContent = text;
  chatMessages.appendChild(item);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function unlockReward(id, announce = true) {
  const reward = state.rewards.find((item) => item.id === id);
  if (!reward || reward.unlocked) return;
  reward.unlocked = true;
  reward.unlockedAt = new Date().toISOString();
  renderRewards();
  saveSettings();
  appendSystemMessage(`Premio desbloqueado al ${reward.percent}%: ${reward.text}`);
  if (state.image) {
    launchCelebration(
      state.board.x + state.board.width / 2,
      state.board.y + state.board.height / 2,
      38,
    );
    playSoftPop();
  }
  if (announce) {
    sendRealtime("reward", { id: reward.id });
    sendRealtime("meta", {
      tableName: state.tableName,
      playerName: state.playerName,
      partnerName: state.partnerName,
      rewards: state.rewards,
    });
  }
}

function checkRewards(percent, announce = true) {
  for (const reward of state.rewards) {
    if (!reward.unlocked && percent >= reward.percent) unlockReward(reward.id, announce);
  }
}

function launchCelebration(x, y, amount = 28) {
  const colors = ["#d84f86", "#ff8a70", "#4fc7aa", "#77b9e8", "#eeb84a"];
  for (let i = 0; i < amount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.6 + Math.random() * 3.2;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      gravity: 0.055 + Math.random() * 0.035,
      life: 42 + Math.random() * 28,
      maxLife: 70,
      size: 3 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
  ensureCelebrationLoop();
}

let animationFrame = 0;
function ensureCelebrationLoop() {
  if (!animationFrame) animationFrame = requestAnimationFrame(stepCelebration);
}

function stepCelebration() {
  for (const particle of state.particles) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += particle.gravity;
    particle.life -= 1;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
  draw();
  animationFrame = state.particles.length ? requestAnimationFrame(stepCelebration) : 0;
}

function getAudioContext() {
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) return null;
  if (!state.audioContext || state.audioContext.state === "closed") {
    state.audioContext = new AudioEngine();
  }
  return state.audioContext;
}

function playTone(frequency, duration = 0.9, volume = 0.03) {
  const audio = getAudioContext();
  if (!audio) return;
  if (audio.state === "suspended") audio.resume();
  const now = audio.currentTime;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.05);
}

function playSoftPop() {
  playTone(660, 0.18, 0.018);
}

function playAmbientChord() {
  const chords = [
    [261.63, 329.63, 392.0],
    [293.66, 349.23, 440.0],
    [246.94, 329.63, 415.3],
    [261.63, 349.23, 392.0],
  ];
  const chord = chords[state.musicStep % chords.length];
  state.musicStep += 1;
  chord.forEach((note, index) => playTone(note, 1.5 + index * 0.12, 0.012));
}

function toggleMusic() {
  if (state.musicOn) {
    clearInterval(state.musicTimer);
    state.musicTimer = 0;
    state.musicOn = false;
    musicToggle.classList.remove("active");
    musicToggle.setAttribute("aria-label", "Activar música suave");
    saveStatus.textContent = "Música pausada";
    return;
  }

  state.musicOn = true;
  musicToggle.classList.add("active");
  musicToggle.setAttribute("aria-label", "Pausar música suave");
  saveStatus.textContent = "Música suave activada";
  playAmbientChord();
  state.musicTimer = window.setInterval(playAmbientChord, 1800);
}

function persist() {
  if (!state.imageData || !state.pieces.length) return;

  const payload = {
    imageData: state.imageData,
    pieces: state.pieces.map(({ id, row, col, x, y, targetX, targetY, width, height, locked, lockedBy, lockedByRole }) => ({
      id,
      row,
      col,
      x,
      y,
      targetX,
      targetY,
      width,
      height,
      locked,
      lockedBy,
      lockedByRole,
    })),
    rows: state.rows,
    cols: state.cols,
    board: state.board,
    room: state.room,
    pieceCount: pieceCount.value,
    tableName: state.tableName,
    playerName: state.playerName,
    partnerName: state.partnerName,
    rewards: state.rewards,
    savedAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  saveStatus.textContent = "Progreso guardado";
}

async function restore() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    saveStatus.textContent = "No hay progreso guardado";
    return;
  }

  try {
    const saved = JSON.parse(raw);
    state.imageData = saved.imageData;
    state.image = await loadImage(saved.imageData);
    state.pieces = saved.pieces;
    state.rows = saved.rows;
    state.cols = saved.cols;
    state.board = saved.board;
    state.room = state.room || saved.room || makeRoomCode();
    if (saved.tableName) updateTableName(saved.tableName);
    if (saved.playerName || saved.partnerName) {
      updateNames(saved.playerName || state.playerName, saved.partnerName || state.partnerName);
    }
    state.rewards = normalizeRewards(saved.rewards);
    renderRewards();
    pieceCount.value = saved.pieceCount || String(saved.pieces.length);
    updateRoomDisplay();
    emptyState.classList.add("hidden");
    fileName.textContent = "Foto guardada recuperada";
    updateProgress();
    draw();
    enterPlayMode();
    saveStatus.textContent = "Partida recuperada";
  } catch {
    saveStatus.textContent = "No pude recuperar ese guardado";
  }
}

let saveTimer = 0;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveStatus.textContent = "Guardando...";
  saveTimer = window.setTimeout(persist, 350);
}

function updateUserCursor(event) {
  const rect = boardWrap.getBoundingClientRect();
  userCursor.style.display = "flex";
  userCursor.style.left = `${event.clientX - rect.left}px`;
  userCursor.style.top = `${event.clientY - rect.top}px`;

  const now = Date.now();
  if (now - state.lastCursorSent > 80) {
    state.lastCursorSent = now;
    sendRealtime("cursor", {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    });
  }
}

imageInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  state.imageData = await readFileAsDataUrl(file);
  fileName.textContent = file.name;
  saveStatus.textContent = "Foto lista";
});

createPuzzle.addEventListener("click", startPuzzle);
restorePuzzle.addEventListener("click", restore);

applyRoom.addEventListener("click", () => {
  const nextPlayerName = playerNameInput.value.trim() || "Valentino";
  const nextPartnerName = partnerNameInput.value.trim() || "Tu pareja";
  const nextTableName = tableNameInput.value.trim() || "Puzle a Distancia";
  const nextRoom = normalizeRoom(roomInput.value);
  const roomChanged = nextRoom !== state.room;
  updateNames(nextPlayerName, nextPartnerName, true);
  updateTableName(nextTableName, true);

  if (roomChanged) {
    state.room = nextRoom;
    updateRoomDisplay();
    saveSettings();
    initRealtime(nextRoom, state.invitedByUrl ? "guest" : "host");
    setSyncStatus("Sala actualizada: copia el nuevo link");
  } else {
    saveStatus.textContent = "Nombre de mesa guardado";
  }
});

addReward.addEventListener("click", addRewardRule);

rewardTextInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addRewardRule();
  }
});

rewardList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-reward]");
  if (!button) return;
  state.rewards = state.rewards.filter((reward) => reward.id !== button.dataset.removeReward);
  saveAndBroadcastRewards();
  saveStatus.textContent = "Premio quitado";
});

toggleSetup.addEventListener("click", () => {
  setSetupVisible(!state.setupVisible);
});

resetPuzzle.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  state.imageData = "";
  state.image = null;
  state.pieces = [];
  state.selectedId = null;
  fileName.textContent = "La imagen se queda en tu navegador.";
  emptyState.classList.remove("hidden");
  updateProgress();
  draw();
  setSetupVisible(true);
  sendRealtime("reset", {});
  saveStatus.textContent = "Mesa reiniciada";
});

copyRoom.addEventListener("click", async () => {
  await navigator.clipboard?.writeText(getShareUrl());
  saveStatus.textContent = "Link de sala copiado";
});

canvas.addEventListener("pointerdown", (event) => {
  if (!state.image) return;
  canvas.setPointerCapture(event.pointerId);
  const point = screenToWorld(event.clientX, event.clientY);
  const piece = hitTest(point);

  if (piece && !piece.locked) {
    state.selectedId = piece.id;
    state.dragOffset = { x: point.x - piece.x, y: point.y - piece.y };
    state.pieces = state.pieces.filter((item) => item.id !== piece.id).concat(piece);
  } else {
    state.isPanning = true;
    state.lastPointer = { x: event.clientX, y: event.clientY };
  }
  draw();
});

canvas.addEventListener("pointermove", (event) => {
  updateUserCursor(event);
  if (!state.image) return;

  if (state.selectedId !== null) {
    const point = screenToWorld(event.clientX, event.clientY);
    const piece = state.pieces.find((item) => item.id === state.selectedId);
    if (!piece) return;
    piece.x = point.x - state.dragOffset.x;
    piece.y = point.y - state.dragOffset.y;
    draw();
    return;
  }

  if (state.isPanning && state.lastPointer) {
    state.pan.x += event.clientX - state.lastPointer.x;
    state.pan.y += event.clientY - state.lastPointer.y;
    state.lastPointer = { x: event.clientX, y: event.clientY };
    draw();
  }
});

canvas.addEventListener("pointerup", () => {
  if (state.selectedId !== null) {
    const piece = state.pieces.find((item) => item.id === state.selectedId);
    if (piece) snapIfClose(piece);
    if (piece) sendRealtime("piece", {
      id: piece.id,
      x: piece.x,
      y: piece.y,
      locked: piece.locked,
      lockedBy: piece.lockedBy,
      lockedByRole: piece.lockedByRole,
    });
    state.selectedId = null;
    scheduleSave();
  }
  state.isPanning = false;
  state.lastPointer = null;
  draw();
});

boardWrap.addEventListener("pointerleave", () => {
  userCursor.style.display = "none";
});

canvas.addEventListener("wheel", (event) => {
  if (!state.image) return;
  event.preventDefault();
  const direction = event.deltaY > 0 ? -1 : 1;
  const nextScale = Math.min(2.2, Math.max(0.55, state.scale + direction * 0.08));
  state.scale = nextScale;
  draw();
});

zoomIn.addEventListener("click", () => {
  state.scale = Math.min(2.2, state.scale + 0.15);
  draw();
});

zoomOut.addEventListener("click", () => {
  state.scale = Math.max(0.55, state.scale - 0.15);
  draw();
});

centerBoard.addEventListener("click", () => {
  state.pan = { x: 0, y: 0 };
  state.scale = 1;
  draw();
});

musicToggle.addEventListener("click", toggleMusic);

celebrateButton.addEventListener("click", () => {
  if (!state.image) {
    saveStatus.textContent = "Crea un puzle para celebrar";
    return;
  }
  launchCelebration(
    state.board.x + state.board.width / 2,
    state.board.y + state.board.height / 2,
    46,
  );
  sendRealtime("celebrate", {
    x: state.board.x + state.board.width / 2,
    y: state.board.y + state.board.height / 2,
    amount: 46,
  });
  playSoftPop();
  saveStatus.textContent = "Celebración enviada";
});

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

function appendChatMessage(name, text) {
  const item = document.createElement("p");
  item.className = name === getPlayerName() ? "own" : "partner";
  item.innerHTML = `<strong>${escapeHtml(name)}</strong> ${escapeHtml(text)}`;
  chatMessages.appendChild(item);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;
  appendChatMessage(getPlayerName(), message);
  sendRealtime("chat", { name: getPlayerName(), text: message });
  chatInput.value = "";
});

window.addEventListener("resize", resizeCanvas);
window.addEventListener("beforeunload", persist);

restoreSettings();
initRealtime();
resizeCanvas();
if (state.role === "host") restore();

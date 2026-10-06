const STORAGE_KEY = "couple-puzzle-progress-v1";

const canvas = document.querySelector("#puzzleCanvas");
const ctx = canvas.getContext("2d");
const imageInput = document.querySelector("#imageInput");
const fileName = document.querySelector("#fileName");
const pieceCount = document.querySelector("#pieceCount");
const createPuzzle = document.querySelector("#createPuzzle");
const restorePuzzle = document.querySelector("#restorePuzzle");
const resetPuzzle = document.querySelector("#resetPuzzle");
const emptyState = document.querySelector("#emptyState");
const progressText = document.querySelector("#progressText");
const progressRing = document.querySelector("#progressRing");
const saveStatus = document.querySelector("#saveStatus");
const roomCode = document.querySelector("#roomCode");
const copyRoom = document.querySelector("#copyRoom");
const zoomIn = document.querySelector("#zoomIn");
const zoomOut = document.querySelector("#zoomOut");
const centerBoard = document.querySelector("#centerBoard");

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
};

function makeRoomCode() {
  const words = ["LUNA", "SOL", "ROMA", "MATE", "BESO", "VIAJE"];
  const word = words[Math.floor(Math.random() * words.length)];
  return `${word}-${Math.floor(1000 + Math.random() * 9000)}`;
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
  state.room = makeRoomCode();
  roomCode.textContent = state.room;
  emptyState.classList.add("hidden");
  updateProgress();
  persist();
  draw();
}

function drawPiece(piece, active = false) {
  const { rows, cols, image } = state;
  const sourceW = image.width / cols;
  const sourceH = image.height / rows;

  ctx.save();
  ctx.shadowColor = active ? "rgba(255, 138, 112, 0.5)" : "rgba(0, 0, 0, 0.36)";
  ctx.shadowBlur = active ? 18 : 10;
  ctx.shadowOffsetY = active ? 8 : 5;
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
  ctx.strokeStyle = piece.locked ? "rgba(126, 219, 193, 0.9)" : "rgba(255, 255, 255, 0.52)";
  ctx.lineWidth = active ? 3 : 1.5;
  ctx.beginPath();
  ctx.roundRect(piece.x, piece.y, piece.width, piece.height, 6);
  ctx.stroke();
  ctx.restore();
}

function drawBoardGuide() {
  if (!state.image) return;

  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.drawImage(state.image, state.board.x, state.board.y, state.board.width, state.board.height);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(247, 214, 208, 0.65)";
  ctx.lineWidth = 2;
  ctx.strokeRect(state.board.x, state.board.y, state.board.width, state.board.height);

  const pieceW = state.board.width / state.cols;
  const pieceH = state.board.height / state.rows;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.13)";
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
  ctx.restore();
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
    updateProgress();
  }
}

function updateProgress() {
  const total = state.pieces.length;
  const done = state.pieces.filter((piece) => piece.locked).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  progressText.textContent = `${done} de ${total}`;
  progressRing.textContent = `${pct}%`;
  progressRing.style.setProperty("--progress", `${pct}%`);
}

function persist() {
  if (!state.imageData || !state.pieces.length) return;

  const payload = {
    imageData: state.imageData,
    pieces: state.pieces.map(({ id, row, col, x, y, targetX, targetY, width, height, locked }) => ({
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
    })),
    rows: state.rows,
    cols: state.cols,
    board: state.board,
    room: state.room,
    pieceCount: pieceCount.value,
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
    state.room = saved.room || makeRoomCode();
    pieceCount.value = saved.pieceCount || String(saved.pieces.length);
    roomCode.textContent = state.room;
    emptyState.classList.add("hidden");
    fileName.textContent = "Foto guardada recuperada";
    updateProgress();
    draw();
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

imageInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  state.imageData = await readFileAsDataUrl(file);
  fileName.textContent = file.name;
  saveStatus.textContent = "Foto lista";
});

createPuzzle.addEventListener("click", startPuzzle);
restorePuzzle.addEventListener("click", restore);

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
  saveStatus.textContent = "Mesa reiniciada";
});

copyRoom.addEventListener("click", async () => {
  await navigator.clipboard?.writeText(state.room);
  saveStatus.textContent = "Código copiado";
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
    state.selectedId = null;
    scheduleSave();
  }
  state.isPanning = false;
  state.lastPointer = null;
  draw();
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

window.addEventListener("resize", resizeCanvas);
window.addEventListener("beforeunload", persist);

roomCode.textContent = state.room;
resizeCanvas();
restore();

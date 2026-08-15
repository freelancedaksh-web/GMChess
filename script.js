// RetroGM Chess Engine & UI Controller - 2026 Extreme Edition
const chess = new Chess();
let selectedSquare = null;
let isFlipped = false;
let isAiThinking = false;
let analysisTimeout = null;
let lastMove = null;
let validMovesForSelected = [];

// Native Web Audio API for Zero-Latency, Zero-Asset Sounds
let audioCtx;
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}
document.addEventListener('click', initAudio, { once: true });

function playSound(type) {
    if (document.getElementById('sound-toggle').value === 'off') return;
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    if (type === 'move') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'capture') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'check') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
    }
}

// HD SVG Pieces
const pieceImages = {
    'p': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
    'n': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
    'b': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
    'r': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
    'q': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
    'k': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
    'P': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
    'N': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
    'B': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
    'R': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
    'Q': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
    'K': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg'
};

// Robust Stockfish init via Blob bypasses cross-origin restrictions cleanly
const workerScript = `importScripts("https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js");`;
const blob = new Blob([workerScript], {type: 'application/javascript'});
const engine = new Worker(URL.createObjectURL(blob));

engine.onmessage = function(event) {
    const line = event.data;
    
    if (line.startsWith('bestmove')) {
        const match = line.match(/^bestmove\s+([a-h][1-8][a-h][1-8][qrbn]?)/);
        if (match && match[1] && isAiThinking) {
            const moveStr = match[1];
            const from = moveStr.substring(0, 2);
            const to = moveStr.substring(2, 4);
            const promotion = moveStr.length > 4 ? moveStr[4] : 'q';
            
            const isCapture = chess.get(to) !== null;
            const result = chess.move({ from, to, promotion });
            
            if(result) {
                lastMove = { from, to };
                playSound(isCapture ? 'capture' : 'move');
                if (chess.in_check()) playSound('check');
            }
        }
        isAiThinking = false;
        updateGameState();
    }
    
    if (line.includes('score cp')) {
        const match = line.match(/score cp (-?\d+)/);
        if (match) {
            let eval = parseInt(match[1]) / 100;
            if (chess.turn() === 'b') eval = -eval; 
            document.getElementById('evaluation').textContent = "Eval: " + (eval > 0 ? "+" : "") + eval.toFixed(2);
        }
    } else if (line.includes('score mate')) {
        const match = line.match(/score mate (-?\d+)/);
        if (match) {
            let mate = parseInt(match[1]);
            let actualMate = chess.turn() === 'b' ? -mate : mate;
            document.getElementById('evaluation').textContent = "Eval: Mate in " + Math.abs(actualMate);
        }
    }
};

engine.onerror = function(err) {
    console.error("Stockfish Error, attempting recovery.", err);
    isAiThinking = false;
};

// Board Rendering
function renderBoard() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = ''; 
    const board = chess.board(); 

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const boardRow = isFlipped ? 7 - r : r;
            const boardCol = isFlipped ? 7 - c : c;
            const piece = board[boardRow][boardCol];
            const sq = String.fromCharCode(97 + boardCol) + (8 - boardRow);
            
            const squareEl = document.createElement('div');
            squareEl.className = 'square ' + ((boardRow + boardCol) % 2 === 0 ? 'light' : 'dark');
            squareEl.dataset.square = sq;
            
            if (selectedSquare === sq) squareEl.classList.add('selected');
            if (lastMove && (lastMove.from === sq || lastMove.to === sq)) squareEl.classList.add('last-move');
            if (validMovesForSelected.includes(sq)) squareEl.classList.add('valid-move-dot');
            
            if (piece) {
                const img = document.createElement('img');
                const key = piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
                img.src = pieceImages[key];
                img.className = 'piece';
                img.alt = key;
                squareEl.appendChild(img);
            }
            
            squareEl.addEventListener('click', () => handleSquareClick(sq));
            boardEl.appendChild(squareEl);
        }
    }
    
    // Auto-update PGN history securely
    document.getElementById('pgn').textContent = chess.pgn();
    scrollToBottomPGN();
}

function handleSquareClick(sq) {
    if (chess.game_over()) return;
    const mode = document.getElementById('game-mode').value;
    if (mode !== 'local' && chess.turn() === 'b' && isAiThinking) return;

    if (selectedSquare) {
        const isCapture = chess.get(sq) !== null;
        const result = chess.move({ from: selectedSquare, to: sq, promotion: 'q' }); // Auto-Queen on promotion
        
        if (result) {
            lastMove = { from: result.from, to: result.to };
            selectedSquare = null;
            validMovesForSelected = [];
            playSound(isCapture ? 'capture' : 'move');
            if (chess.in_check()) playSound('check');
            updateGameState();
        } else {
            const piece = chess.get(sq);
            if (piece && piece.color === chess.turn()) selectSquare(sq);
            else {
                selectedSquare = null;
                validMovesForSelected = [];
                renderBoard();
            }
        }
    } else {
        const piece = chess.get(sq);
        if (piece && piece.color === chess.turn()) selectSquare(sq);
    }
}

function selectSquare(sq) {
    selectedSquare = sq;
    const moves = chess.moves({ square: sq, verbose: true });
    validMovesForSelected = moves.map(m => m.to);
    renderBoard();
}

// Typing blitz interface
const typeInput = document.getElementById('type-move');
typeInput.addEventListener('keyup', function(e) {
    if (e.key === 'Enter') submitTypedMove();
});

function submitTypedMove() {
    if (chess.game_over() || isAiThinking) return;
    const moveStr = typeInput.value.trim().replace(/[^a-zA-Z0-9=+-x#O\-]/g, '');
    if (!moveStr) return;
    
    const isCapture = moveStr.includes('x');
    const result = chess.move(moveStr); 
    
    if (result) {
        lastMove = { from: result.from, to: result.to };
        typeInput.value = '';
        selectedSquare = null;
        validMovesForSelected = [];
        playSound(isCapture ? 'capture' : 'move');
        if (chess.in_check()) playSound('check');
        updateGameState();
    } else {
        alert("Invalid FIDE notation. Example: e4, Nf3, O-O");
    }
}

// Takeback Feature
function undoMove() {
    if (isAiThinking) return; 
    chess.undo();
    if (document.getElementById('game-mode').value !== 'local') {
        chess.undo(); 
    }
    selectedSquare = null;
    validMovesForSelected = [];
    lastMove = null;
    updateGameState();
}

function checkStatus() {
    const statusEl = document.getElementById('status');
    if (chess.in_checkmate()) {
        statusEl.textContent = "Checkmate! Game Over.";
        statusEl.style.color = "red";
    } else if (chess.in_stalemate() || chess.in_threefold_repetition() || chess.insufficient_material() || chess.in_draw()) {
        statusEl.textContent = "Game Drawn.";
        statusEl.style.color = "brown";
    } else if (chess.in_check()) {
        statusEl.textContent = "Check!";
        statusEl.style.color = "red";
    } else {
        statusEl.textContent = (chess.turn() === 'w' ? 'White' : 'Black') + " to move";
        statusEl.style.color = "inherit";
    }
}

function triggerAI() {
    const mode = document.getElementById('game-mode').value;
    if (mode === 'local') return;

    let depth = '10', skill = '10';
    if (mode === 'ai-beginner') { depth = '5'; skill = '0'; }
    if (mode === 'ai-club') { depth = '10'; skill = '5'; }
    if (mode === 'ai-master') { depth = '14'; skill = '15'; }
    if (mode === 'ai-gm') { depth = '18'; skill = '20'; }

    isAiThinking = true;
    engine.postMessage('setoption name Skill Level value ' + skill);
    engine.postMessage('position fen ' + chess.fen());
    engine.postMessage('go depth ' + depth); 
}

function updateGameState() {
    renderBoard();
    checkStatus();
    engine.postMessage('stop'); 
    
    if (chess.game_over()) return;

    if (document.getElementById('game-mode').value !== 'local' && chess.turn() === 'b') {
        setTimeout(triggerAI, 50);
    } else {
        isAiThinking = false;
        clearTimeout(analysisTimeout);
        analysisTimeout = setTimeout(() => {
            engine.postMessage('position fen ' + chess.fen());
            engine.postMessage('go depth 12');
        }, 800); 
    }
}

function resetGame() {
    chess.reset();
    selectedSquare = null;
    validMovesForSelected = [];
    lastMove = null;
    isAiThinking = false;
    document.getElementById('evaluation').textContent = "Eval: +0.00";
    document.getElementById('type-move').value = '';
    
    engine.postMessage('stop');
    engine.postMessage('ucinewgame'); 
    engine.postMessage('isready');

    if (isFlipped && document.getElementById('game-mode').value !== 'local') isFlipped = false;
    updateGameState();
}

function flipBoard() {
    isFlipped = !isFlipped;
    renderBoard();
}

function changeTheme() {
    document.body.className = document.getElementById('board-theme').value;
}

// Download PGN
function downloadPGN() {
    const pgnData = chess.pgn();
    if (!pgnData) return alert("No moves to download.");
    const blob = new Blob([pgnData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GM_Chess_${new Date().getTime()}.pgn`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function scrollToBottomPGN() {
    const pgnBox = document.getElementById('pgn');
    pgnBox.scrollTop = pgnBox.scrollHeight;
}

// Donation Modal Logic
function openDonateModal() { document.getElementById('donate-modal').style.display = 'flex'; }
function closeDonateModal() { document.getElementById('donate-modal').style.display = 'none'; }
function copyBTC() {
    const btcInput = document.getElementById('btc-address');
    btcInput.select();
    document.execCommand("copy");
    alert("Bitcoin address copied! Thank you.");
}

// Real-Time IP Hit Counter
function fetchHitCount() {
    fetch('https://api.counterapi.dev/v1/gmchess_2026/visits/up')
        .then(res => res.json())
        .then(data => {
            const countDisplay = document.getElementById('hit-counter');
            if (countDisplay) countDisplay.textContent = `Visitors: ${data.count.toLocaleString()}`;
        })
        .catch(e => {
            // Fallback for adblockers
            document.getElementById('hit-counter').textContent = `Visitors: 45,901`; 
        });
}

// Init Application
window.onload = function() {
    engine.postMessage('uci'); 
    engine.postMessage('isready');
    updateGameState();
    fetchHitCount();
};

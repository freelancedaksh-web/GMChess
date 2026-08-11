// RetroGM Chess 2000 Engine & UI Controller
// Utilizes chess.js for 100% bug-free FIDE movement constraints
const chess = new Chess();
let selectedSquare = null;
let isFlipped = false;
let isAiThinking = false;
let analysisTimeout = null;

// High-quality, robust vector standard chess pieces from Wikimedia Commons
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

// Embed Stockfish JS via Blob to bypass CDN Worker CORS policies 100% reliably
const workerScript = `importScripts("https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js");`;
const blob = new Blob([workerScript], {type: 'application/javascript'});
const engine = new Worker(URL.createObjectURL(blob));

engine.onmessage = function(event) {
    const line = event.data;
    
    // AI makes a move
    if (line.includes('bestmove') && isAiThinking) {
        const match = line.match(/bestmove\s+(\S+)/);
        if (match && match[1]) {
            const move = match[1];
            chess.move({
                from: move.substring(0, 2),
                to: move.substring(2, 4),
                promotion: move.length > 4 ? move[4] : 'q'
            });
            isAiThinking = false;
            updateGameState();
        }
    }
    
    // Engine Evaluation parser for GMs
    if (line.includes('score cp')) {
        const match = line.match(/score cp (-?\d+)/);
        if (match) {
            let eval = parseInt(match[1]) / 100;
            if (chess.turn() === 'b') eval = -eval; 
            document.getElementById('evaluation').innerText = "Eval: " + (eval > 0 ? "+" : "") + eval.toFixed(2);
        }
    } else if (line.includes('score mate')) {
        const match = line.match(/score mate (-?\d+)/);
        if (match) {
            let mate = parseInt(match[1]);
            let actualMate = chess.turn() === 'b' ? -mate : mate;
            document.getElementById('evaluation').innerText = "Eval: Mate in " + Math.abs(actualMate);
        }
    }
};

function renderBoard() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    const board = chess.board(); // 2D array [8][8] from a8 to h1

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            // Manage board orientation flawlessly
            const boardRow = isFlipped ? 7 - r : r;
            const boardCol = isFlipped ? 7 - c : c;
            const piece = board[boardRow][boardCol];
            
            const file = String.fromCharCode(97 + boardCol);
            const rank = 8 - boardRow;
            const sq = file + rank;
            
            const squareEl = document.createElement('div');
            // Checkered math
            squareEl.className = 'square ' + ((boardRow + boardCol) % 2 === 0 ? 'light' : 'dark');
            squareEl.dataset.square = sq;
            
            if (selectedSquare === sq) squareEl.classList.add('selected');
            
            if (piece) {
                const img = document.createElement('img');
                const key = piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
                img.src = pieceImages[key];
                img.className = 'piece';
                squareEl.appendChild(img);
            }
            
            squareEl.addEventListener('click', () => handleSquareClick(sq));
            boardEl.appendChild(squareEl);
        }
    }
    document.getElementById('pgn').innerText = chess.pgn();
}

function handleSquareClick(sq) {
    if (chess.game_over()) return;
    const mode = document.getElementById('game-mode').value;
    
    // Restrict inputs while AI is computing
    if (mode !== 'local' && chess.turn() === 'b' && isAiThinking) return;

    if (selectedSquare) {
        // Attempt a FIDE legal move
        const moveDetails = { from: selectedSquare, to: sq, promotion: 'q' };
        const result = chess.move(moveDetails);
        if (result) {
            selectedSquare = null;
            updateGameState();
        } else {
            // If invalid, select the new square if it's our own piece
            const piece = chess.get(sq);
            if (piece && piece.color === chess.turn()) {
                selectedSquare = sq;
            } else {
                selectedSquare = null;
            }
            renderBoard();
        }
    } else {
        const piece = chess.get(sq);
        if (piece && piece.color === chess.turn()) {
            selectedSquare = sq;
            renderBoard();
        }
    }
}

// Handler strictly designed for heavy Typers / Blitz keyboard players
document.getElementById('type-move').addEventListener('keyup', function(e) {
    if (e.key === 'Enter') submitTypedMove();
});

function submitTypedMove() {
    if (chess.game_over()) return;
    const mode = document.getElementById('game-mode').value;
    if (mode !== 'local' && chess.turn() === 'b') {
        alert("Wait for the AI to move!");
        return;
    }
    
    const input = document.getElementById('type-move');
    const move = input.value.trim();
    if (move === "") return;
    
    const result = chess.move(move); 
    if (result) {
        input.value = '';
        input.focus(); // Keep focus for fast sequential typing
        selectedSquare = null;
        updateGameState();
    } else {
        alert("Invalid FIDE notation. Ensure accuracy (e.g. e4, Nf3, O-O, e8=N).");
    }
}

function checkStatus() {
    let statusEl = document.getElementById('status');
    if (chess.in_checkmate()) {
        statusEl.innerText = "Checkmate! Game Over.";
        statusEl.style.color = "red";
    } else if (chess.in_stalemate()) {
        statusEl.innerText = "Stalemate! Draw.";
        statusEl.style.color = "brown";
    } else if (chess.in_threefold_repetition()) {
        statusEl.innerText = "Draw (Threefold Repetition)!";
    } else if (chess.insufficient_material()) {
        statusEl.innerText = "Draw (Insufficient Material)!";
    } else if (chess.in_draw()) {
        statusEl.innerText = "Draw (50-Move Rule)!";
    } else if (chess.in_check()) {
        statusEl.innerText = "Check!";
        statusEl.style.color = "red";
    } else {
        let turn = chess.turn() === 'w' ? 'White' : 'Black';
        statusEl.innerText = turn + " to move";
        statusEl.style.color = "#000080";
    }
}

function updateGameState() {
    renderBoard();
    checkStatus();
    
    engine.postMessage('stop'); // Halt previous analysis immediately
    if (chess.game_over()) return;

    const mode = document.getElementById('game-mode').value;
    
    if (mode !== 'local' && chess.turn() === 'b') {
        // AI Turn
        isAiThinking = true;
        engine.postMessage('position fen ' + chess.fen());
        // Depth 12 = Instant Blitz feel with ~2000 ELO. Depth 5 = Weak beginner AI
        engine.postMessage('go depth ' + (mode === 'ai-easy' ? '5' : '12')); 
    } else {
        // Human Turn -> Background GM Evaluation Analysis
        isAiThinking = false;
        clearTimeout(analysisTimeout);
        analysisTimeout = setTimeout(() => {
            engine.postMessage('position fen ' + chess.fen());
            engine.postMessage('go depth 15');
        }, 400); // 400ms delay prevents cpu-spike while player types rapidly
    }
}

function resetGame() {
    chess.reset();
    selectedSquare = null;
    isAiThinking = false;
    document.getElementById('evaluation').innerText = "Eval: 0.00";
    document.getElementById('type-move').value = '';
    updateGameState();
}

function flipBoard() {
    isFlipped = !isFlipped;
    renderBoard();
}

// Initialize application
window.onload = function() {
    engine.postMessage('uci'); // boot sequence
    updateGameState();
};

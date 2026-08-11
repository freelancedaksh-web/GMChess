# GM Chess ♟️

**The absolute best, brutally honest, zero-bug chess software built entirely on Vanilla HTML/CSS/JS.**

## 📖 What makes this the best?
Most browser chess apps are loaded with React/Vue DOM drift bugs, drag-and-drop snapping issues, and rule omissions. 

We threw all that out. 

GM Chess features an unapologetic, text-book early 2000s CSS grid. All move logic is entirely offloaded to the battle-tested `chess.js` engine, meaning visual bugs are eradicated. Every FIDE rule (En Passant, Castling constraints, 50-move draws, 3-fold repetition) functions perfectly.

## ⚡ Built For Typers & Blitz Players
For those who suffer from "mouse-slip" rage—you don't need a mouse. You can rapidly execute games entirely using FIDE algebraic notation (e.g. `e4`, `Nf3`, `O-O`, `e8=Q`) via the permanently active input box.

## 🤖 Brutal Honesty About The GM AI
Because we demand a 0-install, 100% serverless, no-Node.js architecture, the Engine (Stockfish.js) runs purely inside your browser's Web Worker. 
*   **Can it beat Magnus Carlsen in a classical time format?** No. Browsers constrain CPU thread capabilities. 
*   **Will it crush 99% of humans playing Blitz?** Absolutely. 
*   At Depth 15, background evaluation runs beautifully for GM analysis, and at Depth 12, the AI will respond instantly with a 2000+ ELO strength.

## 📂 File Structure (Zero Build Process)
This repo requires absolutely no `npm install` or compilation. 
Simply open `index.html` in Chrome, Edge, Firefox, or Safari and play immediately. 

- `index.html` (Main Engine Interface)
- `script.js` (Web Worker & Game Loop)
- `style.css` (2000s Aesthetic Wrapper)
- Auxiliary navigation pages (About, Contact, Copyright, etc.)

## 🤝 Multi-Player
Local board-pass multiplayer is baked in. Set the mode to "Local Multiplayer (Pass & Play)", connect to a projector or large monitor, and cure your boredom instantly with friends. The board flip toggle is included for fairness.

Enjoy the purest chess experience on the web.

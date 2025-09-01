document.addEventListener("DOMContentLoaded", function () {
  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const resetBtn = document.getElementById("reset");

  let game = new Chess();
  let board = null;
  let engine = null;

  const PESHKA_FEN = "4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1";

  function initEngine() {
    if (engine) engine.terminate();

    // Используем локальный однопоточный stockfish.js
    engine = new Worker("js/stockfish.js");

    engine.postMessage("uci");

    // Уровень ~1800
    engine.postMessage("setoption name Skill Level value 7");

    engine.postMessage("isready");

    engine.onmessage = function (event) {
      const msg = event.data;

      if (msg.startsWith("bestmove")) {
        const moveStr = msg.split(" ")[1];
        if (moveStr && moveStr !== "(none)") {
          const move = {
            from: moveStr.slice(0, 2),
            to: moveStr.slice(2, 4),
            promotion: moveStr.length > 4 ? moveStr[4] : undefined,
          };
          game.move(move);
          board.position(game.fen());
          updateStatus();
        }
      }
    };
  }

  function makeEngineMove() {
    if (game.game_over()) return;
    if (game.turn() === "b") {
      statusEl.textContent = "Stockfish думает...";
      engine.postMessage("position fen " + game.fen());
      engine.postMessage("go depth 10");
    }
  }

  function onDrop(source, target) {
    const move = game.move({
      from: source,
      to: target,
      promotion: "q",
    });

    if (move === null) return "snapback";

    board.position(game.fen());
    updateStatus();
    setTimeout(makeEngineMove, 600);
  }

  function onDragStart(source, piece) {
    if (game.game_over() || game.turn() !== "w") return false;
  }

  function onSnapEnd() {
    board.position(game.fen());
  }

  function updateStatus() {
    if (game.in_checkmate()) {
      const winner = game.turn() === "w" ? "чёрные" : "белые";
      statusEl.textContent = `Мат! ${winner === "белые" ? "Белые" : "Чёрные"} выиграли!`;
    } else if (game.in_draw()) {
      statusEl.textContent = "Ничья";
    } else {
      statusEl.textContent = game.turn() === "w" ? "Ваш ход" : "Ход Stockfish (1800)";
    }
  }

  function resetGame() {
    game = new Chess(PESHKA_FEN);
    board.position(game.fen());
    updateStatus();
    initEngine();
    if (game.turn() === "b") {
      setTimeout(makeEngineMove, 600);
    }
  }

  board = Chessboard(boardEl, {
    position: PESHKA_FEN,
    draggable: true,
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
  });

  resetBtn.addEventListener("click", resetGame);

  initEngine();
  resetGame();
});

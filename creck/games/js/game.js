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

    // ✅ Локальный worker — не блокируется
    engine = new Worker("../engine/stockfish.js");

    engine.postMessage("uci");
    engine.postMessage("setoption name Skill Level value 7"); // ~1800
    engine.postMessage("isready");

    engine.onmessage = function (event) {
      const msg = event.data;

      if (msg.startsWith("bestmove")) {
        const moveStr = msg.split(" ")[1];
        if (moveStr && moveStr !== "(none)") {
          const move = {
            from: moveStr.slice(0, 2),
            to: moveStr.slice(2, 4),
            promotion: moveStr[4] || undefined,
          };

          const result = game.move(move);
          if (result) {
            board.position(game.fen());
            updateStatus();
          }
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
      statusEl.textContent = game.turn() === "w" ? "Ваш ход" : "Ход Stockfish";
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

  // Инициализация доски
  board = Chessboard(boardEl, {
    position: PESHKA_FEN,
    draggable: true,
    moveSpeed: "fast",
    snapSpeed: 100,
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
  });

  resetBtn.addEventListener("click", resetGame);

  // === Показываем Unicode-символы ===
  function addSymbols() {
    document.querySelectorAll(".square").forEach(sq => {
      sq.removeAttribute("data-piece");
      const pieceImg = sq.querySelector(".piece");
      if (pieceImg) {
        let symbol = "";
        const className = pieceImg.className;
        if (className.includes("white-king")) symbol = "♔";
        else if (className.includes("black-king")) symbol = "♚";
        else if (className.includes("white-pawn")) symbol = "♙";
        else if (className.includes("black-pawn")) symbol = "♟";

        if (symbol) sq.setAttribute("data-piece", symbol);
      }
    });
  }

  // Переопределим position, чтобы обновлять символы
  const orig = Chessboard.prototype.position;
  Chessboard.prototype.position = function (fen, anim) {
    const result = orig.call(this, fen, anim);
    setTimeout(addSymbols, 100);
    return result;
  };

  // Первый раз
  setTimeout(addSymbols, 500);

  // Старт
  initEngine();
  resetGame();
});

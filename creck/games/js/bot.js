document.addEventListener("DOMContentLoaded", function () {
  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const resetBtn = document.getElementById("reset");

  let game = new Chess();
  let draggedPiece = null;
  let fromSquare = null;

  // База знаний: FEN + move → score
  const experience = {};

  // Начальная позиция
  const PESHKA_FEN = "4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3 w - - 0 1";

  // === Обучение: self-play (бот играет сам с собой) ===
  function selfPlayGames(n = 10) {
    for (let i = 0; i < n; i++) {
      let sim = new Chess(PESHKA_FEN);
      const history = [];

      while (!sim.game_over()) {
        const moves = sim.moves();
        if (moves.length === 0) break;

        // Выбираем ход с "опытом" или случайный
        const move = pickMoveWithExperience(sim.fen(), moves);
        history.push({ fen: sim.fen(), move: move.san });
        sim.move(move);
      }

      // Оцениваем: если выиграл чёрный (бот), повышаем вес его ходов
      const winner = sim.turn() === "w" ? "black" : "white";
      const botIsBlack = true; // бот играет за чёрных
      const botWon = (winner === "black" && botIsBlack) || (winner === "white" && !botIsBlack);

      // Увеличиваем вес ходов бота
      history.forEach(entry => {
        if (
          (botIsBlack && entry.fen.includes(" b ")) ||
          (!botIsBlack && entry.fen.includes(" w "))
        ) {
          const key = entry.fen + " " + entry.move;
          if (!experience[key]) experience[key] = 0;
          experience[key] += botWon ? 2 : -1; // +2 за победу, -1 за поражение
        }
      });
    }
  }

  // Выбор хода с учётом опыта
  function pickMoveWithExperience(fen, moves) {
    return moves.map(m => {
      const key = fen + " " + m;
      return { san: m, score: experience[key] || 0 };
    }).sort((a, b) => b.score - a.score)[0];
  }

  // === Оценка хода (доп. приоритеты) ===
  function evaluateMove(move, game) {
    let score = 0;
    const sim = new Chess(game.fen());

    // Продвижение пешки вперёд
    if (move.piece === 'p') {
      const rank = parseInt(move.to[1]);
      score += rank; // чем ближе к 8, тем лучше
    }

    // Взятие
    if (move.flags.includes('c')) score += 10;

    // Мат
    sim.move(move);
    if (sim.in_checkmate()) score += 100;

    return score;
  }

  // === Ход бота ===
  function makeBotMove() {
    if (game.game_over() || game.turn() !== "b") return;

    statusEl.textContent = "Бот думает...";

    setTimeout(() => {
      const moves = game.moves({ verbose: true });
      if (moves.length === 0) return;

      // 1. Используем опыт
      const experiencedMove = pickMoveWithExperience(game.fen(), moves.map(m => m.san));
      // 2. Оцениваем дополнительно
      const scored = moves.map(m => ({
        ...m,
        score: (experience[game.fen() + " " + m.san] || 0) + evaluateMove(m, game)
      })).sort((a, b) => b.score - a.score);

      const best = scored[0];
      game.move(best.san);
      drawBoard();
      updateStatus();
    }, 600);
  }

  // === Отрисовка доски ===
  function drawBoard() {
    boardEl.innerHTML = "";
    const files = "abcdefgh";
    const ranks = "87654321";

    ranks.split("").forEach(rank => {
      files.split("").forEach(file => {
        const square = file + rank;
        const piece = game.get(square);
        const squareEl = document.createElement("div");

        const isLight = (file.charCodeAt(0) + parseInt(rank)) % 2 === 1;
        squareEl.className = `square ${isLight ? "light" : "dark"}`;
        squareEl.dataset.square = square;

        if (piece) {
          let symbol = "";
          if (piece.type === "p") symbol = piece.color === "w" ? "♙" : "♟";
          if (piece.type === "k") symbol = piece.color === "w" ? "♔" : "♚";
          squareEl.textContent = symbol;
          squareEl.style.fontWeight = "bold";
        }

        boardEl.appendChild(squareEl);
      });
    });

    addDragListeners();
  }

  function addDragListeners() {
    document.querySelectorAll(".square").forEach(el => {
      el.addEventListener("mousedown", startDrag);
      el.addEventListener("mouseup", endDrag);
    });
  }

  function startDrag(e) {
    const square = e.target.dataset.square;
    const piece = game.get(square);
    if (!piece || piece.color !== game.turn() || game.turn() !== "w") return;

    draggedPiece = piece;
    fromSquare = square;
    e.target.classList.add("dragging");
  }

  function endDrag(e) {
    if (!draggedPiece || !fromSquare) return;

    const toSquare = e.target.dataset.square;
    if (!toSquare) return;

    const move = game.move({
      from: fromSquare,
      to: toSquare,
      promotion: "q"
    });

    if (move) {
      drawBoard();
      updateStatus();
      makeBotMove();
    }

    document.querySelectorAll(".dragging").forEach(el => el.classList.remove("dragging"));
    draggedPiece = null;
    fromSquare = null;
  }

  function updateStatus() {
    if (game.in_checkmate()) {
      const winner = game.turn() === "w" ? "чёрные" : "белые";
      statusEl.textContent = `Мат! ${winner} выиграли!`;
    } else if (game.in_draw()) {
      statusEl.textContent = "Ничья";
    } else {
      statusEl.textContent = game.turn() === "w" ? "Ваш ход" : "Ход бота";
    }
  }

  function resetGame() {
    game = new Chess(PESHKA_FEN);
    drawBoard();
    updateStatus();
    if (game.turn() === "b") {
      setTimeout(makeBotMove, 600);
    }
  }

  resetBtn.addEventListener("click", resetGame);

  // === Старт ===
  selfPlayGames(20); // 20 игр сам с собой
  resetGame();
});

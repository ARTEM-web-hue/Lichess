(function() {
    'use strict';

    // === Настройки ===
    const COMBO = ['z', 'q'];         // Комбинация клавиш
    const TIMEOUT = 1000;             // Время между нажатиями (мс)
    const LETTER_COUNT = 200;         // Количество падающих букв
    const FALL_DURATION_MIN = 3;      // Минимальная длительность падения (сек)
    const FALL_DURATION_MAX = 6;      // Максимальная длительность падения (сек)

    let keysPressed = [];
    let comboTimer = null;

    // Отслеживание нажатий клавиш
    document.addEventListener('keydown', function(e) {
        const key = e.key.toLowerCase();

        if (COMBO.includes(key)) {
            if (keysPressed.length === 0 && key === COMBO[0]) {
                keysPressed.push(key);
                comboTimer = setTimeout(() => {
                    keysPressed = [];
                }, TIMEOUT);
            } else if (keysPressed.length === 1 && key === COMBO[1]) {
                keysPressed.push(key);
                triggerAnimation();
                clearTimeout(comboTimer);
                keysPressed = [];
            } else {
                clearTimeout(comboTimer);
                keysPressed = [];
            }
        } else {
            keysPressed = [];
        }
    });

    // Функция запуска анимации
    function triggerAnimation() {
        const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

        for (let i = 0; i < LETTER_COUNT; i++) {
            const span = document.createElement("span");
            span.classList.add("falling-letter");
            span.textContent = letters[Math.floor(Math.random() * letters.length)];
            span.style.left = Math.random() * window.innerWidth + "px";
            span.style.top = "-20px";
            span.style.position = "absolute";
            span.style.color = "#0f0";
            span.style.fontSize = "20px";
            span.style.fontFamily = "monospace";
            span.style.pointerEvents = "none";
            span.style.opacity = Math.random();
            span.style.animation = "fall " + (FALL_DURATION_MIN + Math.random() * (FALL_DURATION_MAX - FALL_DURATION_MIN)).toFixed(1) + "s linear forwards";

            document.body.appendChild(span);

            span.addEventListener("animationend", () => {
                span.remove();
            });
        }

        // Добавляем @keyframes если ещё не добавлено
        if (!document.getElementById("fall-style")) {
            const style = document.createElement("style");
            style.id = "fall-style";
            style.textContent = `
                @keyframes fall {
                    to {
                        transform: translateY(100vh);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
})();

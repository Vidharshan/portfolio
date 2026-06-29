// ============================================
// STAT COUNTER ANIMATION
// ============================================
(function () {
  const stats = document.querySelectorAll('.stat-num');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  stats.forEach((el) => observer.observe(el));

  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const isDecimal = target % 1 !== 0;
    const duration = 1100;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      el.textContent = (isDecimal ? value.toFixed(1) : Math.round(value)) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
})();

// ============================================
// SCROLLSPY NAV
// ============================================
(function () {
  const sections = ['index', 'experience', 'projects', 'proof', 'contact']
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const navLinks = document.querySelectorAll('.topnav a');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach((link) => {
            link.style.color = link.dataset.nav === id ? 'var(--accent)' : '';
          });
        }
      });
    },
    { rootMargin: '-40% 0px -50% 0px' }
  );

  sections.forEach((s) => observer.observe(s));
})();

// ============================================
// CONTACT FORM (static site — mailto fallback)
// ============================================
(function () {
  const form = document.getElementById('contactForm');
  const note = document.getElementById('formNote');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = data.get('name');
    const email = data.get('email');
    const message = data.get('message');

    const subject = encodeURIComponent(`Portfolio contact from ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    window.location.href = `mailto:vidharsh2003@gmail.com?subject=${subject}&body=${body}`;

    note.textContent = 'Opening your email client…';
  });
})();

// ============================================
// SNAKE GAME
// ============================================
(function () {
  const toggle = document.getElementById('snakeToggle');
  const panel = document.getElementById('snakePanel');
  const closeBtn = document.getElementById('snakeClose');
  const canvas = document.getElementById('snakeCanvas');
  const scoreEl = document.getElementById('snakeScore');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const GRID = 16;
  const CELLS = canvas.width / GRID;

  let snake, dir, nextDir, food, score, loopId, running, paused;

  function resetGame() {
    snake = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    paused = false;
    placeFood();
    updateScore();
  }

  function placeFood() {
    let valid = false;
    while (!valid) {
      food = {
        x: Math.floor(Math.random() * CELLS),
        y: Math.floor(Math.random() * CELLS),
      };
      valid = !snake.some((s) => s.x === food.x && s.y === food.y);
    }
  }

  function updateScore() {
    scoreEl.textContent = `score: ${score}`;
  }

  function draw() {
    ctx.fillStyle = '#0A0C10';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // food
    ctx.fillStyle = '#FBBF24';
    ctx.beginPath();
    ctx.arc(
      food.x * GRID + GRID / 2,
      food.y * GRID + GRID / 2,
      GRID / 2.6,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // snake
    snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? '#5EEAD4' : '#2DD4BF';
      const pad = 2;
      ctx.fillRect(
        seg.x * GRID + pad,
        seg.y * GRID + pad,
        GRID - pad * 2,
        GRID - pad * 2
      );
    });

    if (paused) {
      ctx.fillStyle = 'rgba(10,12,16,0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ECEEF1';
      ctx.font = '600 14px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('paused', canvas.width / 2, canvas.height / 2);
    }
  }

  function step() {
    if (paused) return;
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // wrap around edges
    if (head.x < 0) head.x = CELLS - 1;
    if (head.x >= CELLS) head.x = 0;
    if (head.y < 0) head.y = CELLS - 1;
    if (head.y >= CELLS) head.y = 0;

    // self collision
    if (snake.some((s) => s.x === head.x && s.y === head.y)) {
      resetGame();
      draw();
      return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score += 1;
      updateScore();
      placeFood();
    } else {
      snake.pop();
    }

    draw();
  }

  function startLoop() {
    if (loopId) clearInterval(loopId);
    loopId = setInterval(step, 110);
  }

  function openPanel() {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    if (!running) {
      resetGame();
      draw();
      startLoop();
      running = true;
    }
  }

  function closePanel() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  }

  toggle.addEventListener('click', () => {
    panel.classList.contains('open') ? closePanel() : openPanel();
  });
  closeBtn.addEventListener('click', closePanel);

  document.addEventListener('keydown', (e) => {
    if (!panel.classList.contains('open')) {
      // allow opening with '/' shortcut from anywhere except inputs
      return;
    }
    const k = e.key;
    if (k === 'ArrowUp' && dir.y === 0) nextDir = { x: 0, y: -1 };
    else if (k === 'ArrowDown' && dir.y === 0) nextDir = { x: 0, y: 1 };
    else if (k === 'ArrowLeft' && dir.x === 0) nextDir = { x: -1, y: 0 };
    else if (k === 'ArrowRight' && dir.x === 0) nextDir = { x: 1, y: 0 };
    else if (k === ' ') { paused = !paused; draw(); e.preventDefault(); }
    else return;
    e.preventDefault();
  });
})();

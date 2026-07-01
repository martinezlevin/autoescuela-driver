// ── CONFIGURACIÓN ──
const CATS = [
  { key: null, label: "Examen oficial", filter: () => true }
];

const LETRAS = "ABCDE";
let selectedCat = 0;       // por defecto "Examen oficial"
let selectedQty = 40;      // fijo en 40 preguntas
let orderRandom = true;    // siempre aleatorio
let pool = [];
let current = 0;
let correctas = 0;
let resultados = [];
let answered = false;
let PREGUNTAS = []; // se llenará desde el JSON

// ── CARGAR JSON ──
async function loadQuestions() {
  try {
    const res = await fetch("assets/datos/question.json");
    PREGUNTAS = await res.json();
    buildCats();
  } catch (err) {
    console.error("Error cargando question.json:", err);
  }
}

// ── BUILD MENU ──
function buildCats() {
  const grid = document.getElementById("cat-grid");
  grid.innerHTML = "";

  // Solo una opción: Examen oficial
  const btn = document.createElement("button");
  btn.className = "cat-btn selected";
  btn.innerHTML = `
    <div class="cb-label">Examen oficial</div>
    <div class="cb-count">40 preguntas</div>
  `;
  btn.onclick = () => selectCat(0, btn);
  grid.appendChild(btn);

  // Siempre 40 preguntas aleatorias
  selectedQty = 40;
  orderRandom = true;
}

function selectCat(i, el) {
  selectedCat = i;
  document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("selected"));
  el.classList.add("selected");
}

// ── FUNCIONES ──
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function renderQuestion() {
  const p = pool[current];
  answered = false;

  // mostrar imagen si existe
  const imgBox = document.getElementById('q-image-box');
  if (p.image) {
    imgBox.innerHTML = `<img src="${p.image}" alt="Imagen pregunta">`;
    imgBox.style.display = 'flex';
  } else {
    imgBox.innerHTML = '';
    imgBox.style.display = 'none';
  }

  // meta info
  document.getElementById("q-counter").textContent = `Pregunta: ${current + 1} / ${pool.length}`;
  document.getElementById("q-score").textContent = `⭐ ${correctas}`;
  document.getElementById("progress-fill").style.width = `${(current / pool.length) * 100}%`;
  document.getElementById("q-id-badge").textContent = `Pregunta #${p.id}`;
  document.getElementById("q-text").textContent = p.q;

  // opciones
  const list = document.getElementById("opts-list");
  list.innerHTML = "";
  p.opts.forEach((opt, i) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.className = "opt-btn";
    btn.innerHTML = `<span class="opt-letter">${LETRAS[i]}</span><span>${opt}</span>`;
    btn.onclick = () => answer(i, btn, p);
    li.appendChild(btn);
    list.appendChild(li);
  });

  // feedback
  const fb = document.getElementById("feedback-box");
  fb.className = "feedback-box";
  fb.innerHTML = "";

  // botones navegación
  const nb = document.getElementById("next-btn");
  nb.className = "next-btn show";
  nb.textContent = current === pool.length - 1
      ? "Ver resultados →"
      : "Siguiente →";

  nb.disabled = true;

  const pb = document.getElementById("prev-btn");
  if (pb) pb.style.display = current > 0 ? "inline-block" : "none";

  const sb = document.getElementById("skip-btn");
  if (sb) sb.style.display = "inline-block";

  // animación
  const card = document.getElementById("q-card");
  card.style.animation = "none";
  card.offsetHeight;
  card.style.animation = "";

  renderExamGrid();
}

function renderExamGrid() {

    const grid = document.getElementById("exam-grid");
    grid.innerHTML = "";

    for (let i = 0; i < pool.length; i++) {

        const btn = document.createElement("button");
        btn.textContent = i + 1;

        btn.classList.add("pending");

        const r = resultados[i];

        if (r) {

            if (r.estado === "correcta")
                btn.classList.replace("pending", "correct");

            if (r.estado === "incorrecta")
                btn.classList.replace("pending", "wrong");

            if (r.estado === "saltada")
                btn.classList.replace("pending", "skipped");

        }

        if (i === current) {

            btn.className = "";
            btn.classList.add("actual");

        }

        btn.onclick = () => {

            current = i;
            renderQuestion();

        };

        grid.appendChild(btn);

    }

}


function prevQuestion() {
  if (current > 0) {
    current--;
    renderQuestion();

    const r = resultados[current];

    if (r && r.estado !== "saltada") {
      answered = true;

      document.querySelectorAll(".opt-btn").forEach((b, i) => {
        b.disabled = true;

        if (i === pool[current].correct)
          b.classList.add("correct");

        if (r.estado === "incorrecta" && i === r.respuesta)
          b.classList.add("wrong");
      });

      const nb = document.getElementById("next-btn");
      nb.disabled = false;
    }
  }
}

function skipQuestion() {
  resultados[current] = {
    id: pool[current].id,
    estado: "saltada",
    respuesta: null
  };

  current++;

  if (current >= pool.length) {
    showResults();
  } else {
    renderQuestion();
  }
}

function nextQuestion() {
  current++;
  if (current >= pool.length) {
    showResults();
  } else {
    renderQuestion();
  }
}

function showResults() {
  showScreen("screen-results");
  const total = pool.length;
  const pct = Math.round((correctas / total) * 100);

  document.getElementById("result-pct").textContent = pct + "%";
  document.getElementById("result-label").textContent = `${correctas} correctas de ${total}`;
  document.getElementById("stat-correct").textContent = correctas;
  document.getElementById("stat-wrong").textContent = total - correctas;

  let emoji, verdict;
  if (pct >= 90) { emoji = "🏆"; verdict = "¡Excelente! Estás muy bien preparado."; }
  else if (pct >= 75) { emoji = "👍"; verdict = "Muy bien, pero repasá las que fallaste."; }
  else if (pct >= 60) { emoji = "📚"; verdict = "Bien encaminado, seguí estudiando."; }
  else { emoji = "⚠️"; verdict = "Necesitás repasar más. ¡Ánimo!"; }
  document.getElementById("result-emoji").textContent = emoji;
  document.getElementById("result-verdict").textContent = verdict;

  const failed = resultados.filter(r => !r.ok);
  const fs = document.getElementById("failed-section");
  fs.innerHTML = "";
  if (failed.length > 0) {
    const h = document.createElement("h3");
    h.textContent = `${failed.length} pregunta${failed.length > 1 ? "s" : ""} incorrecta${failed.length > 1 ? "s" : ""}`;
    fs.appendChild(h);
    failed.forEach(r => {
      const p = pool.find(x => x.id === r.id);
      const div = document.createElement("div");
      div.className = "failed-item";
      div.innerHTML = `
        <div class="fi-q">[#${p.id}] ${p.q}</div>
        <div class="fi-ans">
          <span class="fi-check">✓</span>
          <span>${LETRAS[p.correct]}) ${p.opts[p.correct]}</span>
        </div>
      `;
      fs.appendChild(div);
    });
  }

  document.getElementById("progress-fill").style.width = "100%";
}

function goMenu() {
  showScreen("screen-menu");
}

document.addEventListener("DOMContentLoaded", loadQuestions);

/* TIMER + RACHA */

// variables globales
let tiempoRestante = 20 * 60; // 20 minutos en segundos
let timerInterval;
let racha = 0; // contador de respuestas consecutivas correctas

function startQuiz() {
  let p = PREGUNTAS.filter(CATS[selectedCat].filter);
  p = shuffle(p);
  pool = p.slice(0, 40);

  current = 0;
  correctas = 0;
  resultados = [];
  racha = 0;

  showScreen("screen-quiz");
  renderQuestion();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  // iniciar timer
  tiempoRestante = 20 * 60;
  clearInterval(timerInterval);
  timerInterval = setInterval(actualizarTimer, 1000);
}

function actualizarTimer() {
  const min = Math.floor(tiempoRestante / 60);
  const seg = tiempoRestante % 60;
  document.getElementById("q-timer").textContent =
    `${min}:${seg.toString().padStart(2, "0")}`;
  tiempoRestante--;

  if (tiempoRestante < 0) {
    clearInterval(timerInterval);
    // mostrar resultados y mensaje de tiempo agotado
    showResults();
    const verdictEl = document.getElementById("result-verdict");
    if (verdictEl) {
      verdictEl.textContent = "⏱ Tiempo agotado. Estos son tus resultados hasta ahora.";
    }
  }
}

// sobrescribir la función answer para incluir racha
function answer(idx, btn, p) {
  if (answered) return;
  answered = true;

  const ok = idx === p.correct;

  if (ok) {
    correctas++;
    racha++;

    lanzarConfeti();
} else {
    racha = 0;
  }

  resultados[current] = {
    id: p.id,
    estado: ok ? "correcta" : "incorrecta",
    respuesta: idx
  };

  document.getElementById("q-score").textContent = `⭐ ${correctas}`;
  document.getElementById("q-streak").textContent = `🔥 ${racha}`;

  document.querySelectorAll(".opt-btn").forEach((b, i) => {
    b.disabled = true;
    if (i === p.correct) b.classList.add("correct");
    if (i === idx && !ok) b.classList.add("wrong");
  });

  const fb = document.getElementById("feedback-box");

  if (ok) {
    fb.className = "feedback-box ok show";
    fb.innerHTML = "✓ ¡Correcto!";
  } else {
    fb.className = "feedback-box fail show";
    fb.innerHTML = `✗ Incorrecto<div class="correct-ans">✓ Correcta: ${LETRAS[p.correct]}) ${p.opts[p.correct]}</div>`;
  }

  if (p.explicacion) {
    const expDiv = document.createElement("div");
    expDiv.className = "explicacion";
    expDiv.textContent = "Explicación: " + p.explicacion;
    fb.appendChild(expDiv);
  }

  const nb = document.getElementById("next-btn");
  nb.className = "next-btn show";
  nb.textContent = current === pool.length - 1
      ? "Ver resultados →"
      : "Siguiente →";

  nb.disabled = false;
}

function lanzarConfeti() {

    const duration = 900;
    const end = Date.now() + duration;

    (function frame() {

        confetti({
            particleCount:4,
            angle:60,
            spread:60,
            origin:{x:0}
        });

        confetti({
            particleCount:4,
            angle:120,
            spread:60,
            origin:{x:1}
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }

    })();

}
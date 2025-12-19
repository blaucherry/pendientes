// ---------- Firebase ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Config de tu proyecto
const firebaseConfig = {
  apiKey: "AIzaSyCddnh4gdFiU0E-FN9erPd0BT-jWAN6iM",
  authDomain: "pendientes-cozy.firebaseapp.com",
  projectId: "pendientes-cozy",
  storageBucket: "pendientes-cozy.firebasestorage.app",
  messagingSenderId: "677687685606",
  appId: "1:677687685606:web:788d0104efcc7fff9b6627"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------- Modelo To-Do ----------

const COLUMNS = ["vianey", "alexis", "juntos"];

const tasksByColumn = {
  vianey: [],
  alexis: [],
  juntos: []
};

function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short"
  });
}

function renderColumn(column) {
  const container = document.querySelector(`.tasks[data-column="${column}"]`);
  if (!container) return;

  const listEl = container.querySelector(".task-list");
  listEl.innerHTML = "";

  tasksByColumn[column].forEach((task) => {
    const li = document.createElement("li");
    li.className = "task-item";
    if (task.done) li.classList.add("done");

    const main = document.createElement("div");
    main.className = "task-main";

    const textSpan = document.createElement("span");
    textSpan.className = "task-text";
    textSpan.textContent = task.text;
    main.appendChild(textSpan);

    if (task.dueDate) {
      const meta = document.createElement("div");
      meta.className = "task-meta";
      meta.textContent = `Fecha límite: ${formatDateLabel(task.dueDate)}`;
      main.appendChild(meta);
    }

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "task-delete";
    delBtn.textContent = "×";

    li.appendChild(main);
    li.appendChild(delBtn);

    li.addEventListener("click", async () => {
      try {
        await updateDoc(doc(db, "tasks", task.id), { done: !task.done });
      } catch (err) {
        console.error("Error al actualizar tarea", err);
      }
    });

    delBtn.addEventListener("click", async (evt) => {
      evt.stopPropagation();
      try {
        await deleteDoc(doc(db, "tasks", task.id));
      } catch (err) {
        console.error("Error al borrar tarea", err);
      }
    });

    listEl.appendChild(li);
  });
}

function renderAllColumns() {
  COLUMNS.forEach(renderColumn);
}

async function addTask(column, text, dueDate) {
  const tasksRef = collection(db, "tasks");
  try {
    await addDoc(tasksRef, {
      column,
      text,
      done: false,
      dueDate: dueDate || null,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error("Error al agregar tarea", err);
  }
}

function setupRealtimeTasks() {
  const tasksRef = collection(db, "tasks");
  const q = query(tasksRef, orderBy("createdAt", "asc"));

  onSnapshot(q, (snapshot) => {
    tasksByColumn.vianey = [];
    tasksByColumn.alexis = [];
    tasksByColumn.juntos = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const column = data.column;
      if (!COLUMNS.includes(column)) return;

      const task = {
        id: docSnap.id,
        column,
        text: data.text || "",
        done: !!data.done,
        dueDate: data.dueDate || null
      };

      tasksByColumn[column].push(task);
    });

    renderAllColumns();
  });
}

function setupTaskInputs() {
  COLUMNS.forEach((column) => {
    const input = document.querySelector(`.task-input[data-column="${column}"]`);
    const dateInput = document.querySelector(`.task-date[data-column="${column}"]`);
    const addBtn = document.querySelector(`.task-add[data-column="${column}"]`);

    if (!input || !addBtn) return;

    const handleAdd = async () => {
      const text = input.value.trim();
      if (!text) return;

      const dueDate = dateInput ? dateInput.value || null : null;
      await addTask(column, text, dueDate);
      input.value = "";
      // dejamos la fecha para poder agregar varias con la misma
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdd();
      }
    });

    addBtn.addEventListener("click", handleAdd);
  });
}

// ---------- Sidebar / navegación de pantallas ----------

function setupNav() {
  const navItems = document.querySelectorAll(".nav-item");
  const screens = document.querySelectorAll(".screen");

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const target = item.dataset.screen;

      navItems.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");

      screens.forEach((screen) => {
        const isTarget = screen.classList.contains(`screen-${target}`);
        screen.classList.toggle("active", isTarget);
      });
    });
  });
}

// ---------- Planning diario (localStorage) ----------

function setupDayPlanner() {
  const container = document.getElementById("day-planner");
  if (!container) return;

  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem("cozyDayPlan") || "{}");
    } catch (e) {
      return {};
    }
  })();

  const savePlan = (hour, text) => {
    const current = (() => {
      try {
        return JSON.parse(localStorage.getItem("cozyDayPlan") || "{}");
      } catch (e) {
        return {};
      }
    })();
    current[hour] = text;
    localStorage.setItem("cozyDayPlan", JSON.stringify(current));
  };

  const startHour = 6;
  const endHour = 22;

  for (let h = startHour; h <= endHour; h++) {
    const hourLabel = `${String(h).padStart(2, "0")}:00`;

    const row = document.createElement("div");
    row.className = "day-planner-row";

    const label = document.createElement("div");
    label.className = "day-planner-hour";
    label.textContent = hourLabel;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "day-planner-input";
    input.dataset.hour = hourLabel;
    input.placeholder = "Añade algo suave aquí ✨";
    if (saved[hourLabel]) input.value = saved[hourLabel];

    input.addEventListener("change", () => {
      savePlan(hourLabel, input.value);
    });

    row.appendChild(label);
    row.appendChild(input);
    container.appendChild(row);
  }
}

// ---------- Pomodoro ----------

let pomoWork = 25 * 60;
let pomoBreak = 5 * 60;
let pomoRemaining = pomoWork;
let pomoMode = "focus"; // "focus" | "break"
let pomoRunning = false;
let pomoInterval = null;

let pomoTimeEl;
let pomoModeLabelEl;
let pomoStartBtn;
let pomoResetBtn;

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function updatePomodoroDisplay() {
  if (!pomoTimeEl || !pomoModeLabelEl) return;
  pomoTimeEl.textContent = formatTime(pomoRemaining);
  pomoModeLabelEl.textContent = pomoMode === "focus" ? "Enfoque" : "Descanso";
}

function switchPomodoroMode() {
  if (pomoMode === "focus") {
    pomoMode = "break";
    pomoRemaining = pomoBreak;
  } else {
    pomoMode = "focus";
    pomoRemaining = pomoWork;
  }
  updatePomodoroDisplay();
}

function startPomodoro() {
  if (pomoRunning) return;
  pomoRunning = true;
  if (pomoStartBtn) pomoStartBtn.textContent = "Pausa";

  pomoInterval = setInterval(() => {
    if (pomoRemaining > 0) {
      pomoRemaining -= 1;
      updatePomodoroDisplay();
    } else {
      switchPomodoroMode();
    }
  }, 1000);
}

function pausePomodoro() {
  pomoRunning = false;
  if (pomoStartBtn) pomoStartBtn.textContent = "Reanudar";
  if (pomoInterval) {
    clearInterval(pomoInterval);
    pomoInterval = null;
  }
}

function resetPomodoro() {
  pomoRunning = false;
  if (pomoInterval) {
    clearInterval(pomoInterval);
    pomoInterval = null;
  }
  pomoMode = "focus";
  pomoRemaining = pomoWork;
  if (pomoStartBtn) pomoStartBtn.textContent = "Iniciar";
  updatePomodoroDisplay();
}

function setupPomodoro() {
  pomoTimeEl = document.getElementById("pomodoro-time");
  pomoModeLabelEl = document.getElementById("pomodoro-mode-label");
  pomoStartBtn = document.getElementById("pomodoro-start-pause");
  pomoResetBtn = document.getElementById("pomodoro-reset");

  if (!pomoTimeEl || !pomoModeLabelEl || !pomoStartBtn || !pomoResetBtn) return;

  updatePomodoroDisplay();

  pomoStartBtn.addEventListener("click", () => {
    if (pomoRunning) {
      pausePomodoro();
    } else {
      startPomodoro();
    }
  });

  pomoResetBtn.addEventListener("click", () => {
    resetPomodoro();
  });

  const pills = document.querySelectorAll(".pomodoro-pill");
  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const preset = pill.dataset.preset || "25-5";
      const [w, b] = preset.split("-").map(Number);
      pomoWork = w * 60;
      pomoBreak = b * 60;
      resetPomodoro();

      pills.forEach((p) => p.classList.remove("pomodoro-pill-active"));
      pill.classList.add("pomodoro-pill-active");
    });
  });
}

// ---------- Init ----------

window.addEventListener("DOMContentLoaded", () => {
  setupNav();
  setupRealtimeTasks();
  setupTaskInputs();
  setupDayPlanner();
  setupPomodoro();
});

// =============== CALENDARIO COZY ===============

const monthLabel = document.getElementById("calendar-month-label");
const daysContainer = document.getElementById("calendar-days");
const dayDetail = document.getElementById("calendar-day-detail");

if (monthLabel && daysContainer && dayDetail) {
  const prevBtn = document.querySelector("[data-cal-prev]");
  const nextBtn = document.querySelector("[data-cal-next]");
  const todayBtn = document.querySelector("[data-cal-today]");

  // mapa: "YYYY-MM-DD" -> [eventos...]
  const eventsByDate = {};
  let currentMonth = new Date();
  currentMonth.setDate(1);

  const formatKey = (date) => date.toISOString().slice(0, 10);

  const prettyDate = (date) =>
    date.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

  function renderMonth() {
    const monthName = currentMonth.toLocaleDateString("es-MX", {
      month: "long",
      year: "numeric",
    });
    monthLabel.textContent =
      monthName.charAt(0).toUpperCase() + monthName.slice(1);

    daysContainer.innerHTML = "";

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    // Lunes = 0
    const startWeekIdx = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayKey = formatKey(new Date());

    // huecos antes del día 1
    for (let i = 0; i < startWeekIdx; i++) {
      const blank = document.createElement("button");
      blank.className = "calendar-day calendar-day--empty";
      blank.disabled = true;
      daysContainer.appendChild(blank);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const key = formatKey(date);
      const dayBtn = document.createElement("button");
      dayBtn.className = "calendar-day";

      if (key === todayKey) {
        dayBtn.classList.add("calendar-day--today");
      }

      const numberSpan = document.createElement("span");
      numberSpan.className = "calendar-day-number";
      numberSpan.textContent = d;
      dayBtn.appendChild(numberSpan);

      const dots = document.createElement("div");
      dots.className = "calendar-dots";

      const dayEvents = eventsByDate[key] || [];
      const hasV = dayEvents.some((e) => e.who === "vianey");
      const hasA = dayEvents.some((e) => e.who === "alexis");
      const hasJ = dayEvents.some((e) => e.who === "juntos");

      function addDot(cls) {
        const dot = document.createElement("span");
        dot.className = `calendar-dot ${cls}`;
        dots.appendChild(dot);
      }

      if (hasV) addDot("calendar-dot--vianey");
      if (hasA) addDot("calendar-dot--alexis");
      if (hasJ) addDot("calendar-dot--juntos");

      if (dayEvents.length) {
        dayBtn.classList.add("calendar-day--has-events");
      }

      dayBtn.appendChild(dots);

      dayBtn.addEventListener("click", () => {
        document
          .querySelectorAll(".calendar-day--selected")
          .forEach((el) => el.classList.remove("calendar-day--selected"));
        dayBtn.classList.add("calendar-day--selected");
        renderDayDetail(date);
      });

      daysContainer.appendChild(dayBtn);
    }
  }

  function renderDayDetail(date) {
    const key = formatKey(date);
    const events = (eventsByDate[key] || []).slice();

    dayDetail.innerHTML = "";

    const title = document.createElement("h3");
    title.className = "calendar-detail-title";
    title.textContent = prettyDate(date);
    dayDetail.appendChild(title);

    if (!events.length) {
      const empty = document.createElement("p");
      empty.className = "calendar-empty";
      empty.textContent = "Sin eventos todavía. Añade uno abajo ✨";
      dayDetail.appendChild(empty);
    } else {
      const list = document.createElement("ul");
      list.className = "calendar-event-list";

      events.sort((a, b) => (a.time || "").localeCompare(b.time || ""));

      events.forEach((ev) => {
        const li = document.createElement("li");
        li.className = "calendar-event";

        const chip = document.createElement("span");
        chip.className =
          "calendar-event-chip " +
          (ev.who === "vianey"
            ? "chip-vianey"
            : ev.who === "alexis"
            ? "chip-alexis"
            : ev.who === "juntos"
            ? "chip-juntos"
            : "chip-neutral");
        chip.textContent =
          ev.who === "vianey"
            ? "Vianey"
            : ev.who === "alexis"
            ? "Alexis"
            : ev.who === "juntos"
            ? "Juntos"
            : "Otro";

        const text = document.createElement("span");
        text.className = "calendar-event-text";
        text.textContent = (ev.time ? `${ev.time} · ` : "") + ev.title;

        const del = document.createElement("button");
        del.type = "button";
        del.className = "calendar-event-delete";
        del.textContent = "×";
        del.addEventListener("click", async () => {
          try {
            await deleteDoc(doc(db, "events", ev.id));
          } catch (err) {
            console.error("Error al borrar evento", err);
          }
        });

        li.append(chip, text, del);
        list.appendChild(li);
      });

      dayDetail.appendChild(list);
    }

    // formulario para agregar evento
    const form = document.createElement("form");
    form.className = "calendar-form";
    form.innerHTML = `
      <div class="calendar-form-row">
        <input type="time" name="time" class="calendar-input calendar-input--time">
        <input type="text" name="title" class="calendar-input" placeholder="Escribe la reunión o plan..." required>
        <select name="who" class="calendar-input calendar-input--who">
          <option value="vianey">Vianey</option>
          <option value="alexis">Alexis</option>
          <option value="juntos">Juntos</option>
        </select>
        <button type="submit" class="calendar-add-btn">Agregar</button>
      </div>
    `;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const title = (data.get("title") || "").trim();
      if (!title) return;

      const who = data.get("who") || "juntos";
      const time = data.get("time") || "";

      try {
        await addDoc(collection(db, "events"), {
          date: key,
          title,
          who,
          time,
          createdAt: serverTimestamp(),
        });
        form.reset();
      } catch (err) {
        console.error("Error al agregar evento", err);
      }
    });

    dayDetail.appendChild(form);
  }

  // realtime de eventos
  (function setupEventsRealtime() {
    const ref = collection(db, "events");
    const q = query(ref, orderBy("date"), orderBy("time"));

    onSnapshot(q, (snap) => {
      Object.keys(eventsByDate).forEach((k) => delete eventsByDate[k]);
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data.date) return;
        const key = data.date;
        if (!eventsByDate[key]) eventsByDate[key] = [];
        eventsByDate[key].push({
          id: docSnap.id,
          title: data.title || "",
          who: data.who || "juntos",
          time: data.time || "",
        });
      });

      renderMonth();
    });
  })();

  // navegación de meses
  prevBtn?.addEventListener("click", () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderMonth();
  });

  nextBtn?.addEventListener("click", () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderMonth();
  });

  todayBtn?.addEventListener("click", () => {
    currentMonth = new Date();
    currentMonth.setDate(1);
    renderMonth();
    renderDayDetail(new Date());
  });

  // inicio
  renderMonth();
  renderDayDetail(new Date());
}

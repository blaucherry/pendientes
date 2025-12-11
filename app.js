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

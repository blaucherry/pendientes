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

// ⚠️ Usa la misma config que ya tenías en tu proyecto
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

// ---------- Modelo en memoria ----------

const COLUMNS = ["vianey", "alexis", "juntos"];

const tasksByColumn = {
  vianey: [],
  alexis: [],
  juntos: []
};

let allTasks = []; // para el calendario

// calendario
const today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth();

let daysContainer;
let monthLabel;
let detailContainer;

// ---------- Helpers ----------

function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short"
  });
}

function getTasksForDay(dateStr) {
  return allTasks.filter((t) => t.dueDate === dateStr);
}

// ---------- Render columnas ----------

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

    // toggle done
    li.addEventListener("click", async () => {
      try {
        await updateDoc(doc(db, "tasks", task.id), { done: !task.done });
      } catch (err) {
        console.error("Error al actualizar tarea", err);
      }
    });

    // borrar sin toggle
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

// ---------- Calendario ----------

function renderDayDetail(dateStr, tasks) {
  if (!detailContainer) return;
  detailContainer.innerHTML = "";

  if (!dateStr) {
    const p = document.createElement("p");
    p.className = "calendar-empty";
    p.textContent = "No hay pendientes con fecha en este mes.";
    detailContainer.appendChild(p);
    return;
  }

  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);

  const title = document.createElement("h3");
  title.className = "calendar-detail-title";
  title.textContent = date.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  });

  detailContainer.appendChild(title);

  if (!tasks.length) {
    const p = document.createElement("p");
    p.className = "calendar-empty";
    p.textContent = "No hay pendientes con fecha este día.";
    detailContainer.appendChild(p);
    return;
  }

  const ul = document.createElement("ul");
  ul.className = "calendar-task-list";

  tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = "calendar-task";
    if (task.done) li.classList.add("calendar-task--done");

    const chip = document.createElement("span");
    chip.className = "calendar-task-chip";
    if (task.column === "vianey") chip.classList.add("chip-vianey");
    else if (task.column === "alexis") chip.classList.add("chip-alexis");
    else if (task.column === "juntos") chip.classList.add("chip-juntos");
    else chip.classList.add("chip-neutral");

    chip.textContent =
      task.column === "vianey"
        ? "Vianey"
        : task.column === "alexis"
        ? "Alexis"
        : task.column === "juntos"
        ? "Juntos"
        : "Otro";

    const textSpan = document.createElement("span");
    textSpan.className = "calendar-task-text";
    textSpan.textContent = task.text;

    li.appendChild(chip);
    li.appendChild(textSpan);

    ul.appendChild(li);
  });

  detailContainer.appendChild(ul);
}

function renderCalendar() {
  if (!daysContainer || !monthLabel) return;

  daysContainer.innerHTML = "";

  const firstDay = new Date(currentYear, currentMonth, 1);
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const monthName = firstDay.toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric"
  });
  monthLabel.textContent = monthName;

  // Lunes = 0
  const startWeekday = (firstDay.getDay() + 6) % 7;

  for (let i = 0; i < startWeekday; i++) {
    const empty = document.createElement("div");
    empty.className = "calendar-day calendar-day--empty";
    daysContainer.appendChild(empty);
  }

  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
  ].join("-");

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = [
      currentYear,
      String(currentMonth + 1).padStart(2, "0"),
      String(day).padStart(2, "0")
    ].join("-");

    const dayTasks = getTasksForDay(dateStr);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "calendar-day";
    if (dayTasks.length) btn.classList.add("calendar-day--has-tasks");
    if (dateStr === todayStr) btn.classList.add("calendar-day--today");

    const numSpan = document.createElement("span");
    numSpan.className = "calendar-day-number";
    numSpan.textContent = day;
    btn.appendChild(numSpan);

    if (dayTasks.length) {
      const dots = document.createElement("div");
      dots.className = "calendar-dots";

      const columnsSeen = new Set(dayTasks.map((t) => t.column));
      if (columnsSeen.has("vianey")) {
        const dot = document.createElement("span");
        dot.className = "calendar-dot calendar-dot--vianey";
        dots.appendChild(dot);
      }
      if (columnsSeen.has("alexis")) {
        const dot = document.createElement("span");
        dot.className = "calendar-dot calendar-dot--alexis";
        dots.appendChild(dot);
      }
      if (columnsSeen.has("juntos")) {
        const dot = document.createElement("span");
        dot.className = "calendar-dot calendar-dot--juntos";
        dots.appendChild(dot);
      }
      btn.appendChild(dots);
    }

    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".calendar-day--selected")
        .forEach((el) => el.classList.remove("calendar-day--selected"));
      btn.classList.add("calendar-day--selected");
      renderDayDetail(dateStr, dayTasks);
    });

    daysContainer.appendChild(btn);
  }

  // detalle por defecto: hoy (si está en el mes) o vacío
  const inSameMonth =
    currentYear === today.getFullYear() && currentMonth === today.getMonth();
  const defaultDate = inSameMonth ? todayStr : null;
  const defaultTasks = defaultDate ? getTasksForDay(defaultDate) : [];
  renderDayDetail(defaultDate, defaultTasks);
}

// ---------- Firestore ----------

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

function setupRealtime() {
  const tasksRef = collection(db, "tasks");
  const q = query(tasksRef, orderBy("createdAt", "asc"));

  onSnapshot(q, (snapshot) => {
    tasksByColumn.vianey = [];
    tasksByColumn.alexis = [];
    tasksByColumn.juntos = [];
    allTasks = [];

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
      if (task.dueDate) {
        allTasks.push(task);
      }
    });

    renderAllColumns();
    renderCalendar();
  });
}

// ---------- Inputs + navegación calendario ----------

function setupInputsAndCalendarNav() {
  COLUMNS.forEach((column) => {
    const input = document.querySelector(`.task-input[data-column="${column}"]`);
    const dateInput = document.querySelector(
      `.task-date[data-column="${column}"]`
    );
    const addBtn = document.querySelector(`.task-add[data-column="${column}"]`);

    if (!input || !addBtn) return;

    const handleAdd = async () => {
      const text = input.value.trim();
      if (!text) return;
      const dueDate = dateInput ? dateInput.value || null : null;
      await addTask(column, text, dueDate);
      input.value = "";
      // dejamos la fecha para poder agregar varios con la misma
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdd();
      }
    });

    addBtn.addEventListener("click", handleAdd);
  });

  const prevBtn = document.querySelector("[data-cal-prev]");
  const nextBtn = document.querySelector("[data-cal-next]");

  if (prevBtn && nextBtn) {
    prevBtn.addEventListener("click", () => {
      currentMonth -= 1;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear -= 1;
      }
      renderCalendar();
    });

    nextBtn.addEventListener("click", () => {
      currentMonth += 1;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear += 1;
      }
      renderCalendar();
    });
  }
}

// ---------- Init ----------

window.addEventListener("DOMContentLoaded", () => {
  daysContainer = document.getElementById("calendar-days");
  monthLabel = document.getElementById("calendar-month-label");
  detailContainer = document.getElementById("calendar-day-detail");

  setupInputsAndCalendarNav();
  setupRealtime();
  renderCalendar();
});

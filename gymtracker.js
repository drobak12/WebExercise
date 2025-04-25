
// ---------- DOM references ----------
const restTimeInput        = document.getElementById("rest-time");
const restMessage          = document.getElementById("rest-message");
const workoutScreen        = document.getElementById("workout-screen");
const setupScreen          = document.getElementById("setup-screen");
const infoSummaryEl        = document.getElementById("info-summary");
const currentMachineSpan   = document.getElementById("current-machine");
const seriesOrdinalSpan    = document.getElementById("series-current");
const seriesTimeLabel      = document.getElementById("live-machine-time");
const summaryTable         = document.getElementById("summary-table");
const actionButtons        = document.querySelector(".action-buttons");
const seriesTotalDisplay   = document.getElementById("series-total-display");
const undoButton           = document.getElementById("undo-button");

// ---------- Restore localStorage values on load ----------
window.addEventListener("DOMContentLoaded", () => {
  const storedRest = localStorage.getItem("restTime");
  if (storedRest) restTimeInput.value = storedRest;

  const sound    = localStorage.getItem("workoutSound");
  const vibrate  = localStorage.getItem("workoutVibrate");
  document.getElementById("enable-sound").checked   = sound   !== "0";
  document.getElementById("enable-vibrate").checked = vibrate !== "0";
});

// ---------- State ----------
let machines         = [];  // [{name:"Machine 1", sets:[secs,...]}, ...]
let currentMachineIdx = 0;  // index inside machines[]
let seriesStartTime;
let seriesTimerID;
let restTimerID;
let restSeconds   = 90;

// ---------- Session control ----------
function startSession() {
  const soundEnabled   = document.getElementById("enable-sound").checked;
  const vibrateEnabled = document.getElementById("enable-vibrate").checked;
  localStorage.setItem("workoutSound",   soundEnabled   ? "1" : "0");
  localStorage.setItem("workoutVibrate", vibrateEnabled ? "1" : "0");
  localStorage.setItem("restTime", restTimeInput.value);

  restSeconds = parseInt(restTimeInput.value, 10) || 90;

  // inicializar historial
  machines = [{ name: "Machine 1", sets: [] }];
  currentMachineIdx = 0;

  // mostrar pantalla
  setupScreen.classList.add("hidden");
  workoutScreen.classList.remove("hidden");

  // construir tabla
  summaryTable.innerHTML = "";
  addMachineRow();
  refreshHeader();
  startSeriesTimer();
  undoButton.disabled = true;
}

function endSession() {
  confirmCurrentSet();       // registra set activo
  stopSeriesTimer();
  clearInterval(restTimerID);
  hideActionButtons();
  buildSummaryScreen();
}

function buildSummaryScreen() {
  const totalSets = machines.reduce((tot,m)=>tot+m.sets.length, 0);
  let html = "<h2>Workout Complete!</h2>";
  html += `<p><strong>Total Machines:</strong> ${machines.length}</p>`;
  html += `<p><strong>Total Sets:</strong> ${totalSets}</p>`;
  html += "<h3>Details</h3><table style='margin:0 auto;max-width:400px;'><thead><tr><th>Machine</th><th>Sets</th></tr></thead><tbody>";
  machines.forEach(m=>{
    html += `<tr><td>${m.name}</td><td>${m.sets.length}</td></tr>`;
  });
  html += "</tbody></table><br><button onclick='goHome()'>Start New Session</button>";

  const div = document.createElement("div");
  div.innerHTML = html;
  workoutScreen.classList.add("hidden");
  document.body.insertBefore(div, document.querySelector("footer"));
}

function goHome(){ location.reload(); }

// ---------- Series & Machine ----------
function confirmCurrentSet(){
  // almacena set activo solo si aún no fue guardado durante un descanso
  const elapsed = Math.floor((Date.now() - seriesStartTime)/1000);
  machines[currentMachineIdx].sets.push(elapsed);
  updateRow(machines[currentMachineIdx].sets.length);
  undoButton.disabled = machines.length===1 && machines[0].sets.length===0;
}

function addSeries(){
  stopSeriesTimer();
  confirmCurrentSet();
  refreshHeader();
  startRest();
}

function nextMachine(){
  stopSeriesTimer();
  confirmCurrentSet();

  // crear nueva máquina
  const machineName = `Machine ${machines.length+1}`;
  machines.push({ name: machineName, sets: [] });
  currentMachineIdx++;

  addMachineRow();
  refreshHeader();
  startRest();
}

// ---------- Undo ----------
function undoLast(){
  if (machines.length === 0) return;

  stopSeriesTimer();

  // caso 1: máquina actual tiene sets para quitar
  if (machines[currentMachineIdx].sets.length > 0){
      machines[currentMachineIdx].sets.pop();
      updateRow(machines[currentMachineIdx].sets.length);
  }

  // si quedó sin sets y hay anterior, retrocedemos de máquina
  if (machines[currentMachineIdx].sets.length === 0 && currentMachineIdx > 0){
      machines.pop();                       // quitar máquina vacía
      summaryTable.lastChild.remove();      // quitar fila de tabla
      currentMachineIdx--;
  }

  refreshHeader();
  undoButton.disabled = machines.length===1 && machines[0].sets.length===0;
  startSeriesTimer();
}

// ---------- Rest logic ----------
function startRest(){
  clearInterval(restTimerID);
  hideActionButtons();
  infoSummaryEl.style.display = "none";
  seriesTimeLabel.style.display = "none";

  const restStart = Date.now();
  restMessage.classList.remove("hidden");
  writeRest(restSeconds);

  const btn = document.createElement("button");
  btn.textContent = "Continue";
  btn.onclick = finishRest;
  restMessage.after(btn);

  restTimerID = setInterval(()=>{
      const elapsed = Math.floor((Date.now()-restStart)/1000);
      const remaining = restSeconds - elapsed;
      writeRest(remaining);
      if (remaining<=0) finishRest();
  },1000);

  function finishRest(){
      clearInterval(restTimerID);
      playBeep();
      vibrate();
      restMessage.classList.add("hidden");
      btn.remove();
      infoSummaryEl.style.display = "block";
      seriesTimeLabel.style.display = "block";
      showActionButtons();
      startSeriesTimer();
  }
}

function writeRest(s){
  restMessage.innerHTML = "<span class='line1'>Please rest for</span><br><span class='line2'>"+s+"</span><br><span class='line3'>seconds</span>";
}

// ---------- Timers ----------
function startSeriesTimer(){
  seriesStartTime = Date.now();
  tickSeriesTimer();
  seriesTimerID = setInterval(tickSeriesTimer,1000);
}
function stopSeriesTimer(){ clearInterval(seriesTimerID); }
function tickSeriesTimer(){
  const s = Math.floor((Date.now()-seriesStartTime)/1000);
  seriesTimeLabel.textContent = "Set time: "+s+"s";
}

// ---------- UI helpers ----------
function refreshHeader(){
  currentMachineSpan.textContent = currentMachineIdx + 1;
  seriesOrdinalSpan.textContent  = machines[currentMachineIdx].sets.length + 1;
  const totalSets = machines.reduce((tot,m)=>tot+m.sets.length, 0);
  seriesTotalDisplay.textContent = "Total sets completed: "+ totalSets;
}

function addMachineRow(){
  const row = document.createElement("tr");
  row.innerHTML = "<td>"+machines[currentMachineIdx].name+"</td><td>0</td>";
  summaryTable.appendChild(row);
  // apunta a la fila actual
}

function updateRow(n){
  const row = summaryTable.children[currentMachineIdx];
  if (row) row.children[1].textContent = n;
}

function hideActionButtons(){ actionButtons.style.display = "none"; }
function showActionButtons(){ actionButtons.style.display = "flex"; }

// ---------- Beep / Vibrate ----------
function playBeep(){
  const soundEnabled = localStorage.getItem("workoutSound") !== "0";
  if (!soundEnabled) return;
  const ctx = new (window.AudioContext||window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1000, ctx.currentTime);
  osc.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime+0.2);
}
function vibrate(){
  const vibrateEnabled = localStorage.getItem("workoutVibrate") !== "0";
  if (vibrateEnabled && navigator.vibrate){
      navigator.vibrate(500);
  }
}

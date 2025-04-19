// ---------- DOM references ----------

// Restore localStorage values on load
window.addEventListener("DOMContentLoaded", () => {
  const storedRest = localStorage.getItem("restTime");
  if (storedRest) restTimeInput.value = storedRest;

  const sound = localStorage.getItem("workoutSound");
  const vibrate = localStorage.getItem("workoutVibrate");

  document.getElementById("enable-sound").checked = sound !== "0";
  document.getElementById("enable-vibrate").checked = vibrate !== "0";
});
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

// ---------- State ----------
let machineIdx   = 1;              // 1‑based machine counter
let seriesDoneTotal = 0;           // total series finished in entire workout
let seriesDoneOnMachine = 0;       // series finished on current machine
let seriesStartTime;
let seriesTimerID;
let restTimerID;
let restSeconds  = 90;
let sessionData  = [];             // {machine, series}
let currentRow;                    // <tr> for current machine in table

// ---------- Session control ----------
function startSession() {
  const soundEnabled = document.getElementById("enable-sound").checked;
  const vibrateEnabled = document.getElementById("enable-vibrate").checked;
  localStorage.setItem("workoutSound", soundEnabled ? "1" : "0");
  localStorage.setItem("workoutVibrate", vibrateEnabled ? "1" : "0");
  localStorage.setItem("restTime", restTimeInput.value);
  restSeconds = parseInt(restTimeInput.value, 10) || 90;
  setupScreen.classList.add("hidden");
  workoutScreen.classList.remove("hidden");
  addMachineRow();
  startSeriesTimer();
  refreshHeader();
}

function endSession() {
  stopSeriesTimer();
  ++seriesDoneOnMachine;  // count current series
  ++seriesDoneTotal;
  updateRow(seriesDoneOnMachine);
  sessionData.push({ machine: machineIdx, series: seriesDoneOnMachine });

  clearInterval(restTimerID);
  hideActionButtons();

  buildSummaryScreen();
}

function buildSummaryScreen() {
  const div = document.createElement("div");
  div.innerHTML = `
    <h2>Workout Complete!</h2>
    <p><strong>Total Machines:</strong> ${sessionData.length}</p>
    <p><strong>Total Series:</strong> ${seriesDoneTotal}</p>
    <h3>Details</h3>
    <table style="margin:0 auto;max-width:400px;">
      <thead><tr><th>Machine</th><th>Series</th></tr></thead>
      <tbody>${sessionData.map(m=>`<tr><td>Machine ${m.machine}</td><td>${m.series}</td></tr>`).join("")}</tbody>
    </table><br>
    <button onclick="goHome()">Start New Session</button>`;
  workoutScreen.classList.add("hidden");
  document.body.insertBefore(div, document.querySelector("footer"));
}

function goHome() { location.reload(); }

// ---------- Series & Machine ----------
function addSeries() {
  stopSeriesTimer();
  ++seriesDoneOnMachine;
  ++seriesDoneTotal;
  updateRow(seriesDoneOnMachine);
  refreshHeader();
  startRest();
}

function nextMachine() {
  stopSeriesTimer();
  ++seriesDoneOnMachine;
  ++seriesDoneTotal;
  updateRow(seriesDoneOnMachine);
  sessionData.push({ machine: machineIdx, series: seriesDoneOnMachine });

  machineIdx++;
  seriesDoneOnMachine = 0;
  addMachineRow();
  refreshHeader();

  startRest();
}

// ---------- Rest logic ----------
function startRest() {
  clearInterval(restTimerID);
  hideActionButtons();
  infoSummaryEl.style.display = "none";
  seriesTimeLabel.style.display = "none";

  let sec = restSeconds;
  restMessage.classList.remove("hidden");
  writeRest(sec);

  const btn = document.createElement("button");
  btn.textContent = "Continue";
  btn.onclick = finishRest;
  restMessage.after(btn);

  restTimerID = setInterval(()=>{
    writeRest(--sec);
    if(sec<=0) finishRest();
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
function writeRest(s){restMessage.innerHTML=`<span class='line1'>Please rest for</span><br><span class='line2'>${s}</span><br><span class='line3'>seconds</span>`;}

// ---------- Timers ----------
function startSeriesTimer(){
  seriesStartTime=Date.now();
  tickSeriesTimer();
  seriesTimerID=setInterval(tickSeriesTimer,1000);
}
function stopSeriesTimer(){clearInterval(seriesTimerID);}
function tickSeriesTimer(){ const s=Math.floor((Date.now()-seriesStartTime)/1000); seriesTimeLabel.textContent=`Series time: ${s}s`; }

// ---------- UI helpers ----------
function refreshHeader(){
  currentMachineSpan.textContent = machineIdx;
  seriesOrdinalSpan.textContent  = seriesDoneOnMachine + 1; // next series number
  seriesTotalDisplay.textContent = `Total series completed: ${seriesDoneTotal}`;
}

function addMachineRow(){
  currentRow=document.createElement("tr");
  currentRow.innerHTML=`<td>Machine ${machineIdx}</td><td>0</td>`;
  summaryTable.appendChild(currentRow);
}
function updateRow(n){ if(currentRow) currentRow.children[1].textContent=n; }

function hideActionButtons(){ actionButtons.style.display="none"; }
function showActionButtons(){ actionButtons.style.display="flex"; }

// ---------- Beep / Vibrate ----------
function playBeep() {
  const soundEnabled = localStorage.getItem("workoutSound") !== "0";
  if (!soundEnabled) return;

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);
  oscillator.connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.2);
}


function vibrate() {
  const vibrateEnabled = localStorage.getItem("workoutVibrate") !== "0";
  if (vibrateEnabled && navigator.vibrate) {
    navigator.vibrate(500);
  }
}


/* Modern client-side logic:
 - يجيب matches.json
 - يدير فلترة على region (Europe/Africa/Morocco/National/Other)
 - يدير tabs: today / tomorrow / week
 - بحث فـ الفرق والقنوات والبطولات
*/

const MATCHES_JSON = "matches.json";

document.addEventListener("DOMContentLoaded", async () => {
  const matchListEl = document.getElementById("match-list");
  const searchInput = document.getElementById("search");
  const tabs = document.querySelectorAll(".tab");
  const filterInputs = document.querySelectorAll("#filters input");

  let matches = [];
  try {
    const res = await fetch(MATCHES_JSON + "?v=" + Date.now());
    matches = await res.json();
  } catch (err) {
    matchListEl.innerHTML = `<div class="loading">مشكلة فـ تحميل matches.json — تأكد من وجود الملف أو صياغته.</div>`;
    console.error(err);
    return;
  }

  // helper: format date/time
  function formatLocal(iso) {
    const d = new Date(iso);
    return d.toLocaleString("ar-SA", {
      weekday: "short", day: "numeric", month: "short",
      hour: "2-digit", minute: "2-digit"
    });
  }

  function isSameDay(d1, d2) {
    return new Date(d1).toDateString() === new Date(d2).toDateString();
  }

  function getFiltered(range = "today", query = "", regions = []) {
    const now = new Date();
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate()+1);

    let arr = matches.slice();

    // region filtering
    if (regions.length) {
      arr = arr.filter(m => regions.includes(m.region));
    }

    // range filtering
    arr = arr.filter(m => {
      const dt = new Date(m.datetime);
      if (range === "today") return isSameDay(dt, now);
      if (range === "tomorrow") return isSameDay(dt, tomorrow);
      if (range === "week") {
        const end = new Date(now); end.setDate(now.getDate()+6);
        return dt >= now.setHours(0,0,0,0) && dt <= end.setHours(23,59,59,999);
      }
      return true;
    });

    // search
    if (query) {
      const q = query.trim().toLowerCase();
      arr = arr.filter(m => {
        const hay = `${m.teamA} ${m.teamB} ${m.competition} ${m.channels.join(" ")}`.toLowerCase();
        return hay.includes(q);
      });
    }

    // sort by datetime ascending
    arr.sort((a,b)=> new Date(a.datetime) - new Date(b.datetime));
    return arr;
  }

  function renderList(list) {
    if (!list.length) {
      matchListEl.innerHTML = `<div class="loading">ماكاين حتى مباراة فهاد النطاق.</div>`;
      return;
    }
    matchListEl.innerHTML = "";
    list.forEach(m => {
      const el = document.createElement("div");
      el.className = "match-card";
      el.innerHTML = `// Modal elements
const modal = document.getElementById("matchModal");
const modalTeams = document.getElementById("modalTeams");
const modalCompetition = document.getElementById("modalCompetition");
const modalDate = document.getElementById("modalDate");
const modalStadium = document.getElementById("modalStadium");
const modalChannels = document.getElementById("modalChannels");
const modalNote = document.getElementById("modalNote");
const closeBtn = modal.querySelector(".close");

// Close handlers
closeBtn.onclick = () => { modal.style.display = "none"; };
window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; };

// click على البطاقة لفتح Modal
el.addEventListener("click", () => {
  modalTeams.textContent = `${m.teamA} — ${m.teamB}`;
  modalCompetition.textContent = `البطولة: ${m.competition} · المنطقة: ${m.region}`;
  modalDate.textContent = `التاريخ والوقت: ${new Date(m.datetime).toLocaleString("ar-SA",{ weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}`;
  modalStadium.textContent = m.stadium ? `الملعب: ${m.stadium}` : "";
  modalChannels.textContent = `القنوات الناقلة: ${m.channels.join(" · ")}`;
  modalNote.textContent = m.note ? `ملاحظات: ${m.note}` : "";
  modal.style.display = "block";
});
        <div class="match-left">
          <div class="teams">
            <div class="team-names"><span>${escapeHtml(m.teamA)}</span>
              <span class="vs">—</span>
              <span>${escapeHtml(m.teamB)}</span>
            </div>
            <div class="comp">${escapeHtml(m.competition)} · ${escapeHtml(m.region)}</div>
          </div>
        </div>

        <div class="match-right">
          <div class="time">${formatLocal(m.datetime)}</div>
          <div class="stadium">${escapeHtml(m.stadium || "")}</div>
          <div class="channels">${m.channels.map(c => escapeHtml(c)).join(" · ")}</div>
        </div>
      `;
      matchListEl.appendChild(el);
    });
  }

  function escapeHtml(s){ if(!s) return ""; return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;"); }

  // initial render: today
  let activeRange = "today";
  // read selected regions
  function getSelectedRegions(){
    return Array.from(filterInputs).filter(i=>i.checked).map(i=>i.value);
  }

  function update() {
    const q = searchInput.value;
    const regions = getSelectedRegions();
    const list = getFiltered(activeRange, q, regions);
    renderList(list);
  }

  // tabs
  tabs.forEach(t=>{
    t.addEventListener("click", ()=>{
      tabs.forEach(x=>x.classList.remove("active"));
      t.classList.add("active");
      activeRange = t.dataset.range;
      update();
    });
  });

  // search debounce
  let debounceTimer = null;
  searchInput.addEventListener("input", ()=>{
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(update, 250);
  });

  filterInputs.forEach(i=>i.addEventListener("change", update));

  // first update
  update();
});

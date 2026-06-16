/* ================= STORAGE ================= */
let characters = JSON.parse(localStorage.getItem("coc_chars") || "[]");
let selectedId = null;

let statChart = null;

function saveToStorage() {
    localStorage.setItem("coc_chars", JSON.stringify(characters));
}

function updateRadarChart(stats) {
    const labels = Object.keys(stats);
    const values = Object.values(stats);

    const ctx = document.getElementById("statChart");

    if (statChart) {
        statChart.destroy();
    }

    statChart = new Chart(ctx, {
        type: "radar",
        data: {
            labels: labels,
            datasets: [{
                label: "Investigator Stats",
                data: values,
                backgroundColor: "rgba(46, 125, 255, 0.2)",
                borderColor: "#2e7dff",
                pointBackgroundColor: "#ffffff",
                pointBorderColor: "#2e7dff"
            }]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    suggestedMin: 0,
                    suggestedMax: 100,
                    ticks: {
                        display: false
                    },
                    grid: {
                        color: "#333"
                    },
                    angleLines: {
                        color: "#444"
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: "#e8e8e8"
                    }
                }
            }
        }
    });
}

/* ================= CHARACTER CRUD ================= */

function createCharacter(customStats = null) {
    let name = document.getElementById("nameInput").value || "Unknown";
    let job = document.getElementById("jobInput").value || "Unemployed Horror Witness";

    let char = {
        id: Date.now(),
        name,
        job,
        stats: customStats || rollAllStats()
    };

    characters.push(char);
    saveToStorage();
    renderCharacters();
    selectCharacter(char.id);

    animate("characterList");
}

function generateCharacter() {
    createCharacter(rollAllStats());
}

function renderCharacters() {
    let html = "";

    characters.forEach(c => {
        html += `
        <div class="card animate__animated animate__fadeInUp" style="padding:10px;">
            <b>${c.name}</b><br>
            <span class="small">${c.job}</span><br>

            <button onclick="selectCharacter(${c.id})">Open</button>
            <button onclick="quickDelete(${c.id})">Delete</button>
        </div>
        `;
    });

    document.getElementById("characterList").innerHTML = html;
}

function selectCharacter(id) {
    selectedId = id;
    let char = characters.find(c => c.id === id);

    if (!char) return;

    document.getElementById("selectedCharacter").innerHTML =
        `<b>${char.name}</b><br>${char.job}`;

    renderStats(char.stats);
    updateRadarChart(char.stats);
    animate("selectedCharacter");
}

function updateCharacter() {
    let char = characters.find(c => c.id === selectedId);
    if (!char) return;

    char.name = document.getElementById("nameInput").value || char.name;
    char.job = document.getElementById("jobInput").value || char.job;

    document.querySelectorAll(".stat input").forEach(input => {
        char.stats[input.dataset.key] = parseInt(input.value);
    });

    saveToStorage();
    renderCharacters();
    selectCharacter(char.id);
}

function deleteCharacter() {
    characters = characters.filter(c => c.id !== selectedId);
    selectedId = null;

    saveToStorage();
    renderCharacters();

    document.getElementById("selectedCharacter").innerHTML = "No character selected";
    document.getElementById("stats").innerHTML = "";
}

function quickDelete(id) {
    characters = characters.filter(c => c.id !== id);
    saveToStorage();
    renderCharacters();
}

/* ================= STATS ================= */

function rollStat3d6x5() {
    return roll("3d6").total * 5;
}

function rollStat2d6Plus6x5() {
    return (roll("2d6").total + 6) * 5;
}

function changeStat(key, amount) {
    let char = characters.find(c => c.id === selectedId);
    if (!char) return;

    char.stats[key] = (char.stats[key] || 0) + amount;

    saveToStorage();
    renderStats(char.stats);

    animate("stats");
}

function renderStats(stats) {
    let html = "";

    for (let key in stats) {
        html += `
        <div class="stat animate__animated animate__fadeIn">
            <b>${key}</b><br>

            <div style="display:flex; justify-content:center; align-items:center; gap:5px; margin-top:6px;">
                
                <button onclick="changeStat('${key}', -5)">-</button>

                <input 
                    data-key="${key}" 
                    value="${stats[key]}"
                    style="width:60px; text-align:center;"
                >

                <button onclick="changeStat('${key}', 5)">+</button>

            </div>
        </div>
        `;
    }

    document.getElementById("stats").innerHTML = html;
}

function rollAllStats() {
    return {
        STR: rollStat3d6x5(),
        CON: rollStat3d6x5(),
        DEX: rollStat3d6x5(),
        APP: rollStat3d6x5(),
        POW: rollStat3d6x5(),
        SIZ: rollStat2d6Plus6x5(),
        INT: rollStat2d6Plus6x5(),
        EDU: rollStat2d6Plus6x5()
    };
}

/* ================= DICE SYSTEM ================= */

function roll(formula) {
    formula = formula.toLowerCase().replace(/\s/g, "");
    let match = formula.match(/(\d*)d(\d+)([+-]\d+)?/);

    if (!match) return "Invalid dice formula";

    let count = parseInt(match[1] || "1");
    let sides = parseInt(match[2]);
    let mod = parseInt(match[3] || "0");

    let rolls = [];
    let total = 0;

    for (let i = 0; i < count; i++) {
        let r = Math.floor(Math.random() * sides) + 1;
        rolls.push(r);
        total += r;
    }

    total += mod;

    return { rolls, total, modifier: mod };
}

function quickRoll(sides) {
    let r = roll(`1d${sides}`);
    document.getElementById("diceOutput").innerText =
        `d${sides} → ${r.rolls[0]}`;
}

function rollDice() {
    let formula = document.getElementById("diceInput").value;
    let r = roll(formula);

    if (typeof r === "string") {
        document.getElementById("diceOutput").innerText = r;
        return;
    }

    document.getElementById("diceOutput").innerText =
        `${formula} → ${r.rolls.join(", ")} = ${r.total}`;
}

/* ================= ANIMATION ================= */

function animate(id) {
    let el = document.getElementById(id);
    if (!el) return;

    el.classList.remove("animate__animated", "animate__pulse");
    void el.offsetWidth;
    el.classList.add("animate__animated", "animate__pulse");
}

/* ================= INIT ================= */
renderCharacters();
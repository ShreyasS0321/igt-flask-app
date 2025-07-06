// --- Iowa Gambling Task Logic in JS ---
const DECKS = ["A", "B", "C", "D"];
const TRIALS = 100;
const BLOCK_SIZE = 20;

const REWARDS = { "A": 100, "B": 100, "C": 50, "D": 50 };
const PENALTIES = { "A": 250, "B": 250, "C": 50, "D": 50 };

let bankLabel, blockLabel, trialLabel, blockProgress, feedbackLabel, infoLabel, finishBtn, downloadBtn;
let trialNum = 0;
let bank = 2000;
let data = [];
let lastDeck = null;
let lastSwitchTrial = -1;
let prevLoss = false;
let switchCount = 0;
let lossBasedSwitchCount = 0;
let returnToPrevCount = 0;
let deckHistory = [];
let timePressureTrials = [];
let choiceStartTime = null;
let timer = null;
let demographics = {};

window.onload = function() {
    // Cache UI elements here (after DOM loads!)
    bankLabel = document.getElementById('bank');
    blockLabel = document.getElementById('block');
    trialLabel = document.getElementById('trial');
    blockProgress = document.getElementById('block-progress');
    feedbackLabel = document.getElementById('feedback');
    infoLabel = document.getElementById('info');
    finishBtn = document.getElementById('finish');
    downloadBtn = document.getElementById('download-csv');

    // Demographics section handling
    const demogSection = document.getElementById('demographics-section');
    const mainSection = document.getElementById('igt-main');
    const startBtn = document.getElementById('demog-start');

    startBtn.onclick = function() {
        const name = document.getElementById('demog-name').value.trim();
        const age = document.getElementById('demog-age').value.trim();
        const gender = document.getElementById('demog-gender').value;
        if (!name || !age || !gender) {
            alert("Please fill all demographic details.");
            return;
        }
        demographics = { name, age, gender };
        demogSection.style.display = 'none';
        mainSection.style.display = '';
        init(); // Start the experiment!
    };

    // Attach deck handlers
    DECKS.forEach(deck => {
        const btn = document.getElementById('deck-' + deck);
        if (btn) {
            btn.onclick = () => deckChosen(deck);
        }
    });

    // Hide finish button, only show Download CSV on completion
    finishBtn.style.display = "none";
    downloadBtn.style.display = "none";

    // Download CSV handler
    downloadBtn.onclick = function() {
        // Attach demographics to each row
        const combinedData = data.map(row => ({
            ...row,
            name: demographics.name,
            age: demographics.age,
            gender: demographics.gender
        }));
        const csv = arrayToCSV(combinedData);
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "igt_results.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
};

// --- The rest of your functions below (unchanged except endExperiment) ---

function init() {
    timePressureTrials = Array.from({length: TRIALS}, (_, i) => i);
    timePressureTrials = timePressureTrials.sort(() => Math.random() - 0.5).slice(0, Math.floor(TRIALS/2));
    updateLabels();
    enableDecks(true);
    infoLabel.innerText = "Choose a deck to draw a card.";
    feedbackLabel.innerText = "";
    trialNum = 0;
    bank = 2000;
    data = [];
    lastDeck = null;
    prevLoss = false;
    switchCount = 0;
    lossBasedSwitchCount = 0;
    returnToPrevCount = 0;
    deckHistory = [];
    nextTrial();
}

function updateLabels() {
    bankLabel.innerText = bank;
    blockLabel.innerText = (Math.floor(trialNum / BLOCK_SIZE) + 1) + '/5';
    trialLabel.innerText = (trialNum + 1) + '/' + TRIALS;
    if (blockProgress) blockProgress.value = (trialNum % BLOCK_SIZE) + 1;
}

function enableDecks(enable) {
    DECKS.forEach(deck => {
        const btn = document.getElementById('deck-' + deck);
        if (btn) btn.disabled = !enable;
    });
}

function deckChosen(deck) {
    enableDecks(false);
    if (timer) {
        clearTimeout(timer);
        timer = null;
    }
    const rt = Math.round(performance.now() - choiceStartTime);

    // Reward/penalty logic
    const penalized = Math.random() < 0.5;
    const fee = penalized ? PENALTIES[deck] : 0;
    const winAmt = REWARDS[deck];
    const bankBefore = bank;
    bank += winAmt - fee;
    const bankAfter = bank;

    let feedback;
    if (fee > 0) {
        if (winAmt === 100)
            feedback = `You won rupee 100, but lost rupee 250 penalty ☠️☠️☠️☠️`;
        else
            feedback = `You won rupee 50, but lost rupee 50 penalty☠️☠️`;
        feedbackLabel.style.color = "#c82333";
    } else {
        if (winAmt === 100)
            feedback = `You won rupee 100, no penalty 🤩🤩🤩🤩`;
        else
            feedback = `You won rupee 50, no penalty 🤩🤩`;
        feedbackLabel.style.color = "#217a2e";
    }
    feedbackLabel.innerText = feedback;
    bankLabel.innerText = bank;

    // Switch tracking logic
    let switch_ = 0, lossBasedSwitch = 0, returnToPrev = 0;
    if (lastDeck !== null) {
        if (deck !== lastDeck) {
            switch_ = 1;
            switchCount++;
            lastSwitchTrial = trialNum;
            if (prevLoss) {
                lossBasedSwitch = 1;
                lossBasedSwitchCount++;
            }
        }
        if (deckHistory.length >= 2 && deck === deckHistory[deckHistory.length - 2]
            && deckHistory[deckHistory.length - 1] !== deck) {
            returnToPrev = 1;
            returnToPrevCount++;
        }
    }
    prevLoss = (fee > 0);
    deckHistory.push(deck);
    lastDeck = deck;

    // Save trial data
    data.push({
        reaction_time_ms: rt,
        deck_chosen: DECKS.indexOf(deck) + 1,
        penalty_occured: penalized ? 1 : 0,
        bank_before: bankBefore,
        bank_after: bankAfter,
        amount_won: winAmt,
        fee_paid: fee,
        block_num: Math.floor(trialNum / BLOCK_SIZE) + 1,
        switched_deck: switch_,
        loss_based_switch: lossBasedSwitch,
        return_to_prev_deck: returnToPrev,
        time_pressure: timePressureTrials.includes(trialNum) ? 1 : 0
    });

    updateLabels();
    setTimeout(nextTrial, 850);
}

function timeUp() {
    enableDecks(false);
    feedbackLabel.style.color = "#c82333";
    feedbackLabel.innerText = "Time's up! No choice made. Bank unchanged.";
    data.push({
        reaction_time_ms: 3000,
        deck_chosen: 0,
        penalty_occured: 0,
        bank_before: bank,
        bank_after: bank,
        amount_won: 0,
        fee_paid: 0,
        block_num: Math.floor(trialNum / BLOCK_SIZE) + 1,
        switched_deck: 0,
        loss_based_switch: 0,
        return_to_prev_deck: 0,
        time_pressure: timePressureTrials.includes(trialNum) ? 1 : 0
    });
    deckHistory.push(null);
    setTimeout(nextTrial, 850);
}

function nextTrial() {
    if (trialNum % BLOCK_SIZE === 0 && trialNum !== 0) {
        let blockNum = Math.floor(trialNum / BLOCK_SIZE) + 1;
        // --- BEGIN: Level Up Announcement ---
        infoLabel.innerHTML = `<div style="background:linear-gradient(90deg,#ffe066,#ff7f50,#43e97b,#38f9d7); 
            color:#222; font-size:2.1rem; font-weight:bold; padding:24px 12px; border-radius:16px;
            margin:16px 0; box-shadow:0 0 16px #f9e79f;">
            <span style="font-size:2.4rem; margin-right:12px;">🏆✨</span>
            LEVEL UP!<br>Level <span style="color:#126e36">${blockNum}</span> begins!
            <span style="font-size:2.4rem; margin-left:12px;">🚀🌈</span>
            </div>`;
        setTimeout(() => {
            infoLabel.innerText = "Choose a deck to draw a card.";
            updateLabels();
            _afterLevelUpNextTrial();
        }, 2200);  // 2.2 seconds for dramatic pause
        return;
    }
    _afterLevelUpNextTrial();
}

function _afterLevelUpNextTrial() {
    if (trialNum >= TRIALS) {
        endExperiment();
        return;
    }
    feedbackLabel.innerText = "";
    choiceStartTime = performance.now();
    if (timePressureTrials.includes(trialNum)) {
        infoLabel.innerText = "You have 3 seconds to choose a deck (TIME PRESSURE)";
        timer = setTimeout(timeUp, 3000);
    } else {
        infoLabel.innerText = "Choose a deck to draw a card (no time limit).";
        timer = null;
    }
    enableDecks(true);
    trialNum += 1;
    updateLabels();
}

function endExperiment() {
    enableDecks(false);
    infoLabel.innerHTML = "<b>Game Over!</b><br>You can now download your results.<br>Developed by Shreyas Sinha | <a href='https://www.linkedin.com/in/shreyas-sinha-appcair' target='_blank'>LinkedIn</a>";
    feedbackLabel.innerHTML = `Final Bank: ₹${bank}<br>Switches: ${switchCount}, Loss-based Switches: ${lossBasedSwitchCount}, Return-to-Prev: ${returnToPrevCount}`;
    finishBtn.style.display = "none";
    downloadBtn.style.display = "block";
}

// --- CSV Helper ---
function arrayToCSV(data) {
    if (data.length === 0) return "";
    const header = Object.keys(data[0]).join(",");
    const rows = data.map(row => Object.values(row).map(val => `"${val}"`).join(","));
    return [header, ...rows].join("\r\n");
}

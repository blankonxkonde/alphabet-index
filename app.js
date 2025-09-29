(function() {
    'use strict';

    // Alphabet helpers
    const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)); // A-Z
    const NATO_PHONETIC = {
        A: 'Alpha',
        B: 'Bravo',
        C: 'Charlie',
        D: 'Delta',
        E: 'Echo',
        F: 'Foxtrot',
        G: 'Golf',
        H: 'Hotel',
        I: 'India',
        J: 'Juliett',
        K: 'Kilo',
        L: 'Lima',
        M: 'Mike',
        N: 'November',
        O: 'Oscar',
        P: 'Papa',
        Q: 'Quebec',
        R: 'Romeo',
        S: 'Sierra',
        T: 'Tango',
        U: 'Uniform',
        V: 'Victor',
        W: 'Whiskey',
        X: 'X-ray',
        Y: 'Yankee',
        Z: 'Zulu'
    };
    function letterToIndex(letter) {
        if (!letter) return NaN;
        const c = letter.toUpperCase();
        const code = c.charCodeAt(0);
        if (code < 65 || code > 90) return NaN;
        return code - 64; // A=1
    }
    function indexToLetter(index) {
        const n = Number(index);
        if (!Number.isInteger(n) || n < 1 || n > 26) return '';
        return String.fromCharCode(64 + n);
    }

    // DOM refs
    const dom = {
        startLetter: document.getElementById('startLetter'),
        endLetter: document.getElementById('endLetter'),
        sequenceLength: document.getElementById('sequenceLength'),
        numQuestions: document.getElementById('numQuestions'),
        startBtn: document.getElementById('startBtn'),
        resetBtn: document.getElementById('resetBtn'),
        configError: document.getElementById('config-error'),
        answer: document.getElementById('answer'),
        submitBtn: document.getElementById('submitBtn'),
        skipBtn: document.getElementById('skipBtn'),
        endBtn: document.getElementById('endBtn'),
        openIndexBtnConfig: document.getElementById('openIndexBtnConfig'),
        openIndexBtnGame: document.getElementById('openIndexBtnGame'),
        indexModal: document.getElementById('indexModal'),
        indexTableContainer: document.getElementById('indexTableContainer'),
        closeIndexBtn: document.getElementById('closeIndexBtn'),
        progress: document.getElementById('progress'),
        score: document.getElementById('score'),
        promptLabel: document.getElementById('promptLabel'),
        promptValue: document.getElementById('promptValue'),
        feedback: document.getElementById('feedback'),
        gameSection: document.getElementById('game-section'),
        summarySection: document.getElementById('summary-section'),
        summaryStats: document.getElementById('summary-stats'),
        review: document.getElementById('review'),
        restartBtn: document.getElementById('restartBtn'),
        backToConfigBtn: document.getElementById('backToConfigBtn'),
        gridContainer: document.getElementById('gridContainer'),
        problemRow: document.querySelector('.problem'),
        answerRow: document.querySelector('.answer-row')
    };

    // Populate selects
    function populateLetterSelect(select) {
        select.innerHTML = '';
        LETTERS.forEach((L, idx) => {
            const opt = document.createElement('option');
            opt.value = L;
            opt.textContent = `${L} (${idx + 1})`;
            select.appendChild(opt);
        });
    }
    populateLetterSelect(dom.startLetter);
    populateLetterSelect(dom.endLetter);
    dom.startLetter.value = 'A';
    dom.endLetter.value = 'Z';

    // Storage
    const STORAGE_KEY = 'alphabet-index-settings-v1';
    function saveSettings() {
        const mode = document.querySelector('input[name="mode"]:checked')?.value || 'l2n';
        const unit = document.querySelector('input[name="unit"]:checked')?.value || 'single';
        const settings = {
            mode,
            startLetter: dom.startLetter.value || 'A',
            endLetter: dom.endLetter.value || 'Z',
            numQuestions: Number(dom.numQuestions.value || 10),
            unit,
            sequenceLength: Number(dom.sequenceLength?.value || 4)
        };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (_) {}
    }
    function loadSettings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const s = JSON.parse(raw);
            const mode = s.mode || 'l2n';
            const node = document.querySelector(`input[name="mode"][value="${mode}"]`);
            if (node) node.checked = true;
            if (s.startLetter) dom.startLetter.value = s.startLetter;
            if (s.endLetter) dom.endLetter.value = s.endLetter;
            if (s.numQuestions) dom.numQuestions.value = s.numQuestions;
            if (s.unit) {
                const nodeU = document.querySelector(`input[name="unit"][value="${s.unit}"]`);
                if (nodeU) nodeU.checked = true;
            }
            if (s.sequenceLength && dom.sequenceLength) dom.sequenceLength.value = s.sequenceLength;
        } catch (_) {}
    }
    loadSettings();
    // Make sure modal is hidden on load and table container is ready
    if (document.getElementById('indexModal')) {
        document.getElementById('indexModal').classList.add('hidden');
    }

    // Utils
    function show(el) { el.classList.remove('hidden'); }
    function hide(el) { el.classList.add('hidden'); }
    function getMode() {
        return document.querySelector('input[name="mode"]:checked')?.value || 'l2n';
    }
    function getGridOrder() {
        return document.querySelector('input[name="gridOrder"]:checked')?.value || 'ordered';
    }
    function getGridAsk() {
        return document.querySelector('input[name="gridAsk"]:checked')?.value || 'l2n';
    }
    function getUnit() {
        return document.querySelector('input[name="unit"]:checked')?.value || 'single';
    }
    function getSequenceLength() {
        const n = Number(dom.sequenceLength?.value || 4);
        if (!Number.isFinite(n)) return 4;
        return Math.max(2, Math.min(12, Math.floor(n)));
    }
    function updateSequenceControlsDisabled() {
        if (!dom.sequenceLength) return;
        dom.sequenceLength.disabled = getUnit() !== 'sequence';
    }
    updateSequenceControlsDisabled();
    function updateGridOptionsVisibility() {
        const isGrid = getMode() === 'grid';
        const row = document.getElementById('grid-options-row');
        if (!row) return;
        if (isGrid) row.classList.remove('hidden'); else row.classList.add('hidden');
    }
    updateGridOptionsVisibility();
    function rangeInclusive(a, b) {
        const out = [];
        for (let i = a; i <= b; i++) out.push(i);
        return out;
    }
    function randItem(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
    function pickUnique(items, count) {
        const copy = items.slice();
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = copy[i];
            copy[i] = copy[j];
            copy[j] = tmp;
        }
        const n = Math.max(0, Math.min(count, copy.length));
        return copy.slice(0, n);
    }

    // State
    let questions = [];
    let currentIndex = 0;
    let numCorrect = 0;
    let modeAtStart = 'l2n';

    // Index modal
    function renderIndexGrid() {
        const frag = document.createDocumentFragment();
        const grid = document.createElement('div');
        grid.className = 'index-grid';
        for (let i = 1; i <= 26; i++) {
            const cell = document.createElement('div');
            cell.className = 'index-cell';
            const L = indexToLetter(i);
            const letter = document.createElement('div');
            letter.className = 'index-letter';
            letter.textContent = L;
            const num = document.createElement('div');
            num.className = 'index-number';
            num.textContent = i;
            const phon = document.createElement('div');
            phon.className = 'index-phonetic';
            phon.textContent = NATO_PHONETIC[L] || '';
            cell.appendChild(letter);
            cell.appendChild(num);
            cell.appendChild(phon);
            grid.appendChild(cell);
        }
        frag.appendChild(grid);
        dom.indexTableContainer.innerHTML = '';
        dom.indexTableContainer.appendChild(frag);
    }
    function openIndexModal() {
        try { renderIndexGrid(); } catch (_) {}
        dom.indexModal.setAttribute('aria-hidden', 'false');
        dom.indexModal.classList.remove('hidden');
    }
    function closeIndexModal() {
        dom.indexModal.classList.add('hidden');
        dom.indexModal.setAttribute('aria-hidden', 'true');
    }

    function buildQuestions() {
        const startIdx = letterToIndex(dom.startLetter.value);
        const endIdx = letterToIndex(dom.endLetter.value);
        if (!Number.isInteger(startIdx) || !Number.isInteger(endIdx)) throw new Error('Rentang huruf tidak valid.');
        if (startIdx > endIdx) throw new Error('Huruf awal harus ≤ huruf akhir.');

        const indices = rangeInclusive(startIdx, endIdx);
        const letters = indices.map(indexToLetter);

        const mode = getMode();
        if (mode === 'grid') {
            // Build one grid task covering the full range
            const order = getGridOrder();
            const ask = getGridAsk();
            const orderedLetters = letters.slice();
            const list = order === 'shuffled' ? pickUnique(orderedLetters, orderedLetters.length) : orderedLetters;
            return { qs: [{ type: 'grid', list, ask }], mode };
        }

        const count = Number(dom.numQuestions.value);
        if (!Number.isFinite(count) || count < 1) throw new Error('Jumlah soal tidak valid.');

        const unit = getUnit();
        const seqLen = getSequenceLength();
        const qs = [];
        for (let i = 0; i < count; i++) {
            let kind = mode;
            if (mode === 'mix') kind = Math.random() < 0.5 ? 'l2n' : 'n2l';
            if (unit === 'single') {
                if (kind === 'l2n') {
                    const L = randItem(letters);
                    qs.push({ type: 'l2n', unit: 'single', prompt: L, answer: letterToIndex(L) });
                } else {
                    const idx = randItem(indices);
                    qs.push({ type: 'n2l', unit: 'single', prompt: idx, answer: indexToLetter(idx) });
                }
            } else {
                // sequence unit (default: unique letters within the chosen range)
                const seqLetters = pickUnique(letters, seqLen);
                const lettersStr = seqLetters.join('');
                const numbersArr = seqLetters.map(letterToIndex);
                const numbersStr = numbersArr.join('');
                const numbersWithSep = numbersArr.join('-');
                if (kind === 'l2n') {
                    // Prompt huruf, jawaban angka (diterima tanpa/ dengan separator)
                    qs.push({ type: 'l2n', unit: 'sequence', prompt: lettersStr, answer: numbersStr, answerAlt: numbersWithSep });
                } else {
                    // Prompt angka (tampilkan berseparator), jawaban huruf
                    qs.push({ type: 'n2l', unit: 'sequence', prompt: numbersWithSep, answer: lettersStr });
                }
            }
        }
        return { qs, mode };
    }

    function renderQuestion() {
        const q = questions[currentIndex];
        dom.progress.textContent = `Soal ${currentIndex + 1}/${questions.length}`;
        dom.score.textContent = `Benar: ${numCorrect}`;
        // reset attributes that may be set dynamically
        dom.answer.removeAttribute('maxlength');
        dom.answer.removeAttribute('inputmode');
        if (q.type === 'grid') {
            // Render grid input mode
            dom.problemRow.classList.add('hidden');
            dom.answerRow.classList.add('hidden');
            dom.gridContainer.classList.remove('hidden');
            dom.promptLabel.textContent = 'Grid';
            dom.promptValue.textContent = '';

            // Build grid with inputs
            const grid = document.createElement('div');
            grid.className = 'index-grid';
            const ask = q.ask; // 'l2n' or 'n2l'
            q.list.forEach((L, idx) => {
                const i = letterToIndex(L);
                const cell = document.createElement('div');
                cell.className = 'index-cell';

                const wrap = document.createElement('div');
                wrap.className = 'grid-cell-inputs';
                const top = document.createElement('div');
                const bottom = document.createElement('div');

                if (ask === 'l2n') {
                    top.className = 'grid-letter';
                    top.textContent = L;
                    const input = document.createElement('input');
                    input.className = 'grid-input';
                    input.type = 'number';
                    input.setAttribute('inputmode', 'numeric');
                    input.dataset.expected = String(i);
                    bottom.appendChild(input);
                } else {
                    top.className = 'grid-number';
                    top.textContent = String(i);
                    const input = document.createElement('input');
                    input.className = 'grid-input';
                    input.type = 'text';
                    input.setAttribute('inputmode', 'text');
                    input.setAttribute('maxlength', '1');
                    input.dataset.expected = L;
                    bottom.appendChild(input);
                }

                wrap.appendChild(top);
                wrap.appendChild(bottom);
                cell.appendChild(wrap);
                grid.appendChild(cell);
            });
            dom.gridContainer.innerHTML = '';
            dom.gridContainer.appendChild(grid);
            return;
        } else if (q.type === 'l2n') {
            dom.promptLabel.textContent = 'Huruf';
            dom.promptValue.textContent = q.prompt;
            if (q.unit === 'sequence') {
                dom.answer.type = 'text';
                dom.answer.setAttribute('inputmode', 'numeric');
                dom.answer.value = '';
                dom.answer.placeholder = 'angka (bisa 1-9-3-8-1 atau 19381)';
            } else {
                dom.answer.type = 'number';
                dom.answer.setAttribute('inputmode', 'numeric');
                dom.answer.value = '';
                dom.answer.placeholder = 'angka (1-26)';
            }
        } else {
            dom.promptLabel.textContent = 'Angka';
            dom.promptValue.textContent = String(q.prompt);
            dom.answer.type = 'text';
            if (q.unit === 'sequence') {
                dom.answer.setAttribute('inputmode', 'text');
                dom.answer.setAttribute('maxlength', String(q.answer.length));
                dom.answer.value = '';
                dom.answer.placeholder = 'huruf berurutan tanpa spasi (contoh: DEGH)';
            } else {
                dom.answer.setAttribute('inputmode', 'text');
                dom.answer.value = '';
                dom.answer.placeholder = 'huruf (A-Z)';
            }
        }
        // ensure single-question mode UI is visible
        dom.problemRow.classList.remove('hidden');
        dom.answerRow.classList.remove('hidden');
        dom.gridContainer.classList.add('hidden');
        dom.feedback.textContent = '';
        dom.feedback.className = 'feedback';
        dom.answer.focus();
    }

    function normalizeLetter(input) {
        if (!input) return '';
        return String(input).trim().toUpperCase();
    }

    function handleSubmit() {
        const q = questions[currentIndex];
        if (!q) return;

        if (q.type === 'grid') {
            const inputs = dom.gridContainer.querySelectorAll('.grid-input');
            let allCorrect = true;
            let correctCount = 0;
            const wrongLabels = [];
            inputs.forEach(input => {
                const expected = String(input.dataset.expected || '').toUpperCase();
                const rawVal = String(input.value || '').trim();
                const val = input.type === 'number' ? String(Number(rawVal)) : rawVal.toUpperCase();
                const isOk = val && val === expected;
                input.style.borderColor = isOk ? 'var(--ok)' : 'var(--err)';
                if (isOk) {
                    correctCount += 1;
                } else {
                    allCorrect = false;
                    const wrap = input.parentElement && input.parentElement.parentElement;
                    const topEl = wrap ? wrap.querySelector('.grid-letter, .grid-number') : null;
                    const label = topEl ? String(topEl.textContent || '').trim() : '';
                    wrongLabels.push(label);
                }
            });

            const total = inputs.length;
            const wrongCount = total - correctCount;
            dom.score.textContent = `Benar: ${correctCount}/${total}`;

            if (allCorrect) {
                inputs.forEach(i => { i.disabled = true; i.style.borderColor = 'var(--ok)'; });
                numCorrect = total; // For summary screen
                dom.feedback.textContent = 'Semua benar!';
                dom.feedback.classList.add('ok');

                // All correct, so proceed to summary
                setTimeout(() => {
                    currentIndex += 1; // This will be 1
                    showSummary(); // questions.length is 1, so this will trigger
                }, 350);

            } else {
                const list = wrongLabels.filter(Boolean).join(', ');
                dom.feedback.innerHTML = `Salah: <strong>${wrongCount}</strong>${list ? ` (${list})` : ''}`;
                dom.feedback.classList.remove('ok');
                dom.feedback.classList.add('err');
            }
            return; // Grid logic is self-contained
        }

        // --- Non-Grid Question Logic ---

        const raw = dom.answer.value.trim();
        if (!raw) return;

        let correct = false;
        if (q.unit === 'sequence') {
            if (q.type === 'l2n') {
                const digits = raw.replace(/\D+/g, '');
                correct = digits === String(q.answer);
                if (!correct && q.answerAlt) {
                    const altDigits = String(q.answerAlt).replace(/\D+/g, '');
                    correct = digits === altDigits;
                }
            } else {
                const letters = normalizeLetter(raw).replace(/[^A-Z]/g, '');
                correct = letters === q.answer;
            }
        } else { // single
            if (q.type === 'l2n') {
                const val = Number(raw);
                correct = Number.isInteger(val) && val === q.answer;
            } else {
                const val = normalizeLetter(raw);
                correct = val === q.answer;
            }
        }

        if (correct) {
            numCorrect += 1;
            dom.feedback.textContent = 'Benar!';
            dom.feedback.classList.add('ok');
        } else {
            dom.feedback.innerHTML = `Salah. Jawaban benar: <strong>${q.answer}</strong>`;
            dom.feedback.classList.add('err');
        }
        dom.score.textContent = `Benar: ${numCorrect}`;

        setTimeout(() => {
            currentIndex += 1;
            if (currentIndex >= questions.length) {
                showSummary();
            } else {
                renderQuestion();
            }
        }, 350);
    }

    function showSummary() {
        hide(dom.gameSection);
        show(dom.summarySection);

        const total = questions.length;
        const wrong = total - numCorrect;
        dom.summaryStats.innerHTML = `
            <div class="summary-grid">
                <div><div class="stat-label">Total Soal</div><div class="stat-value">${total}</div></div>
                <div><div class="stat-label">Benar</div><div class="stat-value ok">${numCorrect}</div></div>
                <div><div class="stat-label">Salah</div><div class="stat-value err">${wrong}</div></div>
                <div><div class="stat-label">Mode</div><div class="stat-value">${modeAtStart.toUpperCase()}</div></div>
            </div>
        `;

        // Review list
        const ol = document.createElement('ol');
        questions.forEach(q => {
            const li = document.createElement('li');
            if (q.type === 'l2n') {
                li.textContent = `${q.prompt} → ${q.answer}`;
            } else {
                li.textContent = `${q.prompt} → ${q.answer}`;
            }
            ol.appendChild(li);
        });
        dom.review.innerHTML = '';
        dom.review.appendChild(ol);
    }

    function startGame() {
        dom.configError.textContent = '';
        dom.configError.classList.add('hidden');
        try {
            const built = buildQuestions();
            questions = built.qs;
            modeAtStart = built.mode;
            currentIndex = 0;
            numCorrect = 0;
            hide(document.getElementById('config-section'));
            hide(dom.summarySection);
            show(dom.gameSection);
            renderQuestion();
            saveSettings();
            updateGridOptionsVisibility();
        } catch (err) {
            dom.configError.textContent = err?.message || String(err);
            dom.configError.classList.remove('hidden');
        }
    }

    function resetConfig() {
        document.querySelector('input[name="mode"][value="l2n"]').checked = true;
        const unitSingle = document.querySelector('input[name="unit"][value="single"]');
        if (unitSingle) unitSingle.checked = true;
        dom.startLetter.value = 'A';
        dom.endLetter.value = 'Z';
        dom.numQuestions.value = 10;
        if (dom.sequenceLength) {
            dom.sequenceLength.value = 4;
            dom.sequenceLength.disabled = true;
        }
        try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    }

    // Events
    document.getElementById('config-section').addEventListener('change', () => { saveSettings(); updateSequenceControlsDisabled(); updateGridOptionsVisibility(); });
    dom.startBtn.addEventListener('click', startGame);
    dom.resetBtn.addEventListener('click', resetConfig);
    dom.submitBtn.addEventListener('click', handleSubmit);
    dom.answer.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSubmit(); });
    dom.openIndexBtnConfig.addEventListener('click', openIndexModal);
    dom.openIndexBtnGame.addEventListener('click', openIndexModal);
    dom.closeIndexBtn.addEventListener('click', closeIndexModal);
    dom.indexModal.addEventListener('click', (e) => { if (e.target === dom.indexModal) closeIndexModal(); });
    dom.skipBtn.addEventListener('click', () => {
        dom.feedback.textContent = 'Dilewati.';
        dom.feedback.classList.add('muted');
        setTimeout(() => {
            currentIndex += 1;
            if (currentIndex >= questions.length) {
                showSummary();
            } else {
                renderQuestion();
            }
        }, 250);
    });
    dom.endBtn.addEventListener('click', showSummary);
    dom.restartBtn.addEventListener('click', startGame);
    dom.backToConfigBtn.addEventListener('click', () => {
        hide(dom.summarySection);
        hide(dom.gameSection);
        show(document.getElementById('config-section'));
    });
})();



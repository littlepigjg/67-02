const ScoreUI = {
    selectedNote: null,
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    currentTool: 'select',
    noteDuration: 'quarter'
};

function initScoreEditor() {
    initScoreState();
    renderScore();
    setupScoreEventListeners();
    startAutoSave();
}

function renderScore() {
    const container = document.getElementById('score-editor');
    if (!container) return;

    const score = ScoreState.score;
    if (!score) return;

    let html = `
        <div class="score-header">
            <div class="score-title">${score.title || '未命名乐谱'}</div>
            <div class="score-meta">
                <span>调号: ${KeySignatures[score.metadata.keySignature]?.name || score.metadata.keySignature}</span>
                <span>拍号: ${score.metadata.timeSignature}</span>
                <span>速度: ${score.metadata.tempo} BPM</span>
            </div>
        </div>
        <div class="score-container">
    `;

    score.staves.forEach((staff, staffIndex) => {
        html += renderStaff(staff, staffIndex);
    });

    html += `</div>`;
    container.innerHTML = html;

    updateScoreToolbar();
}

function renderStaff(staff, staffIndex) {
    const clef = Clefs[staff.clef] || Clefs.treble;

    let html = `
        <div class="staff-container" data-staff-index="${staffIndex}">
            <div class="staff-label">${staff.name}</div>
            <div class="staff">
                <div class="clef-symbol">${clef.symbol}</div>
                <div class="staff-lines">
                    <div class="staff-line"></div>
                    <div class="staff-line"></div>
                    <div class="staff-line"></div>
                    <div class="staff-line"></div>
                    <div class="staff-line"></div>
                </div>
                <div class="measures-container">
    `;

    staff.measures.forEach((measure, measureIndex) => {
        html += renderMeasure(measure, measureIndex, staffIndex);
    });

    html += `
                </div>
            </div>
        </div>
    `;

    return html;
}

function renderMeasure(measure, measureIndex, staffIndex) {
    const isFirst = measureIndex === 0;
    const timeSig = ScoreState.score.metadata.timeSignature;
    const keySig = ScoreState.score.metadata.keySignature;

    let html = `
        <div class="measure" data-measure-index="${measureIndex}" data-staff-index="${staffIndex}">
            <div class="measure-number">${measure.measureNumber}</div>
            ${isFirst ? `<div class="key-signature">${renderKeySignature(keySig)}</div>` : ''}
            ${isFirst ? `<div class="time-signature">${renderTimeSignature(timeSig)}</div>` : ''}
            <div class="measure-notes">
    `;

    measure.notes.forEach((note, noteIndex) => {
        if (note.type === 'note') {
            html += renderNote(note, noteIndex, measureIndex, staffIndex);
        } else if (note.type === 'rest') {
            html += renderRest(note, noteIndex, measureIndex, staffIndex);
        }
    });

    const barLine = BarLineTypes[measure.barLine] || BarLineTypes.single;
    html += `
            </div>
            <div class="bar-line bar-line-${measure.barLine}">${barLine.symbol}</div>
        </div>
    `;

    return html;
}

function renderNote(note, noteIndex, measureIndex, staffIndex) {
    const duration = NoteDurations[note.duration] || NoteDurations.quarter;
    const selected = note.selected ? 'selected' : '';
    const dot = note.dot ? 'dotted' : '';

    const yPos = getNoteYPosition(note.pitch, note.octave);

    return `
        <div class="note-item ${selected} ${dot}" 
             data-note-id="${note.id}"
             data-note-index="${noteIndex}"
             data-measure-index="${measureIndex}"
             data-staff-index="${staffIndex}"
             style="left: ${note.x}px; top: ${yPos}px;">
            <div class="note-head">
                ${note.accidental ? `<span class="accidental">${getAccidentalSymbol(note.accidental)}</span>` : ''}
                ${duration.symbol}
            </div>
            ${note.duration !== 'whole' && note.duration !== 'half' ? '<div class="note-stem"></div>' : ''}
            ${note.dot ? '<div class="note-dot">•</div>' : ''}
            ${note.dynamics ? `<div class="note-dynamics">${note.dynamics}</div>` : ''}
        </div>
    `;
}

function renderRest(rest, restIndex, measureIndex, staffIndex) {
    const duration = NoteDurations[rest.duration] || NoteDurations.quarter;
    const selected = rest.selected ? 'selected' : '';

    return `
        <div class="rest-item ${selected}"
             data-note-id="${rest.id}"
             data-note-index="${restIndex}"
             data-measure-index="${measureIndex}"
             data-staff-index="${staffIndex}"
             style="left: ${rest.x}px;">
            <div class="rest-symbol">${getRestSymbol(rest.duration)}</div>
        </div>
    `;
}

function getNoteYPosition(pitch, octave) {
    const baseY = 100;
    const lineHeight = 8;

    const pitchOffsets = {
        'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6
    };

    const octaveOffset = (octave - 4) * 7;
    const pitchOffset = pitchOffsets[pitch] || 0;

    return baseY - (octaveOffset + pitchOffset) * (lineHeight / 2);
}

function getAccidentalSymbol(accidental) {
    const symbols = {
        'sharp': '♯',
        'flat': '♭',
        'natural': '♮',
        'double-sharp': '𝄪',
        'double-flat': '𝄫'
    };
    return symbols[accidental] || '';
}

function getRestSymbol(duration) {
    const symbols = {
        whole: '𝅝',
        half: '𝅗𝅥',
        quarter: '𝅘𝅥',
        eighth: '𝅘𝅥𝅮',
        sixteenth: '𝅘𝅥𝅯',
        thirtysecond: '𝅘𝅥𝅰'
    };
    return symbols[duration] || '𝅘𝅥';
}

function renderKeySignature(keySig) {
    const sig = KeySignatures[keySig];
    if (!sig) return '';

    let html = '';
    if (sig.sharps > 0) {
        for (let i = 0; i < sig.sharps; i++) {
            html += '<span class="key-accidental sharp">♯</span>';
        }
    } else if (sig.flats > 0) {
        for (let i = 0; i < sig.flats; i++) {
            html += '<span class="key-accidental flat">♭</span>';
        }
    }
    return html;
}

function renderTimeSignature(timeSig) {
    const sig = TimeSignatures[timeSig];
    if (!sig) return '4/4';
    return `<div class="time-sig-top">${sig.beats}</div><div class="time-sig-bottom">${sig.beatType}</div>`;
}

function setupScoreEventListeners() {
    const container = document.getElementById('score-editor');
    if (!container) return;

    container.addEventListener('click', (e) => {
        const noteEl = e.target.closest('.note-item, .rest-item');
        if (noteEl) {
            const noteId = noteEl.dataset.noteId;
            selectNoteById(noteId);
            renderScore();
        }
    });

    const noteToolBtns = document.querySelectorAll('.note-tool-btn');
    noteToolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            ScoreUI.currentTool = btn.dataset.tool || 'select';
            if (btn.dataset.duration) {
                ScoreUI.noteDuration = btn.dataset.duration;
            }
            updateScoreToolbar();
        });
    });

    const addNoteBtn = document.getElementById('btn-add-note');
    if (addNoteBtn) {
        addNoteBtn.addEventListener('click', () => {
            addSampleNote();
        });
    }

    const deleteNoteBtn = document.getElementById('btn-delete-note');
    if (deleteNoteBtn) {
        deleteNoteBtn.addEventListener('click', () => {
            deleteSelectedNote();
        });
    }
}

function updateScoreToolbar() {
    document.querySelectorAll('.note-tool-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tool === ScoreUI.currentTool ||
            (btn.dataset.duration && btn.dataset.duration === ScoreUI.noteDuration)) {
            btn.classList.add('active');
        }
    });
}

function selectNoteById(noteId) {
    clearSelection();
    const found = findNoteById(noteId);
    if (found) {
        found.note.selected = true;
        ScoreState.score.selectedItem = noteId;
        ScoreUI.selectedNote = found.note;
    }
}

function addSampleNote() {
    if (!ScoreState.score || ScoreState.score.staves.length === 0) return;

    const staffIndex = 0;
    const measureIndex = 0;
    const staff = ScoreState.score.staves[staffIndex];
    const measure = staff.measures[measureIndex];

    const pitches = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const randomPitch = pitches[Math.floor(Math.random() * pitches.length)];
    const xPos = measure.notes.length * 60 + 80;

    const note = createNote(randomPitch, ScoreUI.noteDuration, {
        x: xPos,
        octave: 4 + Math.floor(Math.random() * 2)
    });

    addNote(staffIndex, measureIndex, note);
    renderScore();
}

function deleteSelectedNote() {
    if (!ScoreUI.selectedNote) return;

    const found = findNoteById(ScoreUI.selectedNote.id);
    if (found) {
        removeNote(found.staffIndex, found.measureIndex, found.note.id);
        ScoreUI.selectedNote = null;
        renderScore();
    }
}

function startAutoSave() {
    setInterval(() => {
        if (ScoreState.isDirty) {
            autoSaveScore();
            ScoreState.isDirty = false;
        }
    }, ScoreStorage.autoSaveInterval);
}

function handleSaveScore() {
    if (!ScoreState.score) return;

    showSaveFileDialog(ScoreState.score)
        .then(fileName => {
            showToast(`乐谱已保存: ${fileName}`);
        })
        .catch(err => {
            if (err.message !== '用户取消') {
                showToast('保存失败: ' + err.message, 'error');
            }
        });
}

function handleLoadScore() {
    showLoadFileDialog()
        .then(result => {
            ScoreStorage.currentFileName = result.fileName;
            ScoreState.fileName = result.fileName;

            let message = `乐谱已加载: ${result.fileName}`;
            if (result.repaired) {
                message += ' (文件已自动修复)';
            }
            if (result.warnings && result.warnings.length > 0) {
                message += `\n警告: ${result.warnings.length} 项`;
            }

            renderScore();
            showToast(message, result.repaired ? 'warning' : 'success');

            if (result.warnings && result.warnings.length > 0) {
                console.warn('加载警告:', result.warnings);
            }
        })
        .catch(err => {
            showToast('加载失败: ' + err.message, 'error');
        });
}

function handleNewScore() {
    if (ScoreState.isDirty && !confirm('当前乐谱有未保存的更改，确定要新建吗？')) {
        return;
    }

    initScoreState();
    ScoreStorage.currentFileName = null;
    renderScore();
    clearAutoSave();
    showToast('已创建新乐谱');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

function checkAutoSaveOnLoad() {
    if (hasAutoSave()) {
        if (confirm('检测到未保存的自动保存文件，是否恢复？')) {
            const result = loadAutoSave();
            if (result) {
                renderScore();
                showToast('已从自动保存恢复', 'warning');
            }
        } else {
            clearAutoSave();
        }
    }
}

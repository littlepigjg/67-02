const ScoreState = {
    score: null,
    history: [],
    historyIndex: -1,
    maxHistory: 50,
    isDirty: false,
    fileName: null,
    filePath: null
};

function initScoreState() {
    ScoreState.score = createScore({
        title: '新乐谱',
        keySignature: 'C',
        timeSignature: '4/4',
        tempo: 120
    });

    const staff = createStaff({
        name: '钢琴',
        clef: 'treble',
        instrument: 'piano'
    });

    for (let i = 0; i < 4; i++) {
        const measure = createMeasure(i + 1, {
            barLine: i === 3 ? 'final' : 'single'
        });
        staff.measures.push(measure);
    }

    ScoreState.score.staves.push(staff);
    ScoreState.history = [];
    ScoreState.historyIndex = -1;
    ScoreState.isDirty = false;
    ScoreState.fileName = null;
    ScoreState.filePath = null;

    saveHistory();
}

function saveHistory() {
    const snapshot = JSON.parse(JSON.stringify(ScoreState.score));

    if (ScoreState.historyIndex < ScoreState.history.length - 1) {
        ScoreState.history = ScoreState.history.slice(0, ScoreState.historyIndex + 1);
    }

    ScoreState.history.push(snapshot);

    if (ScoreState.history.length > ScoreState.maxHistory) {
        ScoreState.history.shift();
    } else {
        ScoreState.historyIndex++;
    }

    ScoreState.isDirty = true;
}

function undo() {
    if (ScoreState.historyIndex > 0) {
        ScoreState.historyIndex--;
        ScoreState.score = JSON.parse(JSON.stringify(ScoreState.history[ScoreState.historyIndex]));
        ScoreState.isDirty = true;
        return true;
    }
    return false;
}

function redo() {
    if (ScoreState.historyIndex < ScoreState.history.length - 1) {
        ScoreState.historyIndex++;
        ScoreState.score = JSON.parse(JSON.stringify(ScoreState.history[ScoreState.historyIndex]));
        ScoreState.isDirty = true;
        return true;
    }
    return false;
}

function canUndo() {
    return ScoreState.historyIndex > 0;
}

function canRedo() {
    return ScoreState.historyIndex < ScoreState.history.length - 1;
}

function addNote(staffIndex, measureIndex, note) {
    const staff = ScoreState.score.staves[staffIndex];
    if (!staff) return null;

    const measure = staff.measures[measureIndex];
    if (!measure) return null;

    const newNote = createNote(note.pitch, note.duration, note);
    measure.notes.push(newNote);
    reorderMeasureNotes(measure);
    saveHistory();

    return newNote;
}

function addRest(staffIndex, measureIndex, rest) {
    const staff = ScoreState.score.staves[staffIndex];
    if (!staff) return null;

    const measure = staff.measures[measureIndex];
    if (!measure) return null;

    const newRest = createRest(rest.duration, rest);
    measure.notes.push(newRest);
    reorderMeasureNotes(measure);
    saveHistory();

    return newRest;
}

function removeNote(staffIndex, measureIndex, noteId) {
    const staff = ScoreState.score.staves[staffIndex];
    if (!staff) return false;

    const measure = staff.measures[measureIndex];
    if (!measure) return false;

    const initialLength = measure.notes.length;
    measure.notes = measure.notes.filter(n => n.id !== noteId);

    if (measure.notes.length < initialLength) {
        saveHistory();
        return true;
    }
    return false;
}

function updateNote(staffIndex, measureIndex, noteId, updates) {
    const staff = ScoreState.score.staves[staffIndex];
    if (!staff) return null;

    const measure = staff.measures[measureIndex];
    if (!measure) return null;

    const note = measure.notes.find(n => n.id === noteId);
    if (!note) return null;

    Object.assign(note, updates);
    saveHistory();

    return note;
}

function reorderMeasureNotes(measure) {
    measure.notes.sort((a, b) => a.x - b.x);
}

function addMeasure(staffIndex, position = -1) {
    const staff = ScoreState.score.staves[staffIndex];
    if (!staff) return null;

    const measureNumber = position >= 0 ? position + 1 : staff.measures.length + 1;
    const newMeasure = createMeasure(measureNumber);

    if (position >= 0 && position < staff.measures.length) {
        staff.measures.splice(position, 0, newMeasure);
        for (let i = position; i < staff.measures.length; i++) {
            staff.measures[i].measureNumber = i + 1;
        }
    } else {
        staff.measures.push(newMeasure);
    }

    saveHistory();
    return newMeasure;
}

function removeMeasure(staffIndex, measureIndex) {
    const staff = ScoreState.score.staves[staffIndex];
    if (!staff || staff.measures.length <= 1) return false;

    staff.measures.splice(measureIndex, 1);
    for (let i = measureIndex; i < staff.measures.length; i++) {
        staff.measures[i].measureNumber = i + 1;
    }

    saveHistory();
    return true;
}

function updateMetadata(updates) {
    if (!ScoreState.score) return;

    if (updates.metadata) {
        Object.assign(ScoreState.score.metadata, updates.metadata);
    }
    if (updates.title !== undefined) ScoreState.score.title = updates.title;
    if (updates.composer !== undefined) ScoreState.score.composer = updates.composer;
    if (updates.artist !== undefined) ScoreState.score.artist = updates.artist;

    ScoreState.score.updatedAt = new Date().toISOString();
    saveHistory();
}

function setKeySignature(keySig) {
    if (!KeySignatures[keySig]) return false;
    updateMetadata({ metadata: { keySignature: keySig } });
    return true;
}

function setTimeSignature(timeSig) {
    if (!TimeSignatures[timeSig]) return false;
    updateMetadata({ metadata: { timeSignature: timeSig } });
    return true;
}

function setTempo(tempo) {
    const t = parseInt(tempo, 10);
    if (isNaN(t) || t < 20 || t > 300) return false;
    updateMetadata({ metadata: { tempo: t } });
    return true;
}

function getTotalDuration(measure) {
    let total = 0;
    measure.notes.forEach(note => {
        const duration = NoteDurations[note.duration]?.value || 1;
        const dotMultiplier = note.dot ? 1.5 : 1;
        total += duration * dotMultiplier;
    });
    return total;
}

function getMeasureBeats() {
    const timeSig = ScoreState.score?.metadata?.timeSignature || '4/4';
    const sig = TimeSignatures[timeSig];
    return sig ? sig.beats : 4;
}

function addStaff(options = {}) {
    const staff = createStaff(options);

    const measureCount = ScoreState.score.staves[0]?.measures.length || 4;
    for (let i = 0; i < measureCount; i++) {
        staff.measures.push(createMeasure(i + 1, {
            barLine: i === measureCount - 1 ? 'final' : 'single'
        }));
    }

    ScoreState.score.staves.push(staff);
    saveHistory();
    return staff;
}

function removeStaff(staffIndex) {
    if (ScoreState.score.staves.length <= 1) return false;
    ScoreState.score.staves.splice(staffIndex, 1);
    saveHistory();
    return true;
}

function selectItem(item) {
    ScoreState.score.selectedItem = item ? item.id : null;
}

function clearSelection() {
    ScoreState.score.selectedItem = null;

    ScoreState.score.staves.forEach(staff => {
        staff.measures.forEach(measure => {
            measure.notes.forEach(note => {
                note.selected = false;
            });
        });
    });
}

function findNoteById(noteId) {
    for (let s = 0; s < ScoreState.score.staves.length; s++) {
        const staff = ScoreState.score.staves[s];
        for (let m = 0; m < staff.measures.length; m++) {
            const measure = staff.measures[m];
            const note = measure.notes.find(n => n.id === noteId);
            if (note) {
                return { staffIndex: s, measureIndex: m, note };
            }
        }
    }
    return null;
}

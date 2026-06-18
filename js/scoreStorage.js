const ScoreStorage = {
    currentFileName: null,
    currentFilePath: null,
    autoSaveKey: 'score_autosave',
    autoSaveInterval: 30000
};

function serializeScore(score) {
    const data = JSON.parse(JSON.stringify(score));
    data.updatedAt = new Date().toISOString();
    data.version = ScoreVersion;
    return data;
}

function serializeScoreToJSON(score) {
    const data = serializeScore(score);
    return JSON.stringify(data, null, 2);
}

function validateScoreStructure(data) {
    const errors = [];
    const warnings = [];

    if (!data || typeof data !== 'object') {
        errors.push('数据不是有效的JSON对象');
        return { valid: false, errors, warnings };
    }

    if (!data.version) {
        warnings.push('缺少版本号，可能是旧版本文件');
    }

    if (!data.metadata) {
        warnings.push('缺少元数据，将使用默认值');
    } else {
        if (!data.metadata.keySignature) {
            warnings.push('缺少调号，将使用默认C大调');
        } else if (!KeySignatures[data.metadata.keySignature]) {
            warnings.push(`未知的调号: ${data.metadata.keySignature}，将使用默认C大调`);
        }
        if (!data.metadata.timeSignature) {
            warnings.push('缺少拍号，将使用默认4/4拍');
        } else if (!TimeSignatures[data.metadata.timeSignature]) {
            warnings.push(`未知的拍号: ${data.metadata.timeSignature}，将使用默认4/4拍`);
        }
        if (data.metadata.tempo !== undefined) {
            const tempo = parseInt(data.metadata.tempo, 10);
            if (isNaN(tempo) || tempo < 20 || tempo > 300) {
                warnings.push(`速度值异常: ${data.metadata.tempo}，将使用默认120`);
            }
        }
    }

    if (!data.staves || !Array.isArray(data.staves) || data.staves.length === 0) {
        warnings.push('缺少谱表数据，将创建空谱表');
    } else {
        data.staves.forEach((staff, staffIndex) => {
            if (!staff.id) {
                warnings.push(`谱表 ${staffIndex} 缺少ID，将自动生成`);
            }
            if (!staff.clef || !Clefs[staff.clef]) {
                warnings.push(`谱表 ${staffIndex} 缺少或有无效的谱号，将使用高音谱号`);
            }
            if (!staff.measures || !Array.isArray(staff.measures)) {
                warnings.push(`谱表 ${staffIndex} 缺少小节数据，将创建空小节`);
            } else {
                staff.measures.forEach((measure, measureIndex) => {
                    if (measure.notes && Array.isArray(measure.notes)) {
                        measure.notes.forEach((note, noteIndex) => {
                            if (!note.id) {
                                warnings.push(`谱表${staffIndex} 小节${measureIndex} 音符${noteIndex} 缺少ID`);
                            }
                            if (!note.type) {
                                warnings.push(`谱表${staffIndex} 小节${measureIndex} 音符${noteIndex} 缺少类型`);
                            }
                            if (note.type === 'note') {
                                if (!note.pitch) {
                                    warnings.push(`谱表${staffIndex} 小节${measureIndex} 音符${noteIndex} 缺少音高`);
                                }
                                if (!note.duration || !NoteDurations[note.duration]) {
                                    warnings.push(`谱表${staffIndex} 小节${measureIndex} 音符${noteIndex} 缺少或有无效的时值`);
                                }
                            }
                        });
                    }
                });
            }
        });
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        hasWarnings: warnings.length > 0
    };
}

function migrateScoreVersion(data) {
    const fileVersion = data.version || '0.0.0';
    const result = { ...data };

    if (!data.version) {
        result.version = ScoreVersion;
        if (!result.metadata) {
            result.metadata = {
                keySignature: 'C',
                timeSignature: '4/4',
                tempo: 120,
                dynamics: 'mf'
            };
        }
        if (!result.title) result.title = '未命名乐谱';
        if (!result.createdAt) result.createdAt = new Date().toISOString();
        if (!result.updatedAt) result.updatedAt = new Date().toISOString();
        if (!result.staves) result.staves = [];
    }

    return result;
}

function repairScoreData(data) {
    const result = JSON.parse(JSON.stringify(data));

    if (!result.metadata) {
        result.metadata = {};
    }
    if (!result.metadata.keySignature || !KeySignatures[result.metadata.keySignature]) {
        result.metadata.keySignature = 'C';
    }
    if (!result.metadata.timeSignature || !TimeSignatures[result.metadata.timeSignature]) {
        result.metadata.timeSignature = '4/4';
    }
    if (!result.metadata.tempo || isNaN(parseInt(result.metadata.tempo, 10))) {
        result.metadata.tempo = 120;
    } else {
        result.metadata.tempo = Math.max(20, Math.min(300, parseInt(result.metadata.tempo, 10)));
    }
    if (!result.metadata.dynamics || !Dynamics[result.metadata.dynamics]) {
        result.metadata.dynamics = 'mf';
    }

    if (!result.staves || !Array.isArray(result.staves)) {
        result.staves = [];
    }

    result.staves = result.staves.filter(staff => staff && typeof staff === 'object');

    result.staves.forEach((staff, staffIndex) => {
        if (!staff.id) {
            staff.id = 'staff_repaired_' + staffIndex + '_' + Date.now();
        }
        if (!staff.name) staff.name = 'Staff ' + (staffIndex + 1);
        if (!staff.clef || !Clefs[staff.clef]) staff.clef = 'treble';
        if (!staff.instrument) staff.instrument = 'piano';

        if (!staff.measures || !Array.isArray(staff.measures)) {
            staff.measures = [];
        }

        staff.measures = staff.measures.filter(m => m && typeof m === 'object');

        if (staff.measures.length === 0) {
            const measure = createMeasure(1);
            staff.measures.push(measure);
        }

        staff.measures.forEach((measure, measureIndex) => {
            if (!measure.id) {
                measure.id = 'measure_repaired_' + staffIndex + '_' + measureIndex + '_' + Date.now();
            }
            if (!measure.measureNumber) measure.measureNumber = measureIndex + 1;
            if (!measure.barLine || !BarLineTypes[measure.barLine]) {
                measure.barLine = measureIndex === staff.measures.length - 1 ? 'final' : 'single';
            }
            if (!measure.notes || !Array.isArray(measure.notes)) {
                measure.notes = [];
            }

            measure.notes = measure.notes.filter(n => n && typeof n === 'object');

            measure.notes.forEach((note, noteIndex) => {
                if (!note.id) {
                    note.id = 'note_repaired_' + staffIndex + '_' + measureIndex + '_' + noteIndex + '_' + Date.now();
                }
                if (!note.type) note.type = 'note';
                if (note.type === 'note') {
                    if (!note.pitch) note.pitch = 'C';
                    if (note.octave === undefined || note.octave === null) note.octave = 4;
                    if (!note.duration || !NoteDurations[note.duration]) note.duration = 'quarter';
                    if (note.velocity === undefined || note.velocity === null) note.velocity = 80;
                    if (note.voice === undefined || note.voice === null) note.voice = 0;
                    if (note.x === undefined || note.x === null) note.x = 0;
                    if (note.y === undefined || note.y === null) note.y = 0;
                } else if (note.type === 'rest') {
                    if (!note.duration || !NoteDurations[note.duration]) note.duration = 'quarter';
                    if (note.x === undefined || note.x === null) note.x = 0;
                    if (note.y === undefined || note.y === null) note.y = 0;
                }
                if (note.selected === undefined) note.selected = false;
            });

            measure.notes.sort((a, b) => a.x - b.x);
        });
    });

    if (result.staves.length === 0) {
        const staff = createStaff();
        staff.measures.push(createMeasure(1));
        result.staves.push(staff);
    }

    if (!result.version) result.version = ScoreVersion;
    if (!result.title) result.title = '未命名乐谱';
    if (!result.createdAt) result.createdAt = new Date().toISOString();
    if (!result.updatedAt) result.updatedAt = new Date().toISOString();
    if (result.selectedItem === undefined) result.selectedItem = null;
    if (result.currentMeasure === undefined) result.currentMeasure = 0;
    if (result.playbackPosition === undefined) result.playbackPosition = 0;
    if (result.isPlaying === undefined) result.isPlaying = false;

    return result;
}

function deserializeScore(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        return deserializeScoreFromData(data);
    } catch (error) {
        throw new Error('JSON解析失败: ' + error.message);
    }
}

function deserializeScoreFromData(data) {
    const migrated = migrateScoreVersion(data);
    const validation = validateScoreStructure(migrated);

    if (!validation.valid) {
        throw new Error('乐谱数据验证失败: ' + validation.errors.join('; '));
    }

    let score = migrated;
    let repaired = false;

    if (validation.hasWarnings) {
        score = repairScoreData(migrated);
        repaired = true;
    }

    return {
        score,
        valid: true,
        warnings: validation.warnings,
        repaired,
        version: score.version
    };
}

function saveScoreToFile(score, fileName) {
    const jsonString = serializeScoreToJSON(score);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    let downloadName = fileName || score.title || 'untitled';
    if (!downloadName.toLowerCase().endsWith('.json')) {
        downloadName += '.json';
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    ScoreStorage.currentFileName = downloadName;
    ScoreState.fileName = downloadName;
    ScoreState.isDirty = false;

    return downloadName;
}

function showSaveFileDialog(score) {
    return new Promise((resolve, reject) => {
        const defaultName = (score.title || '乐谱') + '.json';

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>保存乐谱</h2>
                <input type="text" id="save-filename-input" placeholder="输入文件名" value="${defaultName.replace('.json', '')}">
                <p class="hint">文件将自动保存为 .json 格式</p>
                <div class="modal-buttons">
                    <button class="btn btn-danger" id="save-cancel-btn">取消</button>
                    <button class="btn btn-primary" id="save-confirm-btn">保存</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        const input = modal.querySelector('#save-filename-input');
        input.focus();
        input.select();

        modal.querySelector('#save-cancel-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
            reject(new Error('用户取消'));
        });

        modal.querySelector('#save-confirm-btn').addEventListener('click', () => {
            let fileName = input.value.trim() || 'untitled';
            if (!fileName.toLowerCase().endsWith('.json')) {
                fileName += '.json';
            }
            document.body.removeChild(modal);

            try {
                const savedName = saveScoreToFile(score, fileName);
                resolve(savedName);
            } catch (err) {
                reject(err);
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                modal.querySelector('#save-confirm-btn').click();
            } else if (e.key === 'Escape') {
                modal.querySelector('#save-cancel-btn').click();
            }
        });
    });
}

function showLoadFileDialog() {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.style.display = 'none';
        document.body.appendChild(input);

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            document.body.removeChild(input);

            if (!file) {
                reject(new Error('未选择文件'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const result = loadScoreFromString(ev.target.result);
                    result.fileName = file.name;
                    resolve(result);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => {
                reject(new Error('文件读取失败'));
            };
            reader.readAsText(file);
        });

        input.click();
    });
}

function loadScoreFromString(jsonString) {
    const result = deserializeScore(jsonString);

    ScoreState.score = result.score;
    ScoreState.history = [JSON.parse(JSON.stringify(result.score))];
    ScoreState.historyIndex = 0;
    ScoreState.isDirty = false;

    return result;
}

function loadScoreFromData(data) {
    const result = deserializeScoreFromData(data);

    ScoreState.score = result.score;
    ScoreState.history = [JSON.parse(JSON.stringify(result.score))];
    ScoreState.historyIndex = 0;
    ScoreState.isDirty = false;

    return result;
}

function autoSaveScore() {
    if (!ScoreState.score) return;
    try {
        const data = serializeScore(ScoreState.score);
        localStorage.setItem(ScoreStorage.autoSaveKey, JSON.stringify(data));
    } catch (e) {
        console.warn('自动保存失败:', e);
    }
}

function loadAutoSave() {
    try {
        const saved = localStorage.getItem(ScoreStorage.autoSaveKey);
        if (!saved) return null;

        const result = deserializeScore(saved);
        return result;
    } catch (e) {
        console.warn('加载自动保存失败:', e);
        return null;
    }
}

function clearAutoSave() {
    try {
        localStorage.removeItem(ScoreStorage.autoSaveKey);
    } catch (e) {
        console.warn('清除自动保存失败:', e);
    }
}

function hasAutoSave() {
    try {
        return !!localStorage.getItem(ScoreStorage.autoSaveKey);
    } catch (e) {
        return false;
    }
}

function exportScoreAsJSON(score) {
    return serializeScoreToJSON(score);
}

function validateAndRepairScore(data) {
    let scoreData = data;

    try {
        if (typeof data === 'string') {
            scoreData = JSON.parse(data);
        }
    } catch (e) {
        return {
            valid: false,
            repairable: false,
            errors: ['JSON格式错误: ' + e.message],
            score: null
        };
    }

    const validation = validateScoreStructure(scoreData);

    if (validation.valid && !validation.hasWarnings) {
        return {
            valid: true,
            repairable: true,
            errors: [],
            warnings: validation.warnings,
            score: scoreData
        };
    }

    try {
        const repaired = repairScoreData(scoreData);
        return {
            valid: false,
            repairable: true,
            errors: validation.errors,
            warnings: validation.warnings,
            score: repaired
        };
    } catch (e) {
        return {
            valid: false,
            repairable: false,
            errors: [...validation.errors, '修复失败: ' + e.message],
            score: null
        };
    }
}

function getScoreInfo(score) {
    let noteCount = 0;
    let measureCount = 0;
    let staffCount = score.staves ? score.staves.length : 0;

    if (score.staves) {
        score.staves.forEach(staff => {
            if (staff.measures) {
                measureCount += staff.measures.length;
                staff.measures.forEach(measure => {
                    if (measure.notes) {
                        noteCount += measure.notes.filter(n => n.type === 'note').length;
                    }
                });
            }
        });
    }

    return {
        title: score.title || '未命名',
        version: score.version || 'unknown',
        composer: score.composer || '',
        createdAt: score.createdAt || '',
        updatedAt: score.updatedAt || '',
        staffCount,
        measureCount,
        noteCount,
        keySignature: score.metadata?.keySignature || 'C',
        timeSignature: score.metadata?.timeSignature || '4/4',
        tempo: score.metadata?.tempo || 120
    };
}

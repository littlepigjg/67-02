const ScoreVersion = '1.0.0';

const KeySignatures = {
    'C': { name: 'C大调', sharps: 0, flats: 0, mode: 'major' },
    'G': { name: 'G大调', sharps: 1, flats: 0, mode: 'major' },
    'D': { name: 'D大调', sharps: 2, flats: 0, mode: 'major' },
    'A': { name: 'A大调', sharps: 3, flats: 0, mode: 'major' },
    'E': { name: 'E大调', sharps: 4, flats: 0, mode: 'major' },
    'B': { name: 'B大调', sharps: 5, flats: 0, mode: 'major' },
    'F#': { name: 'F#大调', sharps: 6, flats: 0, mode: 'major' },
    'C#': { name: 'C#大调', sharps: 7, flats: 0, mode: 'major' },
    'F': { name: 'F大调', sharps: 0, flats: 1, mode: 'major' },
    'Bb': { name: 'Bb大调', sharps: 0, flats: 2, mode: 'major' },
    'Eb': { name: 'Eb大调', sharps: 0, flats: 3, mode: 'major' },
    'Ab': { name: 'Ab大调', sharps: 0, flats: 4, mode: 'major' },
    'Db': { name: 'Db大调', sharps: 0, flats: 5, mode: 'major' },
    'Gb': { name: 'Gb大调', sharps: 0, flats: 6, mode: 'major' },
    'Cb': { name: 'Cb大调', sharps: 0, flats: 7, mode: 'major' },
    'Am': { name: 'A小调', sharps: 0, flats: 0, mode: 'minor' },
    'Em': { name: 'E小调', sharps: 1, flats: 0, mode: 'minor' },
    'Bm': { name: 'B小调', sharps: 2, flats: 0, mode: 'minor' },
    'F#m': { name: 'F#小调', sharps: 3, flats: 0, mode: 'minor' },
    'C#m': { name: 'C#小调', sharps: 4, flats: 0, mode: 'minor' },
    'G#m': { name: 'G#小调', sharps: 5, flats: 0, mode: 'minor' },
    'D#m': { name: 'D#小调', sharps: 6, flats: 0, mode: 'minor' },
    'A#m': { name: 'A#小调', sharps: 7, flats: 0, mode: 'minor' },
    'Dm': { name: 'D小调', sharps: 0, flats: 1, mode: 'minor' },
    'Gm': { name: 'G小调', sharps: 0, flats: 2, mode: 'minor' },
    'Cm': { name: 'C小调', sharps: 0, flats: 3, mode: 'minor' },
    'Fm': { name: 'F小调', sharps: 0, flats: 4, mode: 'minor' },
    'Bbm': { name: 'Bb小调', sharps: 0, flats: 5, mode: 'minor' },
    'Ebm': { name: 'Eb小调', sharps: 0, flats: 6, mode: 'minor' },
    'Abm': { name: 'Ab小调', sharps: 0, flats: 7, mode: 'minor' }
};

const TimeSignatures = {
    '4/4': { beats: 4, beatType: 4, name: '4/4拍' },
    '3/4': { beats: 3, beatType: 4, name: '3/4拍' },
    '2/4': { beats: 2, beatType: 4, name: '2/4拍' },
    '6/8': { beats: 6, beatType: 8, name: '6/8拍' },
    '3/8': { beats: 3, beatType: 8, name: '3/8拍' },
    '9/8': { beats: 9, beatType: 8, name: '9/8拍' },
    '5/4': { beats: 5, beatType: 4, name: '5/4拍' },
    '7/8': { beats: 7, beatType: 8, name: '7/8拍' }
};

const NoteDurations = {
    whole: { value: 4, name: '全音符', symbol: '𝅝' },
    half: { value: 2, name: '二分音符', symbol: '𝅗𝅥' },
    quarter: { value: 1, name: '四分音符', symbol: '𝅘𝅥' },
    eighth: { value: 0.5, name: '八分音符', symbol: '𝅘𝅥𝅮' },
    sixteenth: { value: 0.25, name: '十六分音符', symbol: '𝅘𝅥𝅯' },
    thirtysecond: { value: 0.125, name: '三十二分音符', symbol: '𝅘𝅥𝅰' }
};

const BarLineTypes = {
    single: { name: '单竖线', symbol: '|' },
    double: { name: '双竖线', symbol: '||' },
    repeatStart: { name: '反复开始', symbol: '|:' },
    repeatEnd: { name: '反复结束', symbol: ':|' },
    final: { name: '终止线', symbol: '|]' }
};

const Clefs = {
    treble: { name: '高音谱号', symbol: '𝄞', line: 2 },
    bass: { name: '低音谱号', symbol: '𝄢', line: 4 },
    alto: { name: '中音谱号', symbol: '𝄡', line: 3 },
    tenor: { name: '次中音谱号', symbol: '𝄡', line: 4 }
};

const Dynamics = {
    ppp: { name: '极弱', value: 1 },
    pp: { name: '很弱', value: 2 },
    p: { name: '弱', value: 3 },
    mp: { name: '中弱', value: 4 },
    mf: { name: '中强', value: 5 },
    f: { name: '强', value: 6 },
    ff: { name: '很强', value: 7 },
    fff: { name: '极强', value: 8 }
};

function createNote(pitch, duration, options = {}) {
    return {
        id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        type: 'note',
        pitch: pitch,
        duration: duration,
        octave: options.octave || 4,
        accidental: options.accidental || null,
        dot: options.dot || false,
        tie: options.tie || false,
        dynamics: options.dynamics || null,
        articulation: options.articulation || null,
        velocity: options.velocity || 80,
        x: options.x || 0,
        y: options.y || 0,
        voice: options.voice || 0,
        selected: false
    };
}

function createRest(duration, options = {}) {
    return {
        id: 'rest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        type: 'rest',
        duration: duration,
        dot: options.dot || false,
        x: options.x || 0,
        y: options.y || 0,
        voice: options.voice || 0,
        selected: false
    };
}

function createBarLine(barLineType = 'single', options = {}) {
    return {
        id: 'barline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        type: 'barline',
        barLineType: barLineType,
        x: options.x || 0,
        selected: false
    };
}

function createMeasure(measureNumber, options = {}) {
    return {
        id: 'measure_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        measureNumber: measureNumber,
        notes: [],
        barLine: options.barLine || 'single',
        timeSignature: options.timeSignature || null,
        keySignature: options.keySignature || null,
        tempo: options.tempo || null,
        dynamic: options.dynamic || null
    };
}

function createStaff(options = {}) {
    return {
        id: 'staff_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        name: options.name || 'Staff',
        clef: options.clef || 'treble',
        measures: [],
        instrument: options.instrument || 'piano'
    };
}

function createScore(options = {}) {
    return {
        version: ScoreVersion,
        title: options.title || 'Untitled',
        composer: options.composer || '',
        artist: options.artist || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
            keySignature: options.keySignature || 'C',
            timeSignature: options.timeSignature || '4/4',
            tempo: options.tempo || 120,
            dynamics: options.dynamics || 'mf'
        },
        staves: [],
        selectedItem: null,
        currentMeasure: 0,
        playbackPosition: 0,
        isPlaying: false
    };
}

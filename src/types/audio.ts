/**
 * 音声関連の型定義
 */

// 波形の種類
export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle';

// 音符データ
export interface AudioNote {
    frequency: number;      // 周波数（Hz）
    duration: number;       // 長さ（秒）
    waveform: WaveformType; // 波形
    timestamp: number;      // 再生タイミング（ミリ秒）
}

// 録音された音符（判定情報付き）
export interface RecordedNote extends AudioNote {
    judgment: JudgmentType; // 判定結果
    effects: AudioEffects;  // 適用されたエフェクト
}

// オーディオエフェクト
export interface AudioEffects {
    waveform: WaveformType;
    volume: number;         // 0.0 ~ 1.0
    reverb: number;         // 0.0 ~ 1.0
    detune: number;         // セント単位（-100 ~ 100）
    filterFreq: number;     // フィルター周波数（Hz）
}

// 判定タイプ
export type JudgmentType = 'perfect' | 'good' | 'bad' | 'miss';

// 判定結果
export interface Judgment {
    type: JudgmentType;
    score: number;
    combo: boolean;         // コンボが続くか
    message: string;
    color: string;
    timing: number;         // タイミングのズレ（ミリ秒）
}

// 音階データ
export interface MusicNote {
    name: string;           // 音名（例: 'C', 'D#'）
    frequency: number;      // 周波数
    octave: number;         // オクターブ
}

// 音階定義（A4 = 440Hz を基準）
export const NOTES: Record<string, number> = {
    'C': 261.63,
    'C#': 277.18,
    'D': 293.66,
    'D#': 311.13,
    'E': 329.63,
    'F': 349.23,
    'F#': 369.99,
    'G': 392.00,
    'G#': 415.30,
    'A': 440.00,
    'A#': 466.16,
    'B': 493.88,
};

// 音階を周波数に変換する関数
export function noteToFrequency(note: string, octave: number = 4): number {
    const baseFreq = NOTES[note];
    if (!baseFreq) {
        throw new Error(`Invalid note: ${note}`);
    }
    // オクターブごとに周波数は2倍になる
    return baseFreq * Math.pow(2, octave - 4);
}


/**
 * ゲーム関連の型定義
 */

// 難易度
export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert';

// 難易度設定
export interface DifficultyConfig {
    noteSpeed: number;          // ピクセル/秒
    judgmentWindow: {
        perfect: number;        // ±ミリ秒
        good: number;
        bad: number;
    };
    noteCount: number;          // 音符の数
    availableKeys: string[];    // 使用可能な音名
    bpm: number;                // テンポ
}

// ゲーム内の音符（落ちてくるノーツ）
export interface GameNote {
    id: string;
    time: number;               // 判定ラインに到達する時刻（ミリ秒）
    lane: number;               // レーン番号（0-indexed）
    frequency: number;          // 周波数
    noteName: string;           // 音名（表示用）
    y: number;                  // 現在のY座標
    active: boolean;            // アクティブ（まだ判定されていない）
}

// トラック（楽曲データ）
export interface Track {
    id: string;
    name: string;
    difficulty: Difficulty;
    bpm: number;
    notes: GameNote[];
    duration: number;           // 曲の長さ（ミリ秒）
}

// ゲーム状態
export interface GameState {
    score: number;
    combo: number;
    maxCombo: number;
    perfectCount: number;
    goodCount: number;
    badCount: number;
    missCount: number;
    isPlaying: boolean;
    isPaused: boolean;
    currentTime: number;        // 経過時間（ミリ秒）
}

// ゲーム設定
export interface GameConfig {
    canvasWidth: number;
    canvasHeight: number;
    laneCount: number;
    laneWidth: number;
    judgeLineY: number;         // 判定ラインのY座標
    noteHeight: number;
    noteWidth: number;
}

// プレイ履歴
export interface PlayHistory {
    date: Date;
    difficulty: Difficulty;
    score: number;
    accuracy: number;
    perfectCount: number;
    goodCount: number;
    badCount: number;
    missCount: number;
    maxCombo: number;
}

// 難易度別設定
export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultyConfig> = {
    easy: {
        noteSpeed: 120,     // 200 → 120に減速（40%減）
        judgmentWindow: {
            perfect: 120,   // モバイル対応でさらに緩和
            good: 250,      // モバイル対応でさらに緩和
            bad: 350        // モバイル対応でさらに緩和
        },
        noteCount: 10,      // 15 → 10にさらに減少（約33%減）
        availableKeys: ['C', 'E', 'G'],
        bpm: 80
    },
    normal: {
        noteSpeed: 220,     // 350 → 220に減速（約37%減）
        judgmentWindow: {
            perfect: 100,   // モバイル対応でさらに緩和
            good: 200,      // モバイル対応でさらに緩和
            bad: 300        // モバイル対応でさらに緩和
        },
        noteCount: 18,      // 25 → 18にさらに減少（約28%減）
        availableKeys: ['C', 'D', 'E', 'F', 'G'],
        bpm: 120
    },
    hard: {
        noteSpeed: 280,     // 380 → 280に減速（約26%減）
        judgmentWindow: {
            perfect: 80,    // モバイル対応でさらに緩和
            good: 150,      // モバイル対応でさらに緩和
            bad: 220        // モバイル対応でさらに緩和
        },
        noteCount: 28,      // 40 → 28にさらに減少（30%減）
        availableKeys: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
        bpm: 160
    },
    expert: {
        noteSpeed: 280,     // Hardと同じ速度に統一
        judgmentWindow: {
            perfect: 80,    // Hardと同じ判定に統一
            good: 150,      // Hardと同じ判定に統一
            bad: 220        // Hardと同じ判定に統一
        },
        noteCount: 28,      // Hardと同じ音符数に統一
        availableKeys: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
        bpm: 160            // Hardと同じBPMに統一
    }
};


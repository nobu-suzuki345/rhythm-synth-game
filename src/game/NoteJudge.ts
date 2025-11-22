/**
 * 音符の判定を行うクラス
 */

import type { Judgment, JudgmentType, AudioEffects } from '../types';
import type { DifficultyConfig } from '../types';

export class NoteJudge {
    private config: DifficultyConfig;

    constructor(config: DifficultyConfig) {
        this.config = config;
    }

    /**
     * タイミング判定
     */
    judge(playerTime: number, targetTime: number): Judgment {
        const diff = Math.abs(playerTime - targetTime);
        
        if (diff <= this.config.judgmentWindow.perfect) {
            return {
                type: 'perfect',
                score: 100,
                combo: true,
                message: 'PERFECT!',
                color: '#FFD700',
                timing: diff
            };
        } else if (diff <= this.config.judgmentWindow.good) {
            return {
                type: 'good',
                score: 50,
                combo: true,
                message: 'Good',
                color: '#00FF00',
                timing: diff
            };
        } else if (diff <= this.config.judgmentWindow.bad) {
            return {
                type: 'bad',
                score: 10,
                combo: false,
                message: 'Bad',
                color: '#FFFF00',
                timing: diff
            };
        } else {
            return {
                type: 'miss',
                score: 0,
                combo: false,
                message: 'Miss',
                color: '#FF0000',
                timing: diff
            };
        }
    }

    /**
     * 判定に応じたオーディオエフェクトを取得
     */
    getEffects(judgment: JudgmentType): AudioEffects {
        switch (judgment) {
            case 'perfect':
                return {
                    waveform: 'sine',
                    volume: 1.0,
                    reverb: 0.3,
                    detune: 0,
                    filterFreq: 5000
                };
            case 'good':
                return {
                    waveform: 'sine',
                    volume: 0.8,
                    reverb: 0.2,
                    detune: 5,
                    filterFreq: 3000
                };
            case 'bad':
                return {
                    waveform: 'square',
                    volume: 0.5,
                    reverb: 0.1,
                    detune: 20,
                    filterFreq: 1000
                };
            default: // miss
                return {
                    waveform: 'sawtooth',
                    volume: 0.3,
                    reverb: 0,
                    detune: 50,
                    filterFreq: 500
                };
        }
    }

    /**
     * 難易度設定を更新
     */
    updateConfig(config: DifficultyConfig): void {
        this.config = config;
    }
}


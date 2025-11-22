/**
 * トラック（楽曲）を生成するクラス
 */

import type { Track, GameNote, Difficulty, DifficultyConfig } from '../types';
import { noteToFrequency } from '../types';

export class TrackGenerator {
    /**
     * 難易度に応じたトラックを生成
     */
    generateTrack(difficulty: Difficulty, config: DifficultyConfig): Track {
        const notes: GameNote[] = [];
        const availableKeys = config.availableKeys;
        const beatInterval = (60 / config.bpm) * 1000; // 1拍の長さ（ミリ秒）
        
        // 音符のパターンを生成
        let currentTime = 2000; // 開始2秒後から
        
        for (let i = 0; i < config.noteCount; i++) {
            const pattern = this.getPattern(difficulty, i);
            
            switch (pattern.type) {
                case 'single':
                    // 単音
                    notes.push(this.createNote(
                        i,
                        currentTime,
                        this.randomLane(availableKeys),
                        availableKeys
                    ));
                    currentTime += beatInterval * pattern.duration;
                    break;
                    
                case 'chord':
                    // 和音（同時押し）
                    const chordNotes = this.getChord(availableKeys, pattern.notes);
                    chordNotes.forEach((lane) => {
                        notes.push(this.createNote(
                            i,
                            currentTime,
                            lane,
                            availableKeys
                        ));
                    });
                    currentTime += beatInterval * pattern.duration;
                    break;
                    
                case 'rapid':
                    // 連打
                    for (let j = 0; j < pattern.notes; j++) {
                        notes.push(this.createNote(
                            i + j / 10,
                            currentTime + (beatInterval / 4) * j,
                            this.randomLane(availableKeys),
                            availableKeys
                        ));
                    }
                    currentTime += beatInterval * pattern.duration;
                    break;
            }
        }
        
        return {
            id: `track_${difficulty}_${Date.now()}`,
            name: this.getTrackName(difficulty),
            difficulty,
            bpm: config.bpm,
            notes,
            duration: currentTime + 2000 // 終了後2秒の余韻
        };
    }

    /**
     * パターンを取得
     * モバイル対応：同時押しを最小限に
     */
    private getPattern(difficulty: Difficulty, index: number): {
        type: 'single' | 'chord' | 'rapid';
        notes: number;
        duration: number;
    } {
        switch (difficulty) {
            case 'easy':
                // 単音のみ、ゆったり（間隔を広げる）
                return { type: 'single', notes: 1, duration: 1.5 };
                
            case 'normal':
                // 同時押しを大幅に減らす（20個に1回のみ、2音まで）
                // 間隔を広げてモバイル対応
                if (index % 20 === 0 && index > 0) {
                    return { type: 'chord', notes: 2, duration: 1.2 };
                }
                return { type: 'single', notes: 1, duration: 1.0 };
                
            case 'hard':
                // 同時押しを大幅に減らす（25個に1回の2音同時押しのみ）
                // 連打も減らす（15個に1回、3音まで）
                // 間隔を広げてモバイル対応
                if (index % 25 === 0 && index > 0) {
                    return { type: 'chord', notes: 2, duration: 1.2 }; // 2音のみ
                } else if (index % 15 === 0 && index > 0) {
                    return { type: 'rapid', notes: 3, duration: 1.0 }; // 3音まで
                }
                return { type: 'single', notes: 1, duration: 0.8 };
                
            case 'expert':
                // 同時押しを大幅に減らす
                // 30個に1回の2音同時押しのみ
                // 連打も減らす（18個に1回、4音まで）
                // 間隔を広げてモバイル対応
                const r = index % 30;
                if (r === 0 && index > 0) {
                    return { type: 'chord', notes: 2, duration: 1.0 }; // 2音のみ
                } else if (r % 18 === 0 && index > 0) {
                    return { type: 'rapid', notes: 4, duration: 0.8 }; // 4音まで
                }
                return { type: 'single', notes: 1, duration: 0.6 };
        }
    }

    /**
     * 音符を作成
     */
    private createNote(
        id: number,
        time: number,
        lane: number,
        availableKeys: string[]
    ): GameNote {
        const noteName = availableKeys[lane];
        const frequency = noteToFrequency(noteName, 4);
        
        return {
            id: `note_${id}_${lane}`,
            time,
            lane,
            frequency,
            noteName,
            y: 0,
            active: true
        };
    }

    /**
     * ランダムなレーンを選択
     */
    private randomLane(availableKeys: string[]): number {
        return Math.floor(Math.random() * availableKeys.length);
    }

    /**
     * コード（和音）を取得
     */
    private getChord(availableKeys: string[], count: number): number[] {
        const lanes: number[] = [];
        const maxLane = availableKeys.length;
        
        // 重複しないレーンを選択
        while (lanes.length < Math.min(count, maxLane)) {
            const lane = this.randomLane(availableKeys);
            if (!lanes.includes(lane)) {
                lanes.push(lane);
            }
        }
        
        return lanes.sort((a, b) => a - b);
    }

    /**
     * トラック名を取得
     */
    private getTrackName(difficulty: Difficulty): string {
        const names = {
            easy: 'ゆったりメロディ',
            normal: '元気なリズム',
            hard: '高速ビート',
            expert: '超絶技巧'
        };
        return names[difficulty];
    }
}


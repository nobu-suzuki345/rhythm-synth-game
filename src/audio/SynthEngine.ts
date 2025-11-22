/**
 * シンセサイザーエンジン
 * Web Audio APIを使って音を生成する
 */

import type { AudioEffects, RecordedNote } from '../types';

export class SynthEngine {
    private audioContext: AudioContext;
    private masterGain: GainNode;
    private analyser: AnalyserNode;
    private recording: RecordedNote[] = [];
    private isRecording: boolean = false;

    constructor() {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // マスターゲイン（音量調整）
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.3; // 音量を30%に設定（耳に優しい）
        
        // アナライザー（スペクトラム可視化用）
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.8;
        
        // 接続: MasterGain → Analyser → Destination（スピーカー）
        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
    }

    /**
     * 音符を再生（エフェクト付き）
     */
    playNote(
        frequency: number,
        duration: number = 0.3,
        effects: AudioEffects
    ): void {
        const now = this.audioContext.currentTime;

        // オシレーター（音源）
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = effects.waveform;
        oscillator.frequency.setValueAtTime(frequency, now);
        oscillator.detune.setValueAtTime(effects.detune, now);

        // ゲインノード（音量エンベロープ用）
        const gainNode = this.audioContext.createGain();
        
        // ADSR エンベロープ（アタック・ディケイ・サスティン・リリース）
        const attack = 0.01;
        const decay = 0.1;
        const sustain = effects.volume * 0.7;
        const release = 0.2;
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(effects.volume, now + attack);
        gainNode.gain.linearRampToValueAtTime(sustain, now + attack + decay);
        gainNode.gain.setValueAtTime(sustain, now + duration - release);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

        // フィルター（音色調整）
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(effects.filterFreq, now);
        filter.Q.setValueAtTime(1, now);

        // リバーブ（簡易版：ディレイで代用）
        const delay = this.audioContext.createDelay();
        const delayGain = this.audioContext.createGain();
        delay.delayTime.setValueAtTime(effects.reverb * 0.1, now);
        delayGain.gain.setValueAtTime(effects.reverb * 0.3, now);

        // 接続: Oscillator → Filter → GainNode → MasterGain
        //                                      → Delay → DelayGain → MasterGain
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        // リバーブ効果
        if (effects.reverb > 0) {
            gainNode.connect(delay);
            delay.connect(delayGain);
            delayGain.connect(this.masterGain);
        }

        // 再生
        oscillator.start(now);
        oscillator.stop(now + duration);

        // 録音中なら記録
        if (this.isRecording) {
            this.recording.push({
                frequency,
                duration,
                waveform: effects.waveform,
                timestamp: Date.now(),
                judgment: 'perfect', // 仮（実際はゲームエンジンから渡される）
                effects
            });
        }
    }

    /**
     * 簡単な音再生（デフォルト設定）
     */
    playSimpleNote(frequency: number, duration: number = 0.3): void {
        const defaultEffects: AudioEffects = {
            waveform: 'sine',
            volume: 0.8,
            reverb: 0.2,
            detune: 0,
            filterFreq: 5000
        };
        this.playNote(frequency, duration, defaultEffects);
    }

    /**
     * 録音開始
     */
    startRecording(): void {
        this.recording = [];
        this.isRecording = true;
    }

    /**
     * 録音停止
     */
    stopRecording(): RecordedNote[] {
        this.isRecording = false;
        return this.recording;
    }

    /**
     * 録音を再生
     */
    playRecording(recording: RecordedNote[]): void {
        if (recording.length === 0) {
            console.warn('録音データがありません');
            return;
        }

        const startTime = this.audioContext.currentTime;
        const firstTimestamp = recording[0].timestamp;

        recording.forEach((note) => {
            // 相対的なタイミングで再生
            const relativeTime = (note.timestamp - firstTimestamp) / 1000;
            const playTime = startTime + relativeTime;

            this.scheduleNote(note, playTime);
        });
    }

    /**
     * 指定時刻に音符を再生（スケジューリング）
     */
    private scheduleNote(note: RecordedNote, startTime: number): void {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        oscillator.type = note.effects.waveform;
        oscillator.frequency.setValueAtTime(note.frequency, startTime);
        oscillator.detune.setValueAtTime(note.effects.detune, startTime);

        // エンベロープ
        const attack = 0.01;
        const release = 0.2;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(note.effects.volume, startTime + attack);
        gainNode.gain.setValueAtTime(note.effects.volume * 0.7, startTime + note.duration - release);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + note.duration);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(note.effects.filterFreq, startTime);

        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);

        oscillator.start(startTime);
        oscillator.stop(startTime + note.duration);
    }

    /**
     * 周波数データを取得（スペクトラム可視化用）
     */
    getFrequencyData(): Uint8Array {
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        return dataArray;
    }

    /**
     * オーディオコンテキストを再開（ユーザーインタラクション後に必要）
     */
    async resume(): Promise<void> {
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    /**
     * リソースのクリーンアップ
     */
    dispose(): void {
        this.audioContext.close();
    }
}


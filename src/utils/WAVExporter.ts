/**
 * WAVファイルエクスポーター
 * 録音した演奏をWAVファイルとしてダウンロード
 */

import type { RecordedNote } from '../types';

export class WAVExporter {
    private sampleRate: number = 44100;
    private bitDepth: number = 16;

    /**
     * 録音データをWAVファイルとしてダウンロード
     */
    async exportToWAV(recording: RecordedNote[], filename: string = 'my-performance.wav'): Promise<void> {
        if (recording.length === 0) {
            console.warn('録音データがありません');
            return;
        }

        // AudioBufferを生成
        const audioBuffer = await this.createAudioBuffer(recording);
        
        // WAVデータを生成
        const wavBlob = this.audioBufferToWav(audioBuffer);
        
        // ダウンロード
        this.download(wavBlob, filename);
    }

    /**
     * 録音データからAudioBufferを生成
     */
    private async createAudioBuffer(recording: RecordedNote[]): Promise<AudioBuffer> {
        // オーディオコンテキストを一時的に作成
        const offlineContext = new OfflineAudioContext(
            1, // モノラル
            this.sampleRate * 10, // 最大10秒
            this.sampleRate
        );

        const firstTimestamp = recording[0].timestamp;
        
        // 各音符を生成
        for (const note of recording) {
            const relativeTime = (note.timestamp - firstTimestamp) / 1000;
            this.scheduleNote(offlineContext, note, relativeTime);
        }

        // レンダリング
        const audioBuffer = await offlineContext.startRendering();
        return audioBuffer;
    }

    /**
     * 音符をスケジューリング
     */
    private scheduleNote(
        context: OfflineAudioContext,
        note: RecordedNote,
        startTime: number
    ): void {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        const filter = context.createBiquadFilter();

        oscillator.type = note.effects.waveform;
        oscillator.frequency.setValueAtTime(note.frequency, startTime);
        oscillator.detune.setValueAtTime(note.effects.detune, startTime);

        // エンベロープ
        const attack = 0.01;
        const release = 0.2;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(note.effects.volume, startTime + attack);
        gainNode.gain.setValueAtTime(
            note.effects.volume * 0.7,
            startTime + note.duration - release
        );
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + note.duration);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(note.effects.filterFreq, startTime);

        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + note.duration);
    }

    /**
     * AudioBufferをWAVファイル（Blob）に変換
     */
    private audioBufferToWav(buffer: AudioBuffer): Blob {
        const numberOfChannels = buffer.numberOfChannels;
        const length = buffer.length * numberOfChannels * 2;
        const arrayBuffer = new ArrayBuffer(44 + length);
        const view = new DataView(arrayBuffer);
        const channels: Float32Array[] = [];
        let pos = 0;

        // チャンネルデータを取得
        for (let i = 0; i < numberOfChannels; i++) {
            channels.push(buffer.getChannelData(i));
        }

        // WAVヘッダーを書き込み
        const writeString = (str: string) => {
            for (let i = 0; i < str.length; i++) {
                view.setUint8(pos++, str.charCodeAt(i));
            }
        };

        const setUint16 = (data: number) => {
            view.setUint16(pos, data, true);
            pos += 2;
        };

        const setUint32 = (data: number) => {
            view.setUint32(pos, data, true);
            pos += 4;
        };

        // RIFFチャンク
        writeString('RIFF');
        setUint32(36 + length);
        writeString('WAVE');

        // fmtチャンク
        writeString('fmt ');
        setUint32(16); // fmtチャンクのサイズ
        setUint16(1); // フォーマット（1 = PCM）
        setUint16(numberOfChannels);
        setUint32(this.sampleRate);
        setUint32(this.sampleRate * numberOfChannels * (this.bitDepth / 8)); // バイトレート
        setUint16(numberOfChannels * (this.bitDepth / 8)); // ブロックアライン
        setUint16(this.bitDepth);

        // dataチャンク
        writeString('data');
        setUint32(length);

        // PCMデータを書き込み
        for (let i = 0; i < buffer.length; i++) {
            for (let channel = 0; channel < numberOfChannels; channel++) {
                let sample = channels[channel][i];
                
                // -1.0 ~ 1.0 を 16bit整数に変換
                sample = Math.max(-1, Math.min(1, sample));
                sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
                view.setInt16(pos, sample, true);
                pos += 2;
            }
        }

        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }

    /**
     * Blobをダウンロード
     */
    private download(blob: Blob, filename: string): void {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        
        // クリーンアップ
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
    }
}


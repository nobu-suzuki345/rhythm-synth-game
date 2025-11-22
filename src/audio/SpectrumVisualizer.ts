/**
 * スペクトラムビジュアライザー
 * リアルタイムで音の周波数スペクトラムを可視化
 */

import type { SynthEngine } from './SynthEngine';

export class SpectrumVisualizer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private synth: SynthEngine;
    private animationId: number | null = null;
    private isRunning: boolean = false;

    constructor(canvas: HTMLCanvasElement, synth: SynthEngine) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.synth = synth;
        
        // キャンバスサイズを設定
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    /**
     * キャンバスサイズを調整
     */
    private resizeCanvas(): void {
        const container = this.canvas.parentElement;
        if (container) {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
        }
    }

    /**
     * 可視化開始
     */
    start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.animate();
    }

    /**
     * 可視化停止
     */
    stop(): void {
        this.isRunning = false;
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.clear();
    }

    /**
     * アニメーションループ
     */
    private animate = (): void => {
        if (!this.isRunning) return;

        this.draw();
        this.animationId = requestAnimationFrame(this.animate);
    };

    /**
     * スペクトラムを描画
     */
    private draw(): void {
        const frequencyData = this.synth.getFrequencyData();
        const width = this.canvas.width;
        const height = this.canvas.height;

        // 背景をクリア（グラデーション）
        const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(10, 10, 30, 0.3)');
        gradient.addColorStop(1, 'rgba(5, 5, 15, 0.3)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, width, height);

        // バーの数を調整（多すぎると重いので間引く）
        const barCount = Math.min(128, frequencyData.length / 2);
        const barWidth = width / barCount;

        for (let i = 0; i < barCount; i++) {
            // 周波数データを取得（低音から高音へ）
            const dataIndex = Math.floor((i / barCount) * frequencyData.length);
            const value = frequencyData[dataIndex];
            
            // バーの高さ（0-255 を 0-height に正規化）
            const barHeight = (value / 255) * height * 0.8;
            const x = i * barWidth;
            const y = height - barHeight;

            // グラデーション（低音:青 → 中音:緑 → 高音:赤）
            const hue = (i / barCount) * 280; // 0(赤) → 280(青紫)
            const saturation = 80 + (value / 255) * 20;
            const lightness = 40 + (value / 255) * 30;
            
            this.ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            
            // バーを描画（角丸）
            this.ctx.beginPath();
            this.ctx.roundRect(x + 1, y, barWidth - 2, barHeight, 2);
            this.ctx.fill();

            // グロー効果
            if (value > 100) {
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            }
        }

        // 波形の上にライン効果
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor((i / barCount) * frequencyData.length);
            const value = frequencyData[dataIndex];
            const barHeight = (value / 255) * height * 0.8;
            const x = i * barWidth + barWidth / 2;
            const y = height - barHeight;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.stroke();
    }

    /**
     * キャンバスをクリア
     */
    private clear(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}


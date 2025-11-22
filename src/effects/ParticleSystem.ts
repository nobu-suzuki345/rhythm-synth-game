/**
 * パーティクルシステム
 * Perfect判定時などにエフェクトを表示
 */

import type { JudgmentType } from '../types';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    color: string;
    alpha: number;
}

export class ParticleSystem {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private particles: Particle[] = [];
    private animationId: number | null = null;
    private isRunning: boolean = false;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        
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
     * パーティクル放出
     */
    emit(x: number, y: number, judgment: JudgmentType): void {
        const config = this.getEmitConfig(judgment);
        
        for (let i = 0; i < config.count; i++) {
            const angle = (Math.PI * 2 * i) / config.count + Math.random() * 0.5;
            const speed = config.speed + Math.random() * config.speedVariation;
            
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2, // 上向きのバイアス
                life: config.life,
                maxLife: config.life,
                size: config.size + Math.random() * config.sizeVariation,
                color: config.color,
                alpha: 1
            });
        }

        // アニメーション開始
        if (!this.isRunning) {
            this.start();
        }
    }

    /**
     * 判定ごとの設定を取得
     */
    private getEmitConfig(judgment: JudgmentType) {
        switch (judgment) {
            case 'perfect':
                return {
                    count: 30,
                    speed: 3,
                    speedVariation: 2,
                    life: 60,
                    size: 4,
                    sizeVariation: 2,
                    color: '#FFD700' // ゴールド
                };
            case 'good':
                return {
                    count: 20,
                    speed: 2,
                    speedVariation: 1,
                    life: 40,
                    size: 3,
                    sizeVariation: 1,
                    color: '#00FF00' // グリーン
                };
            case 'bad':
                return {
                    count: 10,
                    speed: 1,
                    speedVariation: 0.5,
                    life: 30,
                    size: 2,
                    sizeVariation: 1,
                    color: '#FFFF00' // イエロー
                };
            default:
                return {
                    count: 5,
                    speed: 0.5,
                    speedVariation: 0.5,
                    life: 20,
                    size: 2,
                    sizeVariation: 0,
                    color: '#888888' // グレー
                };
        }
    }

    /**
     * アニメーション開始
     */
    private start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.animate();
    }

    /**
     * アニメーションループ
     */
    private animate = (): void => {
        if (!this.isRunning) return;

        this.update();
        this.draw();

        // パーティクルがまだ残っていれば継続
        if (this.particles.length > 0) {
            this.animationId = requestAnimationFrame(this.animate);
        } else {
            this.isRunning = false;
        }
    };

    /**
     * パーティクルを更新
     */
    private update(): void {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // 位置更新
            p.x += p.vx;
            p.y += p.vy;
            
            // 重力
            p.vy += 0.2;
            
            // 空気抵抗
            p.vx *= 0.98;
            p.vy *= 0.98;
            
            // 寿命
            p.life--;
            p.alpha = p.life / p.maxLife;
            
            // 死んだパーティクルを削除
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * パーティクルを描画
     */
    private draw(): void {
        // 背景はクリアしない（ゲームキャンバスの上に重ねるため透明）
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (const p of this.particles) {
            this.ctx.save();
            
            // アルファ値を設定
            this.ctx.globalAlpha = p.alpha;
            
            // パーティクルを描画（円）
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // グロー効果
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = p.color;
            this.ctx.fill();
            
            this.ctx.restore();
        }
    }

    /**
     * クリーンアップ
     */
    dispose(): void {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.particles = [];
        this.isRunning = false;
    }
}


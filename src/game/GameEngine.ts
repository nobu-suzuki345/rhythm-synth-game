/**
 * ゲームエンジン
 * ゲーム全体のロジックを管理
 */

import type { 
    Difficulty, 
    DifficultyConfig, 
    GameState, 
    GameConfig, 
    Track, 
    GameNote,
    RecordedNote
} from '../types';
import { DIFFICULTY_SETTINGS } from '../types';
import { SynthEngine } from '../audio';
import { ParticleSystem } from '../effects';
import { NoteJudge } from './NoteJudge';
import { TrackGenerator } from './TrackGenerator';

export class GameEngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private synth: SynthEngine;
    private particles: ParticleSystem;
    private judge: NoteJudge;
    private trackGenerator: TrackGenerator;
    
    private difficultyConfig: DifficultyConfig;
    private config: GameConfig;
    private state: GameState;
    private track: Track | null = null;
    private activeNotes: GameNote[] = [];
    
    private animationId: number | null = null;
    private startTime: number = 0;
    private lastUpdateTime: number = 0;
    
    // キーバインディング
    private keyMap: Map<string, number> = new Map();
    private pressedKeys: Set<string> = new Set();

    // コールバック
    private onScoreUpdate?: (score: number, combo: number) => void;
    private onJudgment?: (judgment: string, x: number, y: number) => void;
    private onGameEnd?: (state: GameState, recording: RecordedNote[]) => void;

    constructor(
        canvas: HTMLCanvasElement,
        synth: SynthEngine,
        particles: ParticleSystem
    ) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.synth = synth;
        this.particles = particles;
        
        this.difficultyConfig = DIFFICULTY_SETTINGS.normal;
        this.judge = new NoteJudge(this.difficultyConfig);
        this.trackGenerator = new TrackGenerator();
        
        // ゲーム設定
        this.config = {
            canvasWidth: 800,
            canvasHeight: 600,
            laneCount: 5,
            laneWidth: 100,
            judgeLineY: 500,
            noteHeight: 20,
            noteWidth: 80
        };
        
        // ゲーム状態の初期化
        this.state = this.createInitialState();
        
        // キャンバスサイズ設定
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // キー入力の設定
        this.setupKeyBindings();
        
        // タッチイベントの設定
        this.setupTouchEvents();
    }

    /**
     * キャンバスサイズ調整
     */
    private resizeCanvas(): void {
        const container = this.canvas.parentElement;
        if (container) {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
            
            this.config.canvasWidth = this.canvas.width;
            this.config.canvasHeight = this.canvas.height;
            this.config.judgeLineY = this.canvas.height - 100;
        }
    }

    /**
     * キーバインディング設定
     */
    private setupKeyBindings(): void {
        // デフォルトキー: ASDFGHJKL
        const keys = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
        keys.forEach((key, index) => {
            this.keyMap.set(key, index);
        });
        
        // 追加キー: B N M （A, A#, B音に対応）
        // これらは9番目以降のレーンに割り当てられる
        const additionalKeys = ['b', 'n', 'm'];
        additionalKeys.forEach((key, index) => {
            this.keyMap.set(key, keys.length + index);
        });
        
        // キー押下
        window.addEventListener('keydown', (e) => {
            // 特殊キー（Shift、Ctrl等）は無視
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            
            const key = e.key.toLowerCase();
            
            if (this.keyMap.has(key) && !this.pressedKeys.has(key)) {
                this.pressedKeys.add(key);
                this.onKeyPress(key);
            }
        });
        
        // キー解放
        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            this.pressedKeys.delete(key);
        });
    }

    /**
     * タッチイベントの設定
     */
    private setupTouchEvents(): void {
        // タッチ開始
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); // スクロールを防ぐ
            const touch = e.touches[0];
            this.handleTouch(touch.clientX, touch.clientY);
        }, { passive: false });
        
        // タッチ終了
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        // マウスクリック（デスクトップでも使えるように）
        this.canvas.addEventListener('click', (e) => {
            this.handleTouch(e.clientX, e.clientY);
        });
    }

    /**
     * タッチ/クリック処理
     */
    private handleTouch(clientX: number, _clientY: number): void {
        if (!this.state.isPlaying || this.state.isPaused) return;
        
        // キャンバス上の座標を取得
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        
        // どのレーンをタップしたか判定
        const totalWidth = this.config.laneWidth * this.config.laneCount;
        const startX = (this.config.canvasWidth - totalWidth) / 2;
        
        // タップ位置がレーン内かチェック
        if (x < startX || x > startX + totalWidth) return;
        
        // レーン番号を計算
        const lane = Math.floor((x - startX) / this.config.laneWidth);
        
        if (lane >= 0 && lane < this.config.laneCount) {
            this.processLaneInput(lane);
        }
    }

    /**
     * レーン入力の処理（キーボード・タッチ共通）
     * 外部から呼び出し可能（UIマネージャーから鍵盤タップ時に使用）
     */
    public processLaneInput(lane: number): void {
        if (!this.state.isPlaying || this.state.isPaused) return;
        if (lane < 0 || lane >= this.config.laneCount) return;
        
        // そのレーンの最も近い音符を探す
        const note = this.findNearestNote(lane);
        if (!note) {
            // 音符がない場合はミス
            this.handleMiss(lane);
            return;
        }
        
        // 判定
        const currentTime = Date.now() - this.startTime;
        const judgment = this.judge.judge(currentTime, note.time);
        
        // 音を鳴らす
        const effects = this.judge.getEffects(judgment.type);
        this.synth.playNote(note.frequency, 0.3, effects);
        
        // スコア更新
        this.updateScore(judgment);
        
        // エフェクト
        const laneX = this.getLaneX(lane);
        const laneY = this.config.judgeLineY;
        this.particles.emit(laneX, laneY, judgment.type);
        
        // 判定表示のコールバック
        if (this.onJudgment) {
            this.onJudgment(judgment.message, laneX, laneY);
        }
        
        // 音符を非アクティブに
        note.active = false;
    }

    /**
     * キー押下時の処理
     */
    private onKeyPress(key: string): void {
        const lane = this.keyMap.get(key);
        if (lane === undefined) return;
        this.processLaneInput(lane);
    }

    /**
     * 最も近い音符を探す
     */
    private findNearestNote(lane: number): GameNote | null {
        const currentTime = Date.now() - this.startTime;
        const maxDiff = this.difficultyConfig.judgmentWindow.bad;
        
        let nearest: GameNote | null = null;
        let minDiff = Infinity;
        
        for (const note of this.activeNotes) {
            if (note.lane === lane && note.active) {
                const diff = Math.abs(note.time - currentTime);
                if (diff < minDiff && diff <= maxDiff) {
                    minDiff = diff;
                    nearest = note;
                }
            }
        }
        
        return nearest;
    }

    /**
     * ミス処理
     */
    private handleMiss(_lane: number): void {
        this.state.missCount++;
        this.state.combo = 0;
        
        if (this.onScoreUpdate) {
            this.onScoreUpdate(this.state.score, this.state.combo);
        }
    }

    /**
     * スコア更新
     */
    private updateScore(judgment: any): void {
        this.state.score += judgment.score;
        
        if (judgment.combo) {
            this.state.combo++;
            if (this.state.combo > this.state.maxCombo) {
                this.state.maxCombo = this.state.combo;
            }
        } else {
            this.state.combo = 0;
        }
        
        // カウント更新
        switch (judgment.type) {
            case 'perfect':
                this.state.perfectCount++;
                break;
            case 'good':
                this.state.goodCount++;
                break;
            case 'bad':
                this.state.badCount++;
                break;
            case 'miss':
                this.state.missCount++;
                break;
        }
        
        if (this.onScoreUpdate) {
            this.onScoreUpdate(this.state.score, this.state.combo);
        }
    }

    /**
     * レーンのX座標を取得
     */
    private getLaneX(lane: number): number {
        const totalWidth = this.config.laneWidth * this.config.laneCount;
        const startX = (this.config.canvasWidth - totalWidth) / 2;
        return startX + lane * this.config.laneWidth + this.config.laneWidth / 2;
    }

    /**
     * ゲーム開始
     */
    start(difficulty: Difficulty): void {
        console.log(`🎮 GameEngine.start() 呼び出し: ${difficulty}`);
        
        // 前のゲームをクリーンアップ
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.state.isPlaying = false;
        this.activeNotes = [];
        this.track = null;
        
        // キャンバスサイズを再計算
        this.resizeCanvas();
        console.log(`キャンバスサイズ: ${this.config.canvasWidth}x${this.config.canvasHeight}, 判定ラインY: ${this.config.judgeLineY}`);
        
        this.difficultyConfig = DIFFICULTY_SETTINGS[difficulty];
        this.judge.updateConfig(this.difficultyConfig);
        
        // レーン数を更新
        this.config.laneCount = this.difficultyConfig.availableKeys.length;
        this.config.laneWidth = Math.min(100, this.config.canvasWidth / this.config.laneCount);
        console.log(`レーン数: ${this.config.laneCount}, レーン幅: ${this.config.laneWidth}`);
        
        // トラック生成
        this.track = this.trackGenerator.generateTrack(difficulty, this.difficultyConfig);
        this.activeNotes = [...this.track.notes];
        console.log(`音符数: ${this.activeNotes.length}`);
        console.log(`トラック長: ${this.track.duration}ms`);
        
        // 最初の音符の情報をログ出力
        if (this.activeNotes.length > 0) {
            const firstNote = this.activeNotes[0];
            console.log(`最初の音符: 時刻=${firstNote.time}ms, レーン=${firstNote.lane}, 音名=${firstNote.noteName}`);
        }
        
        // 状態リセット
        this.state = this.createInitialState();
        this.state.isPlaying = true;
        
        // 録音開始
        this.synth.startRecording();
        
        // アニメーション開始
        this.startTime = Date.now();
        this.lastUpdateTime = this.startTime;
        console.log('🎬 アニメーションループ開始');
        this.animate();
    }

    /**
     * アニメーションループ
     */
    private animate = (): void => {
        if (!this.state.isPlaying) return;
        
        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastUpdateTime;
        this.lastUpdateTime = currentTime;
        
        this.update(deltaTime);
        this.draw();
        
        // ゲーム終了チェック
        if (this.checkGameEnd()) {
            this.endGame();
            return;
        }
        
        this.animationId = requestAnimationFrame(this.animate);
    };

    /**
     * 更新処理
     */
    private update(_deltaTime: number): void {
        const currentTime = Date.now() - this.startTime;
        this.state.currentTime = currentTime;
        
        // 音符の速度（ピクセル/秒）を取得
        const noteSpeed = this.difficultyConfig.noteSpeed; // px/s
        const noteSpeedMs = noteSpeed / 1000; // px/ms
        
        // 判定ラインまでの距離
        const judgeLineY = this.config.judgeLineY;
        
        // 音符が落ちる時間（判定ラインまで）
        const fallTime = (judgeLineY / noteSpeed) * 1000; // ミリ秒
        
        // 音符の位置を更新
        for (const note of this.activeNotes) {
            if (note.active) {
                // 音符が判定ラインに到達する時間からの経過時間（ミリ秒）
                const timeToJudge = note.time - currentTime;
                
                // 音符の位置を計算
                // timeToJudgeが大きい（未来）→ 音符は上（yが小さい）
                // timeToJudgeが0 → 音符は判定ライン
                // timeToJudgeが負（過去）→ 音符は下（yが大きい）
                if (timeToJudge > fallTime) {
                    // まだ画面の上にいる
                    note.y = -this.config.noteHeight;
                } else if (timeToJudge >= 0) {
                    // 落ちている途中
                    note.y = judgeLineY - (timeToJudge / fallTime) * judgeLineY;
                } else {
                    // 判定ラインを通過した
                    note.y = judgeLineY + Math.abs(timeToJudge) * noteSpeedMs;
                }
                
                // 判定ラインを大きく超えたらミス（判定ウィンドウを緩くしたので、閾値も緩和）
                // bad判定の最大値（300ms）を考慮して、より余裕を持たせる
                const missThreshold = judgeLineY + 200; // 150 → 200に緩和
                if (note.y > missThreshold) {
                    note.active = false;
                    this.handleMiss(note.lane);
                }
            }
        }
    }

    /**
     * 描画処理
     */
    private draw(): void {
        // 背景クリア
        this.ctx.fillStyle = 'rgba(10, 10, 30, 0.8)';
        this.ctx.fillRect(0, 0, this.config.canvasWidth, this.config.canvasHeight);
        
        // レーンを描画
        this.drawLanes();
        
        // 判定ラインを描画
        this.drawJudgeLine();
        
        // 音符を描画
        this.drawNotes();
    }

    /**
     * レーンを描画
     */
    private drawLanes(): void {
        const totalWidth = this.config.laneWidth * this.config.laneCount;
        const startX = (this.config.canvasWidth - totalWidth) / 2;
        
        for (let i = 0; i < this.config.laneCount; i++) {
            const x = startX + i * this.config.laneWidth;
            
            // レーン背景
            this.ctx.fillStyle = i % 2 === 0 ? 'rgba(50, 50, 80, 0.3)' : 'rgba(30, 30, 60, 0.3)';
            this.ctx.fillRect(x, 0, this.config.laneWidth, this.config.canvasHeight);
            
            // レーン境界線
            this.ctx.strokeStyle = 'rgba(100, 100, 150, 0.5)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.config.canvasHeight);
            this.ctx.stroke();
        }
    }

    /**
     * 判定ラインを描画
     */
    private drawJudgeLine(): void {
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([10, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.config.judgeLineY);
        this.ctx.lineTo(this.config.canvasWidth, this.config.judgeLineY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    /**
     * 音名に応じた色を取得
     */
    private getNoteColor(noteName: string): { fill: string; stroke: string } {
        // 音名に応じて色を返す
        const colorMap: Record<string, { fill: string; stroke: string }> = {
            'C': { fill: '#4ECDC4', stroke: '#45B7AF' },      // シアン
            'C#': { fill: '#9B59B6', stroke: '#8E44AD' },    // 紫
            'D': { fill: '#3498DB', stroke: '#2980B9' },     // 青
            'D#': { fill: '#5DADE2', stroke: '#3498DB' },   // ライトブルー
            'E': { fill: '#2ECC71', stroke: '#27AE60' },     // 緑
            'F': { fill: '#F39C12', stroke: '#E67E22' },    // オレンジ
            'F#': { fill: '#E74C3C', stroke: '#C0392B' },   // 赤
            'G': { fill: '#F1C40F', stroke: '#F39C12' },    // 黄
            'G#': { fill: '#E67E22', stroke: '#D35400' },  // ダークオレンジ
            'A': { fill: '#E91E63', stroke: '#C2185B' },    // ピンク
            'A#': { fill: '#9C27B0', stroke: '#7B1FA2' },   // パープル
            'B': { fill: '#00BCD4', stroke: '#0097A7' }     // シアンブルー
        };
        
        return colorMap[noteName] || { fill: '#4ECDC4', stroke: '#45B7AF' }; // デフォルト
    }

    /**
     * 色の明るさを計算（0-255）
     */
    private getBrightness(hex: string): number {
        // #を削除
        const color = hex.replace('#', '');
        
        // RGBに変換
        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);
        
        // 明るさを計算（YIQ方式）
        return (r * 299 + g * 587 + b * 114) / 1000;
    }

    /**
     * 音符を描画
     */
    private drawNotes(): void {
        const totalWidth = this.config.laneWidth * this.config.laneCount;
        const startX = (this.config.canvasWidth - totalWidth) / 2;
        
        let visibleNoteCount = 0;
        let activeNoteCount = 0;
        
        for (const note of this.activeNotes) {
            if (!note.active) continue;
            activeNoteCount++;
            
            // 描画条件を緩和（画面外でも少し余裕を持たせる）
            if (note.y < -this.config.noteHeight * 2) continue;
            if (note.y > this.config.canvasHeight + this.config.noteHeight) continue;
            
            visibleNoteCount++;
            
            const x = startX + note.lane * this.config.laneWidth + (this.config.laneWidth - this.config.noteWidth) / 2;
            const y = note.y - this.config.noteHeight / 2;
            
            // 音名に応じた色を取得
            const colors = this.getNoteColor(note.noteName);
            
            // 音符を描画
            this.ctx.fillStyle = colors.fill;
            this.ctx.strokeStyle = colors.stroke;
            this.ctx.lineWidth = 2;
            
            this.ctx.beginPath();
            this.ctx.roundRect(x, y, this.config.noteWidth, this.config.noteHeight, 5);
            this.ctx.fill();
            this.ctx.stroke();
            
            // 音名を表示（白または黒でコントラストを確保）
            // 色が明るい場合は黒、暗い場合は白
            const brightness = this.getBrightness(colors.fill);
            this.ctx.fillStyle = brightness > 128 ? '#000000' : '#FFFFFF';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(note.noteName, x + this.config.noteWidth / 2, y + this.config.noteHeight / 2);
        }
        
        // デバッグ: 定期的にログ出力
        if (this.state.currentTime % 1000 < 50 && activeNoteCount > 0) {
            console.log(`アクティブな音符: ${activeNoteCount}, 描画中の音符: ${visibleNoteCount}, 判定ラインY: ${this.config.judgeLineY}`);
            if (this.activeNotes.length > 0 && this.activeNotes[0].active) {
                console.log(`最初の音符の位置: y=${this.activeNotes[0].y.toFixed(1)}, 時刻=${this.activeNotes[0].time}ms, 現在時刻=${this.state.currentTime}ms`);
            }
        }
    }

    /**
     * ゲーム終了チェック
     */
    private checkGameEnd(): boolean {
        if (!this.track) return false;
        
        const currentTime = Date.now() - this.startTime;
        return currentTime > this.track.duration;
    }

    /**
     * ゲーム終了
     */
    private endGame(): void {
        this.state.isPlaying = false;
        
        // 録音停止
        const recording = this.synth.stopRecording();
        
        // コールバック
        if (this.onGameEnd) {
            this.onGameEnd(this.state, recording);
        }
    }

    /**
     * 初期状態を作成
     */
    private createInitialState(): GameState {
        return {
            score: 0,
            combo: 0,
            maxCombo: 0,
            perfectCount: 0,
            goodCount: 0,
            badCount: 0,
            missCount: 0,
            isPlaying: false,
            isPaused: false,
            currentTime: 0
        };
    }

    /**
     * コールバック設定
     */
    setCallbacks(callbacks: {
        onScoreUpdate?: (score: number, combo: number) => void;
        onJudgment?: (judgment: string, x: number, y: number) => void;
        onGameEnd?: (state: GameState, recording: RecordedNote[]) => void;
    }): void {
        this.onScoreUpdate = callbacks.onScoreUpdate;
        this.onJudgment = callbacks.onJudgment;
        this.onGameEnd = callbacks.onGameEnd;
    }

    /**
     * 難易度設定を取得
     */
    getDifficultyConfig(): DifficultyConfig {
        return this.difficultyConfig;
    }

    /**
     * クリーンアップ
     */
    dispose(): void {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
}


/**
 * メインエントリーポイント
 * すべてのモジュールを統合
 */

import './style.css';
import type { Difficulty, RecordedNote } from './types';
import { DIFFICULTY_SETTINGS } from './types';
import { SynthEngine, SpectrumVisualizer } from './audio';
import { GameEngine } from './game';
import { ParticleSystem } from './effects';
import { UIManager } from './ui';
import { WAVExporter } from './utils';

class App {
    private synth!: SynthEngine;
    private visualizer!: SpectrumVisualizer;
    private game!: GameEngine;
    private particles!: ParticleSystem;
    private ui!: UIManager;
    private wavExporter!: WAVExporter;
    private bgmAudio: HTMLAudioElement | null = null;
    
    private currentDifficulty: Difficulty = 'normal';
    private currentRecording: RecordedNote[] = [];

    constructor() {
        // キャンバス要素を取得
        const visualizerCanvas = document.getElementById('visualizer') as HTMLCanvasElement;
        const gameCanvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        const particleCanvas = document.getElementById('particleCanvas') as HTMLCanvasElement;

        if (!visualizerCanvas || !gameCanvas || !particleCanvas) {
            console.error('キャンバス要素が見つかりません');
            return;
        }

        // 各モジュールを初期化
        this.synth = new SynthEngine();
        this.visualizer = new SpectrumVisualizer(visualizerCanvas, this.synth);
        this.particles = new ParticleSystem(particleCanvas);
        this.game = new GameEngine(gameCanvas, this.synth, this.particles);
        this.ui = new UIManager();
        this.wavExporter = new WAVExporter();

        // コールバック設定
        this.setupCallbacks();

        // 初期化完了
        console.log('🎵 Rhythm Synth Game - 初期化完了');
        console.log('タイトル画面で難易度を選択してください');
    }

    /**
     * コールバックの設定
     */
    private setupCallbacks(): void {
        // UIコールバック
        this.ui.setCallbacks({
            onDifficultySelect: (difficulty) => this.startGame(difficulty),
            onRetry: () => this.startGame(this.currentDifficulty),
            onBackToTitle: () => this.backToTitle(),
            onPlayRecording: () => this.playRecording(),
            onDownloadWAV: () => this.downloadWAV(),
            onKeyTouch: (lane) => this.game.processLaneInput(lane)
        });

        // ゲームコールバック
        this.game.setCallbacks({
            onScoreUpdate: (score, combo) => {
                this.ui.updateScore(score, combo);
            },
            onJudgment: (message) => {
                this.ui.showJudgment(message, '#FFD700');
            },
            onGameEnd: (state, recording) => {
                this.onGameEnd(state, recording);
            }
        });
    }

    /**
     * ゲーム開始
     */
    private async startGame(difficulty: Difficulty): Promise<void> {
        console.log(`🎮 難易度選択: ${difficulty}`);
        this.currentDifficulty = difficulty;
        
        try {
            // 前のゲームをクリーンアップ
            this.visualizer.stop();
            this.game.dispose();
            
            // BGMを停止（既に再生中の場合は）
            this.stopBGM();
            
            // オーディオコンテキストを再開（ユーザーインタラクション後に必要）
            await this.synth.resume();
            console.log('✅ オーディオコンテキスト再開');
            
            // ゲーム画面を表示
            this.ui.showGameScreen(difficulty);
            console.log('✅ ゲーム画面表示');
            
            // ゲーム画面が表示されるのを待ってから設定
            setTimeout(() => {
                // まずゲームエンジンで難易度設定を更新（start()の一部を先に実行）
                // これにより、getDifficultyConfig()が正しい値を返す
                const tempConfig = DIFFICULTY_SETTINGS[difficulty];
                
                // キーボードを設定（難易度設定から直接取得）
                this.ui.setupKeyboard(tempConfig.availableKeys);
                console.log(`✅ キーボード設定完了: ${tempConfig.availableKeys.join(', ')}`);
                
                // スペクトラムビジュアライザーを開始
                this.visualizer.start();
                console.log('✅ ビジュアライザー開始');
                
                // BGMを開始
                this.startBGM();
                
                // ゲーム開始（この時点で難易度設定が更新される）
                this.game.start(difficulty);
                console.log('🎮 ゲーム開始！');
            }, 100);
        } catch (error) {
            console.error('❌ ゲーム開始エラー:', error);
        }
    }

    /**
     * ゲーム終了時の処理
     */
    private onGameEnd(state: any, recording: RecordedNote[]): void {
        console.log('🎉 ゲーム終了', state);
        
        // 録音を保存
        this.currentRecording = recording;
        
        // スペクトラムビジュアライザーを停止
        this.visualizer.stop();
        
        // BGMを停止
        this.stopBGM();
        
        // リザルト画面を表示
        this.ui.showResultScreen(state);
    }

    /**
     * 録音を再生
     */
    private playRecording(): void {
        if (this.currentRecording.length === 0) {
            alert('録音データがありません');
            return;
        }
        
        console.log('▶ 録音を再生中...');
        
        // スペクトラムビジュアライザーを再開
        this.visualizer.start();
        
        // 録音を再生
        this.synth.playRecording(this.currentRecording);
        
        // 再生終了後にビジュアライザーを停止
        const duration = this.currentRecording[this.currentRecording.length - 1].timestamp 
                        - this.currentRecording[0].timestamp 
                        + 1000; // 余韻
        setTimeout(() => {
            this.visualizer.stop();
        }, duration);
    }

    /**
     * WAVファイルをダウンロード
     */
    private async downloadWAV(): Promise<void> {
        if (this.currentRecording.length === 0) {
            alert('録音データがありません');
            return;
        }
        
        console.log('💾 WAVファイルを生成中...');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `rhythm-synth-${this.currentDifficulty}-${timestamp}.wav`;
        
        await this.wavExporter.exportToWAV(this.currentRecording, filename);
        
        console.log(`✅ WAVファイルをダウンロードしました: ${filename}`);
    }

    /**
     * BGMを開始
     */
    private startBGM(): void {
        try {
            // 既存のBGMを停止
            this.stopBGM();
            
            // 新しいAudioオブジェクトを作成
            this.bgmAudio = new Audio('/sound.mp3');
            this.bgmAudio.loop = true; // ループ再生
            this.bgmAudio.volume = 0.5; // 音量を50%に設定（必要に応じて調整）
            
            // 再生開始
            this.bgmAudio.play().then(() => {
                console.log('🎵 BGM再生開始');
            }).catch((error) => {
                console.error('❌ BGM再生エラー:', error);
                // エラーが発生した場合、BGMをnullに設定
                this.bgmAudio = null;
            });
        } catch (error) {
            console.error('❌ BGM初期化エラー:', error);
            this.bgmAudio = null;
        }
    }

    /**
     * BGMを停止
     */
    private stopBGM(): void {
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio.currentTime = 0;
            this.bgmAudio = null;
            console.log('🔇 BGM停止');
        }
    }

    /**
     * タイトル画面に戻る
     */
    private backToTitle(): void {
        this.visualizer.stop();
        this.stopBGM();
        this.ui.showTitleScreen();
        console.log('🏠 タイトル画面に戻りました');
    }
}

// DOMの読み込みを待ってからアプリケーションを起動
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new App();
    });
} else {
    // すでに読み込み済みの場合は即座に起動
    new App();
}

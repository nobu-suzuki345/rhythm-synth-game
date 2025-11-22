/**
 * UIマネージャー
 * 画面遷移とUI要素の管理
 */

import type { Difficulty, GameState } from '../types';

export class UIManager {
    private titleScreen: HTMLElement;
    private gameScreen: HTMLElement;
    private resultScreen: HTMLElement;
    
    private onDifficultySelect?: (difficulty: Difficulty) => void;
    private onRetry?: () => void;
    private onBackToTitle?: () => void;
    private onPlayRecording?: () => void;
    private onDownloadWAV?: () => void;
    private onKeyTouch?: (lane: number) => void;

    constructor() {
        this.titleScreen = document.getElementById('titleScreen')!;
        this.gameScreen = document.getElementById('gameScreen')!;
        this.resultScreen = document.getElementById('resultScreen')!;
        
        this.setupEventListeners();
    }

    /**
     * イベントリスナーの設定
     */
    private setupEventListeners(): void {
        // 難易度選択
        const difficultyCards = document.querySelectorAll('.difficulty-card');
        console.log(`難易度カード数: ${difficultyCards.length}`);
        difficultyCards.forEach((card) => {
            card.addEventListener('click', () => {
                const difficulty = card.getAttribute('data-difficulty') as Difficulty;
                console.log(`🖱️ 難易度カードクリック: ${difficulty}`);
                if (this.onDifficultySelect) {
                    this.onDifficultySelect(difficulty);
                } else {
                    console.warn('⚠️ onDifficultySelect コールバックが未設定');
                }
            });
        });
        
        // リザルト画面のボタン
        document.getElementById('retry')?.addEventListener('click', () => {
            if (this.onRetry) {
                this.onRetry();
            }
        });
        
        document.getElementById('backToTitle')?.addEventListener('click', () => {
            if (this.onBackToTitle) {
                this.onBackToTitle();
            }
        });
        
        document.getElementById('playRecording')?.addEventListener('click', () => {
            if (this.onPlayRecording) {
                this.onPlayRecording();
            }
        });
        
        document.getElementById('downloadWAV')?.addEventListener('click', () => {
            if (this.onDownloadWAV) {
                this.onDownloadWAV();
            }
        });
    }

    /**
     * タイトル画面を表示
     */
    showTitleScreen(): void {
        console.log('🏠 タイトル画面を表示');
        this.hideAllScreens();
        this.titleScreen.classList.add('active');
    }

    /**
     * ゲーム画面を表示
     */
    showGameScreen(difficulty: Difficulty): void {
        console.log(`🎮 ゲーム画面を表示: ${difficulty}`);
        this.hideAllScreens();
        
        // 少し待ってから表示（DOM更新を確実にする）
        setTimeout(() => {
            this.gameScreen.classList.add('active');
            
            // 難易度バッジを更新
            const difficultyBadge = document.getElementById('difficulty');
            if (difficultyBadge) {
                difficultyBadge.textContent = difficulty.toUpperCase();
                difficultyBadge.className = `difficulty-badge ${difficulty}`;
            }
            
            // スコアリセット
            this.updateScore(0, 0);
            
            console.log('✅ ゲーム画面の表示完了');
        }, 50);
    }

    /**
     * リザルト画面を表示
     */
    showResultScreen(state: GameState): void {
        this.hideAllScreens();
        this.resultScreen.classList.add('active');
        
        // スコア表示
        const finalScore = document.getElementById('finalScore');
        if (finalScore) {
            finalScore.textContent = state.score.toString();
        }
        
        // 判定統計
        const perfectCount = document.getElementById('perfectCount');
        const goodCount = document.getElementById('goodCount');
        const badCount = document.getElementById('badCount');
        const missCount = document.getElementById('missCount');
        
        if (perfectCount) perfectCount.textContent = state.perfectCount.toString();
        if (goodCount) goodCount.textContent = state.goodCount.toString();
        if (badCount) badCount.textContent = state.badCount.toString();
        if (missCount) missCount.textContent = state.missCount.toString();
        
        // 精度計算
        const total = state.perfectCount + state.goodCount + state.badCount + state.missCount;
        const accuracy = total > 0 
            ? ((state.perfectCount + state.goodCount) / total * 100).toFixed(1)
            : '0.0';
        
        const accuracyElement = document.getElementById('accuracy');
        if (accuracyElement) {
            accuracyElement.textContent = `${accuracy}%`;
        }
    }

    /**
     * すべての画面を非表示
     */
    private hideAllScreens(): void {
        this.titleScreen.classList.remove('active');
        this.gameScreen.classList.remove('active');
        this.resultScreen.classList.remove('active');
    }

    /**
     * スコア更新
     */
    updateScore(score: number, combo: number): void {
        const scoreElement = document.getElementById('score');
        const comboElement = document.getElementById('combo');
        
        if (scoreElement) {
            scoreElement.textContent = score.toString();
        }
        
        if (comboElement) {
            comboElement.textContent = combo.toString();
            
            // コンボエフェクト
            if (combo > 0) {
                comboElement.classList.add('combo-active');
            } else {
                comboElement.classList.remove('combo-active');
            }
        }
    }

    /**
     * 判定メッセージを表示
     */
    showJudgment(message: string, color: string): void {
        const judgmentElement = document.getElementById('judgment');
        if (!judgmentElement) return;
        
        judgmentElement.textContent = message;
        judgmentElement.style.color = color;
        judgmentElement.classList.add('show');
        
        // 0.5秒後にフェードアウト
        setTimeout(() => {
            judgmentElement.classList.remove('show');
        }, 500);
    }

    /**
     * 音名に応じた色を取得
     */
    private getNoteColor(noteName: string): string {
        const colorMap: Record<string, string> = {
            'C': '#4ECDC4',      // シアン
            'C#': '#9B59B6',    // 紫
            'D': '#3498DB',     // 青
            'D#': '#5DADE2',   // ライトブルー
            'E': '#2ECC71',     // 緑
            'F': '#F39C12',    // オレンジ
            'F#': '#E74C3C',   // 赤
            'G': '#F1C40F',    // 黄
            'G#': '#E67E22',  // ダークオレンジ
            'A': '#E91E63',    // ピンク
            'A#': '#9C27B0',   // パープル
            'B': '#00BCD4'     // シアンブルー
        };
        
        return colorMap[noteName] || '#4ECDC4'; // デフォルト
    }

    /**
     * 色を暗くする
     */
    private darkenColor(hex: string, amount: number): string {
        const color = hex.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(color.substr(0, 2), 16) * (1 - amount)));
        const g = Math.max(0, Math.min(255, parseInt(color.substr(2, 2), 16) * (1 - amount)));
        const b = Math.max(0, Math.min(255, parseInt(color.substr(4, 2), 16) * (1 - amount)));
        
        return `#${Math.floor(r).toString(16).padStart(2, '0')}${Math.floor(g).toString(16).padStart(2, '0')}${Math.floor(b).toString(16).padStart(2, '0')}`;
    }

    /**
     * キーボードを生成
     */
    setupKeyboard(keys: string[]): void {
        console.log(`⌨️ 鍵盤を設定: ${keys.join(', ')}`);
        const keyboardElement = document.getElementById('keyboard');
        if (!keyboardElement) {
            console.error('❌ keyboard要素が見つかりません');
            return;
        }
        
        // 既存の鍵盤をクリア
        keyboardElement.innerHTML = '';
        console.log('✅ 既存の鍵盤をクリア');
        
        // 鍵盤のサイズを動的に計算（画面幅に応じて）
        const keyboardWidth = keyboardElement.clientWidth || window.innerWidth;
        const gap = 8; // gap: 0.5rem ≈ 8px
        const padding = 16; // padding: 1rem ≈ 16px
        const availableWidth = keyboardWidth - (padding * 2);
        const keyCount = keys.length;
        const calculatedKeyWidth = Math.floor((availableWidth - (gap * (keyCount - 1))) / keyCount);
        
        // モバイルでは最小サイズを確保
        const isMobile = window.innerWidth <= 768;
        const minKeyWidth = isMobile ? 45 : 60;
        const maxKeyWidth = isMobile ? 60 : 80;
        const keyWidth = Math.max(minKeyWidth, Math.min(maxKeyWidth, calculatedKeyWidth));
        
        // キーラベル（9つ目以降は追加キー: B, N, M）
        const keyLabels = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'B', 'N', 'M'];
        
        keys.forEach((note, index) => {
            const keyElement = document.createElement('div');
            keyElement.className = 'key';
            keyElement.dataset.lane = index.toString();
            
            // 動的にサイズを設定
            keyElement.style.width = `${keyWidth}px`;
            keyElement.style.minWidth = `${keyWidth}px`;
            keyElement.style.maxWidth = `${keyWidth}px`;
            
            // 音名に応じた色を設定
            const noteColor = this.getNoteColor(note);
            const noteColorDark = this.darkenColor(noteColor, 0.2); // 20%暗くする
            keyElement.style.borderColor = noteColor;
            keyElement.style.setProperty('--note-color', noteColor);
            keyElement.style.setProperty('--note-color-dark', noteColorDark);
            
            // キーラベルを取得（表示用）
            const keyLabel = keyLabels[index] || '';
            
            keyElement.innerHTML = `
                <div class="key-note">${note}</div>
                <div class="key-label">${keyLabel}</div>
            `;
            
            // タッチ/クリックイベント
            keyElement.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleKeyTouch(index);
            }, { passive: false });
            
            keyElement.addEventListener('touchend', (e) => {
                e.preventDefault();
            }, { passive: false });
            
            keyElement.addEventListener('click', () => {
                this.handleKeyTouch(index);
            });
            
            keyboardElement.appendChild(keyElement);
        });
        
        console.log(`✅ 鍵盤を${keys.length}個生成しました`);
    }

    /**
     * キーボードのキーをハイライト
     */
    highlightKey(index: number, active: boolean): void {
        const keyboard = document.getElementById('keyboard');
        if (!keyboard) return;
        
        const keys = keyboard.children;
        if (index >= 0 && index < keys.length) {
            if (active) {
                keys[index].classList.add('active');
            } else {
                keys[index].classList.remove('active');
            }
        }
    }

    /**
     * 鍵盤タップ時の処理
     */
    private handleKeyTouch(lane: number): void {
        if (this.onKeyTouch) {
            this.onKeyTouch(lane);
        }
    }

    /**
     * コールバック設定
     */
    setCallbacks(callbacks: {
        onDifficultySelect?: (difficulty: Difficulty) => void;
        onRetry?: () => void;
        onBackToTitle?: () => void;
        onPlayRecording?: () => void;
        onDownloadWAV?: () => void;
        onKeyTouch?: (lane: number) => void;
    }): void {
        this.onDifficultySelect = callbacks.onDifficultySelect;
        this.onRetry = callbacks.onRetry;
        this.onBackToTitle = callbacks.onBackToTitle;
        this.onPlayRecording = callbacks.onPlayRecording;
        this.onDownloadWAV = callbacks.onDownloadWAV;
        this.onKeyTouch = callbacks.onKeyTouch;
    }
}


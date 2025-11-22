# 🎵 Rhythm Synth Game

TypeScript + Web Audio APIで作る音楽リズムゲーム

## 🎯 概要

このプロジェクトは、**Pure TypeScript**と**Web Audio API**のみで実装した、演奏が「録音」として残るリズムゲームです。

### 🌟 最大の特徴

**プレイした内容が「あなただけの演奏」として再生できる！**

- 上手くプレイすれば綺麗なメロディー
- ミスや遅れは音に反映される
- WAVファイルとしてダウンロード可能

## ✨ 主な機能

### 🎮 ゲーム機能
- ✅ 4段階の難易度（Easy / Normal / Hard / Expert）
- ✅ リアルタイム判定（Perfect / Good / Bad / Miss）
- ✅ コンボシステム & スコア計算
- ✅ 難易度別の音符パターン生成

### 🎨 ビジュアル機能
- ✅ リアルタイム周波数スペクトラム可視化
- ✅ 判定時のパーティクルエフェクト
- ✅ 滑らかなアニメーション

### 🎵 音声機能
- ✅ Web Audio APIによるシンセサイザー
- ✅ 判定に応じた音質変化
- ✅ 演奏の録音 & 再生
- ✅ WAVファイル出力

## 🛠️ 技術スタック

```
- TypeScript (ES6+)
- Vite (ビルドツール)
- Web Audio API (音声生成・解析)
- Canvas API (ビジュアル)
```

**外部ライブラリ不要！** 完全にブラウザ標準APIで実装

## 🚀 セットアップ & 起動

### 必要な環境
- Node.js 20.x 以上
- npm 10.x 以上

### インストール

```bash
# 依存関係をインストール
npm install
```

### 開発サーバー起動

```bash
# 開発モード（ホットリロード有効）
npm run dev
```

ブラウザで `http://localhost:5173` にアクセス

### ビルド

```bash
# 本番用ビルド
npm run build

# プレビュー
npm run preview
```

## 🎮 遊び方

### 操作方法

| キー | 音符 |
|------|------|
| **A** | C（ド） |
| **S** | D（レ） |
| **D** | E（ミ） |
| **F** | F（ファ） |
| **G** | G（ソ） |
| **H** | A（ラ） |
| **J** | B（シ） |
| **K** | C#（ド#） |
| **L** | D#（レ#） |

※ 難易度によって使用する鍵盤数が変わります

### ゲームの流れ

1. **タイトル画面**で難易度を選択
2. **音符が上から降ってくる**
3. **判定ラインに来たらキーを押す**
4. **タイミングが合えばPerfect！**
5. **ゲーム終了後、演奏が再生される**
6. **WAVファイルでダウンロードも可能**

### 判定

| 判定 | タイミング | スコア | 音質 |
|------|-----------|--------|------|
| **Perfect** | ±20~50ms | 100点 | 綺麗な音 |
| **Good** | ±40~100ms | 50点 | やや良い音 |
| **Bad** | ±60~150ms | 10点 | 荒い音 |
| **Miss** | それ以上 | 0点 | 録音されない |

※ 難易度によってタイミングウィンドウが変化

## 📁 プロジェクト構成

```
src/
├── types/              # 型定義
│   ├── audio.ts       # 音声関連の型
│   ├── game.ts        # ゲーム関連の型
│   └── index.ts
├── audio/             # 音声モジュール
│   ├── SynthEngine.ts          # シンセサイザーエンジン
│   ├── SpectrumVisualizer.ts   # スペクトラム可視化
│   └── index.ts
├── game/              # ゲームロジック
│   ├── GameEngine.ts       # メインゲームエンジン
│   ├── NoteJudge.ts        # 判定システム
│   ├── TrackGenerator.ts   # トラック生成
│   └── index.ts
├── effects/           # ビジュアルエフェクト
│   ├── ParticleSystem.ts   # パーティクル
│   └── index.ts
├── ui/                # UI管理
│   ├── UIManager.ts
│   └── index.ts
├── utils/             # ユーティリティ
│   ├── WAVExporter.ts  # WAV出力
│   └── index.ts
├── main.ts            # エントリーポイント
└── style.css          # スタイルシート
```

## 🎓 技術的な見どころ

### 1. Web Audio API の活用

```typescript
// シンセサイザーで音を生成
const oscillator = audioContext.createOscillator();
oscillator.type = 'sine';
oscillator.frequency.value = 440; // A4
oscillator.connect(gainNode);
oscillator.start();
```

### 2. リアルタイムスペクトラム可視化

```typescript
// 周波数データを取得
const analyser = audioContext.createAnalyser();
analyser.fftSize = 2048;
const frequencyData = new Uint8Array(analyser.frequencyBinCount);
analyser.getByteFrequencyData(frequencyData);

// Canvas で描画
```

### 3. TypeScript での型安全な実装

```typescript
interface AudioEffects {
    waveform: 'sine' | 'square' | 'sawtooth' | 'triangle';
    volume: number;
    reverb: number;
    detune: number;
    filterFreq: number;
}
```

### 4. WAVファイル出力

```typescript
// AudioBuffer → WAVバイナリ → Blob → ダウンロード
const wavBlob = audioBufferToWav(buffer);
const url = URL.createObjectURL(wavBlob);
```

## 🎨 難易度別の仕様

| 難易度 | 速度 | 鍵盤数 | Perfect判定 | BPM |
|--------|------|--------|------------|-----|
| **Easy** | 200px/s | 3個 | ±50ms | 80 |
| **Normal** | 350px/s | 5個 | ±40ms | 120 |
| **Hard** | 500px/s | 7個 | ±30ms | 160 |
| **Expert** | 700px/s | 12個 | ±20ms | 200 |

## 🔧 カスタマイズ

### 難易度調整

`src/types/game.ts` の `DIFFICULTY_SETTINGS` を編集

```typescript
export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultyConfig> = {
    normal: {
        noteSpeed: 350,      // 速度を変更
        judgmentWindow: {
            perfect: 40,     // 判定を調整
            // ...
        },
        // ...
    }
};
```

### 音色変更

`src/audio/SynthEngine.ts` の波形設定を編集

```typescript
oscillator.type = 'sine';  // 'square', 'sawtooth', 'triangle'
```

## 📝 Qiita記事について

このプロジェクトは、以下のテーマでQiita記事を作成予定：

- TypeScriptでの型設計の実践
- Web Audio APIの活用方法
- リアルタイム処理の最適化
- Canvas APIでのビジュアライゼーション
- WAVファイル出力の仕組み

## 🐛 既知の問題

- Safari でオーディオコンテキストの再開に時間がかかる場合がある
- モバイルでのタッチ操作は未対応（キーボード必須）

## 📄 ライセンス

MIT License - 自由に使用・改変・配布できます

## 👨‍💻 作者

[@your-github-username](https://github.com/your-github-username)

---

## 🎉 楽しんでください！

このゲームは、プログラミングの学習と音楽の楽しさを組み合わせたプロジェクトです。

ぜひプレイして、あなたの演奏を録音してみてください！ 🎵


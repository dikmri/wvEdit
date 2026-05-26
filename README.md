# wvEdit

ブラウザで動作する軽量ノンリニア動画編集Webアプリ。インストール不要・無料・ローカル処理完結。

🔗 **[GitHub Pagesで開く](https://d-marui.github.io/wvEdit/)**

## 特徴

- 動画ファイルをサーバーへアップロードしない（ローカル処理）
- MP4動画のカット・削除・移動・トリミング
- タイムラインでの直感的な編集
- ffmpeg.wasmによるMP4書き出し
- プロジェクトのJSON保存/復元
- Undo/Redo対応

## 対応環境

- Google Chrome 最新版（推奨）
- Microsoft Edge 最新版

## 使い方

1. 「素材読み込み」から動画ファイルを読み込む
2. タイムラインへドラッグ&ドロップで配置
3. 再生/停止: **Space**
4. クリップを分割: **S**（再生ヘッド位置で分割）
5. 選択クリップを削除: **Delete** または **Backspace**
6. Undo: **Ctrl+Z** / Redo: **Ctrl+Y**
7. 「書き出し」ボタンからMP4として書き出す

## キーボードショートカット

| キー | 機能 |
|---|---|
| Space | 再生/停止 |
| S | 再生ヘッド位置で分割 |
| Delete / Backspace | 選択クリップを削除 |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+S | プロジェクト保存 |
| ← | 前フレーム |
| → | 次フレーム |
| Shift+← | 1秒戻る |
| Shift+→ | 1秒進む |

## 開発環境

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
```

## テスト

```bash
npm test
```

## 技術スタック

- Svelte + TypeScript + Vite
- Tailwind CSS
- ffmpeg.wasm（@ffmpeg/ffmpeg）
- Vitest

## MVPの実装状況

- [x] MP4動画の読み込み
- [x] プレビュー再生/停止/シーク
- [x] タイムラインへの配置（D&D）
- [x] クリップ選択/移動/削除
- [x] クリップ分割（Sキー）
- [x] クリップトリミング（左右端ドラッグ）
- [x] Undo/Redo
- [x] MP4書き出し（ffmpeg.wasm）
- [x] プロジェクトJSON保存/復元
- [x] GitHub Pagesデプロイ

## 今後の予定 (Phase 2)

- BGM/SEの追加
- テキスト/字幕
- 画像の追加
- 音量調整・フェード
- 縦動画（9:16）書き出しプリセット

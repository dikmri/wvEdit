# wvEdit 設計書 / Claude Code 実装指示書

作成日: 2026-05-26  
対象アプリ名: **wvEdit**  
想定公開先: **GitHub Pages**  
想定開発支援: **Claude Code**  
採用フロントエンド: **Svelte + TypeScript + Vite**  
対象ユーザー: Premiere Proを購入できない、または重い・難しいと感じるアマチュア、YouTuber、個人クリエイター、セミプロ層

---

## 1. アプリ概要

**wvEdit** は、ブラウザ上で動作する軽量ノンリニア動画編集Webアプリである。

Premiere Proのような業務向け総合制作環境ではなく、YouTube、SNS、個人制作向けに必要な編集機能へ絞り、以下を重視する。

- インストール不要
- 無料で利用可能
- GitHub Pagesで公開可能
- 動画ファイルをサーバーにアップロードしない
- ローカルPC内で編集・書き出しを完結する
- カット、字幕、テロップ、BGM、SE、モザイク、簡易カラー補正などを快適に行える
- 将来的にPremiere Elements相当の編集体験を目指す

初期段階では、短尺〜中尺動画向けとする。  
2時間映画、何百時間もの録画素材、大規模ドキュメンタリー編集、放送局向けワークフロー、HDR/Log/10bit中心の本格カラー管理は初期対象外とする。

---

## 2. 採用技術の判断

### 2.1 なぜSvelte + TypeScript + Viteにするのか

wvEditは動画編集アプリであり、重い処理の中心は以下である。

- 動画デコード
- プレビュー描画
- Canvas / WebGL / WebGPU合成
- ffmpeg.wasmによる書き出し
- Web Workerでのサムネイル生成
- Web Workerでの音声波形生成

そのため、フロントエンドフレームワーク単体で動画処理性能が決まるわけではない。  
しかし、タイムラインUI、再生ヘッド、クリップのドラッグ、インスペクタ更新など、細かいUI更新が大量に発生するため、UI層は軽量であることが望ましい。

Svelteはコンパイル時に効率的なJavaScriptへ変換され、実行時のフレームワーク負荷を抑えやすい。  
また、過去にSvelteで簡易モザイク編集ソフトを作成した経験を活かせるため、本プロジェクトでは **Svelte + TypeScript + Vite** を採用する。

### 2.2 Reactを採用しない理由

React + TypeScriptはエコシステムが大きく、Claude Codeでも実装例が多い。  
しかし、wvEditでは以下の理由からReactを初期採用しない。

- タイムラインUIの細かい更新ではSvelteの方が軽く作りやすい
- GitHub Pages向けの静的Webアプリなので、巨大なフレームワークエコシステムは必須ではない
- 本アプリでは動画処理をWorker/Canvas/ffmpeg.wasm/WebCodecsへ逃がすため、UI層は薄く保ちたい
- 既にSvelteで動画系ツールの開発経験がある

### 2.3 SvelteKitについて

本アプリは基本的に1画面の動画編集SPAであり、SSRや複雑なルーティングを必要としない。  
そのため、初期段階では **SvelteKitではなく、Svelte + Vite** を採用する。

将来的に以下が必要になった場合のみSvelteKitを検討する。

- 複数ページ構成
- ドキュメントサイト統合
- ルーティングが必要な管理画面
- SSR/SSGが必要なランディングページ

---

## 3. 開発思想

### 3.1 目標

wvEditの目標は「Web版Premiere Pro」ではない。  
目標は以下である。

> Premiere Proを使うほどではないが、ブラウザだけで実用的な動画編集をしたい人向けの軽量NLE

特に以下の用途を重視する。

- YouTube動画編集
- Shorts / TikTok / Instagram Reels向け縦動画編集
- ゲーム実況のカット編集
- 解説動画のテロップ編集
- BGM / SE追加
- 簡易字幕編集
- モザイク / ぼかし処理
- 軽量なSNS向けMP4書き出し

### 3.2 非目標

初期段階では以下を非目標とする。

- Premiere Pro完全互換
- 放送局・映画制作向けワークフロー
- チーム編集
- クラウドメディア管理
- AI自動編集
- 外部プラグイン互換
- Frame.io等の外部オンラインサービス連携
- ProRes / DNxHD / RAW等の業務用コーデック完全対応
- HDR / Log / 10bitの正確なカラー管理
- 高度なマルチカム編集
- 完全なスマートレンダリング
- 長尺・大容量動画の安定書き出し保証

---

## 4. 対応環境

### 4.1 推奨ブラウザ

初期段階では以下を推奨環境とする。

- Google Chrome 最新版
- Microsoft Edge 最新版

理由:

- File System Access APIを利用しやすい
- WebCodecs / WebAssembly / Web Worker周りの対応が比較的安定している
- GitHub Pages上の静的Webアプリとして公開しやすい

### 4.2 非推奨ブラウザ

初期段階では以下は完全対応しない。

- Safari
- Firefox
- iOS Safari
- Androidの一部ブラウザ

ただし、ファイル読み込みや基本UIなど、可能な範囲ではフォールバック対応する。

### 4.3 GitHub Pages前提

GitHub Pagesは静的サイトホスティングであり、サーバーサイド処理は利用しない。  
そのため、wvEditは以下の方針を取る。

- 動画素材はユーザーのローカルPCから読み込む
- 動画素材をGitHub Pagesや外部サーバーへアップロードしない
- 編集処理はブラウザ内で実行する
- 書き出し処理は初期段階ではffmpeg.wasmを利用する
- 生成ファイルはユーザーのローカルへ保存する
- サイト本体は静的ファイルとして配信する

---

## 5. 技術スタック

### 5.1 基本構成

| 領域 | 採用技術 | 理由 |
|---|---|---|
| フロントエンド | Svelte + TypeScript | 軽量UI、細かい状態更新に強い、既存経験を活かせる |
| ビルド | Vite | 軽量・高速・GitHub Pages公開が容易 |
| スタイル | Tailwind CSS | UI調整が容易で軽量 |
| 状態管理 | Svelte store / custom store | 外部状態管理ライブラリを増やしすぎない |
| 動画プレビュー | HTMLVideoElement + Canvas | MVPで現実的 |
| タイムラインUI | DOM + CSSから開始 | MVP実装を優先。必要に応じてCanvas化 |
| 動画処理 | ffmpeg.wasm | ブラウザ内で動画変換・書き出しが可能 |
| 将来の高速化 | WebCodecs | 低レベルな動画エンコード/デコード制御 |
| 重い処理 | Web Worker | UIフリーズ防止 |
| ファイル操作 | File System Access API + fallback | Chrome/Edgeでは直接保存、非対応環境ではdownload fallback |
| プロジェクト保存 | JSON | 復元しやすくClaude Codeでも扱いやすい |
| テスト | Vitest | ロジック単体テスト |
| Lint | ESLint + TypeScript | 品質維持 |
| Format | Prettier | コード整形 |

### 5.2 初期採用ライブラリ候補

以下を候補とする。ただし、過剰な依存は避ける。

```txt
svelte
vite
typescript
tailwindcss
@ffmpeg/ffmpeg
@ffmpeg/util
lucide-svelte
vitest
eslint
prettier
```

ドラッグ操作やタイムライン操作については、最初から重いライブラリに依存しすぎない。  
必要になった段階で導入を検討する。

### 5.3 Svelte 5 / Runes 方針

Svelte 5を利用する場合、Runesを使うかどうかをプロジェクト開始時に決める。  
Claude Codeが従来構文とRunesを混在させると保守性が落ちるため、以下のいずれかに統一する。

#### 方針A: Svelte 5 + Runesを使う

- 新しいSvelte構文に寄せる
- `.svelte.ts` に状態ロジックを切り出しやすい
- 将来的なSvelte標準に寄せやすい

#### 方針B: 従来寄りのSvelte storeを使う

- 実装例が多く、Claude Codeが安定して書きやすい
- `writable`, `derived`, `get` などを中心にする
- 初期MVPではこちらの方が安全

本設計書では、初期MVPでは **方針B: 従来寄りのSvelte store** を推奨する。  
MVP完了後、必要に応じてRunes移行を検討する。

---

## 6. アーキテクチャ方針

### 6.1 レイヤー分離

動画編集アプリは肥大化しやすいため、以下のレイヤーを分離する。

```txt
UI Layer
  - Svelte components
  - Timeline view
  - Preview panel
  - Inspector panel

State Layer
  - Svelte stores
  - Project state
  - Timeline state
  - Selection state
  - Playback state

Domain Layer
  - Timeline model
  - Clip model
  - Track model
  - Edit operations
  - Time conversion utilities

Media Layer
  - File loading
  - Video metadata parsing
  - Thumbnail generation
  - Audio waveform generation

Render / Export Layer
  - Preview render
  - ffmpeg.wasm export
  - future WebCodecs export

Persistence Layer
  - Project JSON save/load
  - Local autosave
```

### 6.2 処理層の独立

将来的にTauri版やローカルFFmpeg連携を可能にするため、動画書き出し処理はUIから分離する。

```txt
src/lib/exporters/
  browser-ffmpeg-exporter.ts
  export-types.ts
  future-webcodecs-exporter.ts
```

UIは直接ffmpegを呼ばず、Exporterインターフェース経由で書き出す。

---

## 7. ディレクトリ構成

推奨ディレクトリ構成は以下。

```txt
wvEdit/
  public/
    favicon.svg
  src/
    app.css
    main.ts
    App.svelte

    lib/
      components/
        layout/
          AppLayout.svelte
          TopBar.svelte
          Sidebar.svelte
        timeline/
          Timeline.svelte
          TimelineTrack.svelte
          TimelineClip.svelte
          TimelineRuler.svelte
          Playhead.svelte
        preview/
          PreviewPanel.svelte
          VideoPreview.svelte
          PreviewControls.svelte
        inspector/
          InspectorPanel.svelte
          ClipInspector.svelte
        media/
          MediaPanel.svelte
          MediaItem.svelte
        common/
          Button.svelte
          Modal.svelte
          ProgressDialog.svelte

      domain/
        project.ts
        timeline.ts
        clip.ts
        track.ts
        operations.ts
        time.ts

      media/
        file-loader.ts
        metadata-reader.ts
        thumbnail-generator.ts
        waveform-generator.ts

      exporters/
        export-types.ts
        browser-ffmpeg-exporter.ts

      stores/
        project-store.ts
        playback-store.ts
        ui-store.ts
        history-store.ts

      workers/
        ffmpeg.worker.ts
        thumbnail.worker.ts
        waveform.worker.ts

      persistence/
        project-json.ts
        autosave.ts
        file-system.ts

      shortcuts/
        shortcut-map.ts
        shortcut-handler.ts

      types/
        project.ts
        media.ts
        timeline.ts
        export.ts

  docs/
    architecture.md
    project-format.md
    export-spec.md
    timeline-spec.md

  index.html
  package.json
  vite.config.ts
  tsconfig.json
  README.md
```

---

## 8. データモデル

### 8.1 Project

```ts
export type WvEditProject = {
  appName: "wvEdit";
  version: string;
  projectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  settings: ProjectSettings;
  assets: MediaAsset[];
  timeline: Timeline;
};
```

### 8.2 ProjectSettings

```ts
export type ProjectSettings = {
  width: number;
  height: number;
  fps: number;
  sampleRate: number;
  aspectRatio: "16:9" | "9:16" | "1:1" | "custom";
  backgroundColor: string;
};
```

### 8.3 MediaAsset

```ts
export type MediaAsset = {
  id: string;
  type: "video" | "audio" | "image";
  name: string;
  fileName: string;
  objectUrl?: string;
  duration: number;
  width?: number;
  height?: number;
  fps?: number;
  size: number;
  mimeType: string;
  createdAt: string;
};
```

注意:  
`objectUrl` はセッション内のみ有効とし、プロジェクトJSONへ永続保存しない。  
プロジェクト読み込み時には素材ファイルの再選択を促す。

### 8.4 Timeline

```ts
export type Timeline = {
  duration: number;
  tracks: Track[];
};
```

### 8.5 Track

```ts
export type Track = {
  id: string;
  type: "video" | "audio" | "text" | "image";
  name: string;
  muted: boolean;
  locked: boolean;
  clips: Clip[];
};
```

### 8.6 Clip

```ts
export type Clip = {
  id: string;
  assetId: string;
  type: "video" | "audio" | "text" | "image";
  trackId: string;

  timelineStart: number;
  timelineEnd: number;

  sourceStart: number;
  sourceEnd: number;

  name: string;
  selected: boolean;

  transform?: ClipTransform;
  audio?: AudioSettings;
  text?: TextSettings;
  effects?: Effect[];
};
```

### 8.7 ClipTransform

```ts
export type ClipTransform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
};
```

### 8.8 AudioSettings

```ts
export type AudioSettings = {
  volume: number;
  muted: boolean;
  fadeIn: number;
  fadeOut: number;
};
```

### 8.9 TextSettings

```ts
export type TextSettings = {
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor?: string;
  bold: boolean;
  italic: boolean;
  align: "left" | "center" | "right";
};
```

### 8.10 Effect

```ts
export type Effect = {
  id: string;
  type: "blur" | "mosaic" | "brightness" | "contrast" | "saturation";
  enabled: boolean;
  params: Record<string, number | string | boolean>;
};
```

---

## 9. Svelte Store設計

### 9.1 project-store.ts

プロジェクト全体を管理する。

管理対象:

- project
- assets
- timeline
- selectedClipIds
- dirty flag

主な操作:

- createProject
- loadProject
- saveProject
- addAsset
- addClip
- updateClip
- deleteClip
- splitClip
- trimClip
- moveClip

### 9.2 playback-store.ts

再生状態を管理する。

管理対象:

- isPlaying
- currentTime
- duration
- fps
- previewScale
- activeAssetId

主な操作:

- play
- pause
- seek
- stepForward
- stepBackward

### 9.3 ui-store.ts

UI状態を管理する。

管理対象:

- selectedPanel
- timelineZoom
- exportDialogOpen
- loadingState
- errorMessage
- progress

### 9.4 history-store.ts

Undo/Redoを管理する。

管理対象:

- undoStack
- redoStack

対象操作:

- clip add
- clip delete
- clip split
- clip trim
- clip move
- clip update

注意:  
動画再生中のcurrentTime更新など、履歴に入れるべきではない状態はhistoryに含めない。

---

## 10. 画面構成

### 10.1 基本レイアウト

Premiere系の一般的な編集UIを参考にしつつ、初心者でも扱いやすいシンプルな構成とする。

```txt
+-----------------------------------------------------------+
| TopBar: ロゴ / 新規 / 開く / 保存 / 書き出し / 設定        |
+-------------------+-----------------------+---------------+
| Media Panel       | Preview Panel         | Inspector     |
|                   |                       |               |
| 素材一覧           | 動画プレビュー          | 選択クリップ設定 |
|                   |                       |               |
+-------------------+-----------------------+---------------+
| Timeline                                                 |
|  Track 1: Video                                           |
|  Track 2: Audio                                           |
+-----------------------------------------------------------+
```

### 10.2 TopBar

機能:

- 新規プロジェクト
- プロジェクトを開く
- プロジェクト保存
- 動画読み込み
- 書き出し
- Undo
- Redo
- 設定
- ヘルプ

### 10.3 Media Panel

機能:

- 動画/音声/画像ファイルの読み込み
- 読み込んだ素材一覧表示
- サムネイル表示
- 素材名、長さ、解像度の表示
- タイムラインへのD&D配置

### 10.4 Preview Panel

機能:

- 再生/停止
- シーク
- 現在時間表示
- 総尺表示
- 前フレーム/次フレーム移動
- 表示倍率変更
- アスペクト比確認

### 10.5 Inspector Panel

選択中クリップに応じて表示を切り替える。

動画クリップ:

- 位置
- 拡大率
- 回転
- 透明度
- 音量
- フェード
- 簡易エフェクト

テキストクリップ:

- テキスト内容
- フォントサイズ
- 色
- 背景色
- 太字
- 斜体
- 位置
- 表示時間

音声クリップ:

- 音量
- ミュート
- フェードイン
- フェードアウト

### 10.6 Timeline

MVPでは以下を実装する。

- 時間目盛り
- 再生ヘッド
- 1映像トラック
- 1音声トラック
- クリップ選択
- クリップ移動
- クリップ分割
- クリップ削除
- クリップトリミング
- ズームイン/ズームアウト

---

## 11. MVP段階

MVPは「最小限の動画編集体験が一通り成立する」ことを目的とする。  
この段階では、凝ったエフェクトや複数トラックは実装しない。

### 11.1 MVPのゴール

以下ができればMVP完了とする。

1. GitHub Pagesでアプリを開ける
2. MP4動画を読み込める
3. 動画をプレビュー再生できる
4. タイムラインに動画を配置できる
5. タイムライン上で分割・削除・並び替えができる
6. 編集結果をMP4として書き出せる
7. プロジェクトをJSONとして保存・復元できる

### 11.2 MVP対象機能

| 機能 | 必須度 | 内容 |
|---|---|---|
| 新規プロジェクト | 必須 | デフォルト16:9、1920x1080、30fps |
| 動画読み込み | 必須 | MP4中心 |
| プレビュー再生 | 必須 | HTMLVideoElementで再生 |
| タイムライン配置 | 必須 | 1動画トラック |
| 分割 | 必須 | 再生ヘッド位置でクリップを分割 |
| 削除 | 必須 | 選択クリップを削除 |
| 移動 | 必須 | クリップの開始位置を変更 |
| トリミング | 必須 | クリップ左右端をドラッグしてsourceStart/sourceEnd変更 |
| 書き出し | 必須 | ffmpeg.wasmでMP4出力 |
| プロジェクト保存 | 必須 | JSON保存 |
| プロジェクト読み込み | 必須 | JSONから復元 |
| Undo/Redo | 必須 | 分割、削除、移動、トリミング対象 |
| エラー表示 | 必須 | 読み込み失敗、書き出し失敗を表示 |

### 11.3 MVPではやらないこと

- 複数動画トラック
- 複数音声トラック
- テキスト/字幕
- BGM/SE追加
- モザイク
- カラー補正
- トランジション
- キーフレーム
- WebCodecsベースの独自エンコード
- HDR/Log/10bit
- マルチカム
- AI機能

---

## 12. Phase 0: 技術検証

Claude Codeは、MVP本実装前に以下の技術検証を行う。

### 12.1 検証項目

1. Svelte + TypeScript + Vite + Tailwind CSSのGitHub Pages配信
2. MP4ファイルのD&D読み込み
3. HTMLVideoElementでの再生/停止/シーク
4. 動画メタデータ取得
5. タイムラインUIの試作
6. 再生ヘッドとvideo.currentTimeの同期
7. ffmpeg.wasmの読み込み
8. ffmpeg.wasmで動画の一部分を書き出し
9. Web Workerでffmpeg処理を分離
10. プロジェクトJSON保存/読み込み

### 12.2 Phase 0 完了条件

以下を満たしたらPhase 0完了。

- ローカル開発環境でMP4を読み込める
- シークバー操作と動画再生が同期する
- ffmpeg.wasmで短いMP4を書き出せる
- GitHub Pagesにデプロイできる
- READMEに技術検証結果を記録する

---

## 13. Phase 1: MVP実装

### 13.1 実装範囲

Phase 1では、MVPを完成させる。

#### 13.1.1 プロジェクト作成

- 起動時に空プロジェクトを作成
- デフォルト設定:
  - 解像度: 1920x1080
  - fps: 30
  - アスペクト比: 16:9
  - サンプルレート: 48000

#### 13.1.2 動画読み込み

- ファイル選択
- D&D
- MP4優先
- 読み込み後、Media Panelに表示
- メタデータ:
  - duration
  - width
  - height
  - mimeType
  - file size

#### 13.1.3 タイムライン配置

- Media PanelからタイムラインへD&D
- MVPでは1映像トラックのみ
- クリップの重なりは原則禁止
- 重なった場合は自動で後ろへスナップ、または警告表示

#### 13.1.4 編集操作

- クリップ選択
- クリップ移動
- クリップ削除
- 再生ヘッド位置で分割
- クリップ端ドラッグによるトリミング
- Undo/Redo

#### 13.1.5 プレビュー

- 再生/停止
- Spaceキーで再生/停止
- タイムラインクリックでシーク
- 再生ヘッドとvideo.currentTimeを同期
- 現在時刻を `HH:MM:SS:FF` 形式で表示

#### 13.1.6 書き出し

- ffmpeg.wasmを使用
- MVPでは再エンコードありの正確書き出しを標準とする
- 出力形式:
  - MP4
  - H.264
  - AAC
- 書き出し中はProgressDialogを表示
- 書き出し完了後、downloadリンクまたはFile System Access APIで保存

#### 13.1.7 プロジェクト保存/読み込み

- `.wvedit.json` として保存
- JSONには素材ファイルの絶対パスを保存しない
- 再読み込み時は素材ファイルの再選択を促す
- 素材名とファイルサイズで再リンク補助を行う

### 13.2 Phase 1 完了条件

以下を満たしたらPhase 1完了。

- 1本のMP4を読み込める
- タイムラインでカット編集できる
- 不要部分を削除できる
- 編集結果を書き出せる
- プロジェクト保存/復元できる
- GitHub Pagesで動作する
- 基本操作のREADMEがある

---

## 14. Phase 2: YouTuber向け実用機能

Phase 2では、YouTube/SNS編集で必要な機能を追加する。

### 14.1 機能一覧

| 機能 | 内容 |
|---|---|
| 複数素材読み込み | 複数動画/音声/画像を読み込む |
| 複数クリップ配置 | 1トラック上に複数クリップを並べる |
| BGM追加 | 音声ファイルを音声トラックに配置 |
| SE追加 | 短い音声素材を配置 |
| 音量調整 | クリップごとの音量 |
| フェード | 音声/映像のフェードイン・アウト |
| テキスト | 動画上に文字を配置 |
| 字幕 | 字幕クリップをタイムラインに配置 |
| 画像追加 | PNG/JPG/WebPを重ねる |
| アスペクト比プリセット | 16:9 / 9:16 / 1:1 |
| 書き出しプリセット | YouTube / Shorts / SNS / 汎用MP4 |

### 14.2 テキスト/字幕仕様

テキストクリップは独立したTrackに配置する。

```ts
type TextClip = Clip & {
  type: "text";
  text: TextSettings;
};
```

字幕はテキストクリップの一種として扱う。  
将来的にSRTインポート/エクスポートを追加できるようにする。

### 14.3 BGM/SE仕様

- 音声トラックを追加
- 音量調整可能
- フェードイン/アウト可能
- MVP時点では波形表示なしでもよい
- Phase 2後半で簡易波形生成を追加

### 14.4 Phase 2 完了条件

- YouTube動画に必要な最低限の編集ができる
- テロップを追加できる
- BGM/SEを追加できる
- 縦動画を書き出せる
- 書き出しプリセットを選べる

---

## 15. Phase 3: 軽量NLE完成版

Phase 3では、Premiere Elements相当を意識した機能を追加する。

### 15.1 機能一覧

| 機能 | 内容 |
|---|---|
| 複数映像トラック | 2〜3トラック程度から開始 |
| 複数音声トラック | BGM/SE/音声を分ける |
| 音声波形 | カット位置を合わせやすくする |
| モザイク | 矩形範囲にモザイク |
| ぼかし | 矩形/全体ぼかし |
| 簡易カラー補正 | 明るさ/コントラスト/彩度/色温度 |
| トランジション | クロスフェード等 |
| キーフレーム | transform/opacity/volumeから開始 |
| 自動保存 | IndexedDBまたはLocalStorage |
| ショートカットカスタム | JSON定義で変更可能 |

### 15.2 複数トラック仕様

- video track: 最大3本から開始
- audio track: 最大5本から開始
- text track: 最大3本から開始
- image track: video trackと同じ合成処理で扱う

### 15.3 エフェクト仕様

初期エフェクト:

- brightness
- contrast
- saturation
- blur
- mosaic
- opacity
- scale
- rotate
- position

高度なエフェクトは将来対応。

### 15.4 キーフレーム仕様

Phase 3では以下のみ対応。

- 位置
- 拡大率
- 回転
- 透明度
- 音量

補間方式:

- linear
- hold

ease-in/ease-outは将来対応。

---

## 16. Phase 4: 将来拡張

Phase 4では、Premiere Proを起動しなくても済む場面を増やす。

### 16.1 候補機能

| 機能 | 優先度 | 備考 |
|---|---|---|
| プロキシ編集 | 高 | 長めの動画を軽く扱う |
| LUT対応 | 中 | カラー補正強化 |
| SRTインポート/エクスポート | 高 | 字幕用途で重要 |
| テキストテンプレート | 高 | YouTuber向け |
| WebGPUプレビュー | 中 | 対応環境限定 |
| WebCodecs書き出し | 中 | ffmpeg.wasm代替 |
| Tauri版 | 中〜高 | ローカルFFmpeg連携 |
| ローカルFFmpeg連携 | 高 | 長尺/高品質書き出し対策 |
| 簡易マルチカム | 低〜中 | 最大2〜3カメラ |
| 簡易トラッキング | 低〜中 | モザイク追従など |

### 16.2 Tauri版を見据えた設計

Web版のUIやドメインロジックはそのまま使い、書き出し層だけ差し替えられるようにする。

```ts
export interface Exporter {
  export(project: WvEditProject, options: ExportOptions): Promise<ExportResult>;
}
```

実装候補:

```txt
BrowserFfmpegExporter
BrowserWebCodecsExporter
TauriLocalFfmpegExporter
ServerSideExporter
```

---

## 17. 書き出し仕様

### 17.1 初期書き出し

MVPではffmpeg.wasmを利用する。

出力:

- container: mp4
- video codec: h264
- audio codec: aac
- fps: project settings
- resolution: project settings

### 17.2 書き出しモード

将来的に以下のモードを用意する。

| モード | 内容 |
|---|---|
| 標準 | 再エンコードあり。正確性優先 |
| 高速 | 可能な範囲で再エンコードを避ける。キーフレーム単位になる可能性あり |
| 高品質 | ビットレート高め。時間がかかる |
| 軽量 | SNS向けに容量を抑える |

MVPでは「標準」のみ実装する。

### 17.3 長時間動画への方針

ブラウザの制約上、長時間・大容量動画の書き出しは保証しない。

初期目安:

- 推奨: 30分以内
- 実用想定: 5〜20分程度
- 非推奨: 1時間以上
- 初期警告: ファイルサイズが大きい場合、書き出し前に警告表示

### 17.4 書き出しエラー

以下のエラーをユーザーに表示する。

- メモリ不足
- ffmpeg.wasm読み込み失敗
- 対応していない形式
- 書き出し失敗
- ブラウザがクラッシュする可能性がある大容量処理

---

## 18. プレビュー仕様

### 18.1 MVP

MVPではHTMLVideoElementを中心に実装する。

- 1クリップ再生
- タイムライン上の再生ヘッドと同期
- 分割後クリップのsourceStart/sourceEndを考慮して再生

### 18.2 Phase 2以降

Phase 2以降はCanvas合成を検討する。

- テキスト重ね
- 画像重ね
- 簡易エフェクト
- 低解像度プレビュー

### 18.3 Phase 3以降

- 複数トラック合成
- WebGLまたはWebGPUによる高速化
- プレビュー解像度切り替え
  - full
  - 1/2
  - 1/4

---

## 19. Svelte実装上の注意

### 19.1 再生ヘッド更新

再生ヘッドは頻繁に更新される。  
Svelte storeの更新でタイムライン全体が再描画されないよう注意する。

方針:

- `requestAnimationFrame` で再生ヘッド位置を更新
- 再生ヘッドコンポーネントのみ更新されるようにする
- タイムライン全体のDOM更新を避ける
- CSS transformで移動する

### 19.2 ドラッグ操作

クリップ移動やトリミングではmousemoveが大量に発生する。

方針:

- pointer eventsを使う
- 移動中は一時状態として管理
- 確定時のみproject-storeへ反映
- 必要に応じてthrottleする

### 19.3 タイムライン描画

MVPではDOMで実装する。  
クリップ数が増えて重くなった場合はCanvas化を検討する。

方針:

- 初期: DOM + CSS
- 中期: 表示範囲のみ描画
- 将来: Canvas/WebGL描画

### 19.4 Store更新

以下のような高頻度更新をproject-storeに入れすぎない。

- currentTime
- mouse position
- drag preview position
- hover state

これらはplayback-storeまたはUIローカル状態で管理する。

---

## 20. ショートカット仕様

MVPで実装するショートカット。

| キー | 機能 |
|---|---|
| Space | 再生/停止 |
| S | 再生ヘッド位置で分割 |
| Delete / Backspace | 選択クリップ削除 |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+S | プロジェクト保存 |
| ← | 少し戻る |
| → | 少し進む |
| Shift+← | 1秒戻る |
| Shift+→ | 1秒進む |

Mac対応は将来検討。  
MVPではWindows/Chromeを主想定とする。

---

## 21. パフォーマンス方針

### 21.1 基本方針

- UIスレッドをブロックしない
- 重い処理はWeb Workerへ分離
- タイムライン描画は必要な範囲のみ更新
- サムネイルや波形はキャッシュする
- 書き出し中は進捗を表示する
- 大容量動画には警告を出す

### 21.2 タイムライン

MVPではDOMベースで実装する。  
クリップ数が増えた場合は仮想化またはCanvas描画に移行する。

### 21.3 サムネイル

Phase 1では任意。  
Phase 2以降で実装。

- 低解像度で生成
- 生成結果をキャッシュ
- Workerで処理

### 21.4 波形

Phase 2後半またはPhase 3で実装。

- 音声を低解像度サンプルに変換
- Workerで処理
- 表示用データのみ保持

---

## 22. エラーハンドリング

### 22.1 基本方針

エラーは隠さず、ユーザーに分かりやすく表示する。

例:

- 「この動画形式は現在対応していません。MP4/H.264/AAC形式への変換を試してください。」
- 「動画が大きいため、ブラウザが停止する可能性があります。」
- 「書き出しに失敗しました。短い範囲で試すか、解像度を下げてください。」
- 「プロジェクトを復元しましたが、素材ファイルの再選択が必要です。」

### 22.2 ログ

開発中はコンソールログを残す。

ログ種別:

- file-load
- timeline-operation
- playback
- export
- project-save
- project-load
- error

本番では必要最小限にする。

---

## 23. 保存仕様

### 23.1 プロジェクトファイル

拡張子:

```txt
.wvedit.json
```

保存内容:

- プロジェクト設定
- タイムライン
- クリップ情報
- 素材メタデータ
- テキスト情報
- エフェクト情報

保存しない内容:

- 動画ファイル本体
- 音声ファイル本体
- 画像ファイル本体
- ローカル絶対パス

### 23.2 素材再リンク

プロジェクト読み込み時、素材ファイル本体は再選択が必要。

再リンク補助:

- ファイル名
- ファイルサイズ
- duration
- mimeType

一致するファイルが選択された場合、assetIdに再リンクする。

---

## 24. GitHub Pages公開仕様

### 24.1 Vite設定

`vite.config.ts` では、GitHub Pagesのリポジトリ名に応じてbaseを設定する。

例:

```ts
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  base: "/wvEdit/",
  plugins: [svelte()],
});
```

### 24.2 GitHub Actions

GitHub Actionsで自動デプロイする。

`.github/workflows/deploy.yml` を作成する。

### 24.3 注意点

- 動画素材をリポジトリに含めない
- ffmpeg.wasm関連ファイルが大きくなりすぎないよう注意
- GitHub Pagesのサイズ制限に注意
- publicディレクトリに大容量サンプル動画を置かない
- サンプル動画が必要な場合は短い数秒の軽量ファイルにする

---

## 25. UIデザイン方針

### 25.1 トーン

- 黒基調またはダークテーマ
- Premiere風だが複雑にしすぎない
- 初心者でも操作箇所が分かる
- タイムラインの視認性を重視

### 25.2 優先順位

見た目の派手さより以下を優先する。

1. 再生が軽い
2. シークが軽い
3. カット操作が直感的
4. 書き出しが分かりやすい
5. エラーが分かりやすい

---

## 26. 実装順序

Claude Codeは以下の順番で実装すること。

### Step 1: プロジェクト初期化

- Svelte + TypeScript + Vite
- Tailwind CSS
- ESLint / Prettier
- 基本レイアウト

### Step 2: データモデル

- Project
- Asset
- Timeline
- Track
- Clip
- Time utility

### Step 3: Store実装

- project-store
- playback-store
- ui-store
- history-store

### Step 4: ファイル読み込み

- MP4読み込み
- objectURL作成
- メタデータ取得
- Media Panel表示

### Step 5: プレビュー

- VideoPreview.svelte実装
- 再生/停止
- シーク
- 現在時刻表示

### Step 6: タイムラインMVP

- TimelineRuler
- Track
- Clip
- Playhead
- クリックでシーク

### Step 7: 編集操作

- クリップ配置
- 選択
- 移動
- 分割
- 削除
- トリミング
- Undo/Redo

### Step 8: プロジェクト保存/読み込み

- JSON保存
- JSON読み込み
- 素材再リンク

### Step 9: 書き出し

- ffmpeg.wasm導入
- Web Worker化
- 標準MP4書き出し
- 進捗表示
- エラー表示

### Step 10: GitHub Pages公開

- Vite base設定
- GitHub Actions
- README整備

### Step 11: Phase 2機能へ進む

- BGM
- テキスト
- 字幕
- 画像
- 音量
- フェード

---

## 27. Claude Code向け実装ルール

### 27.1 コーディング方針

- Reactは使用しない
- Svelte + TypeScript + Viteで実装する
- anyを極力使わない
- domain層とUI層を分離する
- 動画書き出し処理をSvelteコンポーネントに直接書かない
- 1ファイルが巨大化したら分割する
- 重要な処理には短いコメントを入れる
- 編集操作はoperations.tsへ集約する
- Undo/Redoしやすいように状態変更を明確化する

### 27.2 Svelteコンポーネント方針

- `.svelte` ファイルにはUI表示とイベント受け取りを中心に書く
- 複雑なロジックは `src/lib/domain` または `src/lib/stores` へ移動する
- storeの購読範囲を小さくする
- タイムライン全体を高頻度に再描画しない
- `currentTime` の更新で全コンポーネントが再描画されないようにする

### 27.3 状態管理

- Svelte storeを使う
- Storeは役割ごとに分割する
- 直接ネストした状態を雑に変更しない
- 編集操作は関数化する
- 再生状態とプロジェクト状態を分離する

### 27.4 テスト

最低限、以下のロジックはテストする。

- time conversion
- split clip
- trim clip
- delete clip
- move clip
- project JSON serialize/deserialize

### 27.5 パフォーマンス

- ffmpeg処理はWorkerで実行する
- サムネイル生成もWorkerで実行する
- Svelte storeの不要な更新を避ける
- タイムラインのmousemove処理はthrottleする
- 大きなファイルを扱う前に警告を出す

### 27.6 Git運用

- 作業開始時にブランチを切る
- Phaseごとにコミットする
- MVP完了時にタグを付ける
- READMEに実装済み機能と未実装機能を書く

---

## 28. 受け入れ条件

### 28.1 MVP受け入れ条件

以下すべてを満たすこと。

- GitHub Pagesで起動できる
- ChromeでMP4を読み込める
- タイムラインに動画を配置できる
- 再生/停止/シークができる
- クリップを分割できる
- クリップを削除できる
- クリップを移動できる
- クリップをトリミングできる
- Undo/Redoできる
- MP4を書き出せる
- プロジェクトJSONを保存できる
- プロジェクトJSONを読み込める
- エラー時に画面表示される

### 28.2 Phase 2受け入れ条件

- BGMを追加できる
- 音量調整できる
- テキストを追加できる
- 字幕を追加できる
- 画像を追加できる
- 縦動画で書き出せる
- 書き出しプリセットを選べる

### 28.3 Phase 3受け入れ条件

- 複数トラックを扱える
- 音声波形を表示できる
- モザイク/ぼかしを適用できる
- 簡易カラー補正ができる
- キーフレームで位置/透明度/音量を変更できる
- 自動保存できる

---

## 29. 既知の制約

### 29.1 ブラウザ制約

- 大容量動画はメモリ不足になる可能性がある
- ffmpeg.wasmはネイティブFFmpegより遅い
- WebCodecsの対応状況はブラウザ依存
- File System Access APIはブラウザ依存
- 長時間動画の書き出しは不安定になる可能性がある

### 29.2 仕様上の割り切り

- 初期対応はMP4/H.264/AAC中心
- VFR素材は音ズレの可能性があるため、将来的にCFR変換を案内する
- HDR/Log/10bitは対象外
- 高度な音声ミキサーは対象外
- 本格マルチカムは対象外
- スマートレンダリング完全対応は対象外

---

## 30. 参考情報

Claude Codeが実装時に参照する可能性がある公式/準公式情報。

- Svelte: https://svelte.dev/
- Svelte TypeScript: https://svelte.dev/docs/svelte/typescript
- Svelte store: https://svelte.dev/docs/svelte/stores
- Svelte Runes: https://svelte.dev/docs/svelte/what-are-runes
- Vite: https://vite.dev/
- Vite Static Deploy: https://vite.dev/guide/static-deploy
- TypeScript: https://www.typescriptlang.org/
- Tailwind CSS: https://tailwindcss.com/
- WebCodecs API: https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API
- VideoDecoder: https://developer.mozilla.org/en-US/docs/Web/API/VideoDecoder
- File System Access API: https://developer.chrome.com/docs/capabilities/web-apis/file-system-access
- ffmpeg.wasm: https://ffmpegwasm.netlify.app/docs/overview
- FFmpeg: https://ffmpeg.org/
- GitHub Pages: https://docs.github.com/en/pages

---

## 31. 最初にClaude Codeへ依頼するタスク例

以下をそのままClaude Codeに渡してよい。

```md
このリポジトリで、wvEditというWeb動画編集アプリを開発してください。

まずPhase 0として技術検証を行ってください。

要件:
- Svelte + TypeScript + Vite + Tailwind CSSで初期化
- Reactは使用しない
- GitHub Pages公開を前提にする
- MP4ファイルをD&Dまたはファイル選択で読み込む
- HTMLVideoElementで再生/停止/シークできる
- 簡単なタイムラインUIを作る
- 再生ヘッドとvideo.currentTimeを同期する
- ffmpeg.wasmを導入し、短いMP4を書き出す検証を行う
- ffmpeg処理は可能ならWeb Workerに分離する
- 技術検証結果をREADMEにまとめる

注意:
- 動画ファイルはサーバーにアップロードしない
- GitHub Pagesで動く静的Webアプリにする
- 大容量動画や長時間動画は初期対象外
- まずはChrome/Edge対応を優先する
- MVPに不要な高度機能は実装しない
- タイムライン全体が毎フレーム再描画される実装にしない
```

---

## 32. 開発メモ

wvEditは、Premiere Proを完全再現するのではなく、Webで快適に動く軽量NLEを目指す。  
初期段階で欲張りすぎると破綻するため、必ずPhase 0 → Phase 1 → Phase 2 → Phase 3の順で進めること。

最初に重要なのは、以下の3点である。

1. 動画を読み込める
2. タイムラインでカット編集できる
3. 編集結果を書き出せる

この3点が安定してから、テキスト、字幕、BGM、モザイクなどの実用機能を追加する。

SvelteはUI層の軽量化には有効だが、動画処理そのものをSvelteに持たせてはいけない。  
重い処理は必ずWorker、Canvas、ffmpeg.wasm、将来のWebCodecs/WebGPUへ分離する。

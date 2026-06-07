# Side Memo Task Extension

Google Chrome の Side Panel で使う、個人用のメモ管理拡張です。

1つのサイドパネルの中で、次の 5 つをまとめて扱えます。

- メモ
- 定型文
- TODO
- Web
- ShortCut

## 特徴

- Manifest V3 ベース
- Chrome Side Panel API を利用
- データ保存は `chrome.storage.local`
- HTML / CSS / JavaScript のみで構成

## 機能

### メモ

- 複数メモを切り替えて利用
- `+` でメモ追加
- `-` で選択中のメモ削除
- 最大 30 件
- 入力内容は自動保存

### 定型文

- タイトルと本文を保存
- タイトルクリックで本文をコピー
- `編` で編集
- `↑` `↓` で並び替え
- `×` で削除
- 一覧本文は 1 行表示で省略

### TODO

- シンプルなタスク一覧
- タスク追加
- `↑` `↓` で並び替え
- `×` で削除
- 長い文字列はパネル幅で折り返し

### Web

- タイトルと URL を保存
- タイトルクリックで Chrome タブとして開く
- `編` で編集
- `↑` `↓` で並び替え
- `×` で削除
- `https://` なしで入力した場合は自動補完

### ShortCut

- タイトルと起動先を保存
- タイトルクリックで Chrome タブとして開く
- `編` で編集
- `↑` `↓` で並び替え
- `×` で削除
- `file:///...` のローカル HTML やファイル URL を登録可能
- `C:\...` のような Windows パスは `file:///C:/...` に変換して保存

## ShortCut の注意点

- `ShortCut` は Chrome 拡張の範囲で動作します。
- `file:///.../index.html` のような HTML は Chrome で開けます。
- `C:\path\to\file.html` のような入力も `file:///` 形式へ変換して開けます。
- フォルダを Windows エクスプローラで直接開く処理は、Chrome 拡張だけでは基本的にできません。
- `file:///...` を使う場合は、Chrome の拡張詳細画面で「ファイルの URL へのアクセスを許可」をオンにしてください。

## インストール

1. Chrome で `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」をオンにする
3. 「パッケージ化されていない拡張機能を読み込む」を押す
4. このフォルダを選択する

例:

`C:\workspace\23_side-memo-task-extension\side-memo-task-extension_develop`

## ファイル構成

```text
side-memo-task-extension_develop/
├─ manifest.json
├─ background.js
├─ sidepanel.html
├─ sidepanel.css
├─ sidepanel.js
├─ README.md
└─ icons/
   ├─ icon16.png
   ├─ icon48.png
   └─ icon128.png
```

## 保存データについて

保存データは Chrome の `chrome.storage.local` に入ります。

- Chrome を閉じても保持されます
- 拡張を削除すると消える可能性があります
- バックアップ機能で JSON に書き出しできます
- 復元時は現在のデータを上書きします

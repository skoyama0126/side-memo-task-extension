# Side Memo Task Extension

Google Chrome の Side Panel で使う、個人用のシンプルな補助拡張です。  
ローカル読み込み専用で、以下の 4 つの機能を 1 つの拡張にまとめています。

- メモ
- 定型文
- TODO
- Web リンク

## 特徴

- Manifest V3 ベース
- Chrome Side Panel API を使用
- データ保存は `chrome.storage.local`
- 外部サーバー通信なし
- ビルド不要
- HTML / CSS / JavaScript のみで構成

## できること

### メモ

- 番号付きの複数メモを切り替えて利用
- `+` でメモ枠を追加
- `-` で選択中メモを削除
- 最大 30 件
- 入力内容は自動保存

### 定型文

- タイトルと本文をモーダルで登録
- タイトル押下で本文をコピー
- `写` でコピー
- `編` で編集
- `×` で削除

### TODO

- タスクの追加
- 完了 / 未完了の切り替え
- `すべて / 未完了 / 完了` のフィルター
- `×` で削除

### Web

- タイトルと URL をモーダルで登録
- タイトル押下で別タブで開く
- `開` で開く
- `編` で編集
- `×` で削除
- `https://` なしで入力した URL は自動補完

## インストール方法

1. Chrome で `chrome://extensions/` を開く
2. 右上のデベロッパーモードを有効化する
3. `パッケージ化されていない拡張機能を読み込む` を押す
4. このフォルダを選択する

対象フォルダ:

`C:\workspace\23_side-memo-task-extension\side-memo-task-extension`

## ファイル構成

```text
side-memo-task-extension/
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

保存先はこのディレクトリ内ではなく、Chrome の `chrome.storage.local` です。

- Chrome を閉じても基本的には残ります
- 拡張を削除すると消える可能性があります
- このフォルダを見ても保存データ本体は見えません

## 補足

- 一般公開用ではなく、ローカル個人利用前提です
- 必要に応じて今後 `エクスポート / インポート` 機能を追加できます

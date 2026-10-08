# Side Memo Task Extension

Google Chrome の Side Panel で使う、個人用のメモ管理拡張です。

1つのサイドパネルの中で、次の 4 つをまとめて扱えます。

- メモ
- コピペ
- TODO
- Web

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

### コピペ

- タイトルと本文を保存
- Webとは別にカテゴリを追加・編集・並び替え・削除
- 「カテゴリ一覧」で管理し、コピペの追加・編集時にカテゴリを選択
- カテゴリごとに折りたたみ可能で、初期表示の開閉も設定可能
- 既存のコピペと、削除したカテゴリ内のコピペは「未分類」に移動
- カテゴリと所属情報もバックアップ・復元の対象
- タイトルクリックで本文をコピー
- `編` で編集
- `↑` `↓` でカテゴリ内の並び替え
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
- `file:///...html`
- `C:\...\index.html`
  のようなローカル HTML も登録可能

## ローカル HTML の扱い

- `C:\path\to\index.html` のような Windows パスは `file:///C:/path/to/index.html` に変換して保存します
- `file:///...html` はそのまま登録できます
- フォルダではなく `.html` / `.htm` ファイルを想定しています
- 利用時は Chrome の拡張詳細画面で「ファイルの URL へのアクセスを許可」をオンにしてください

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

# SourceBound Exam Self-Hosted

SourceBound Examは、アップロードした資料だけを根拠に筆記テストを作成・実施・採点・分析するWebアプリです。このリポジトリは**Manus、Manus OAuth、Manus LLM、Manus Storage、Manus Hostingに依存しない自己ホスト版**です。

## 構成

| 領域 | 自己ホスト構成 |
|---|---|
| Web/API | Node.js 22、Express、tRPC、React、Vite |
| 認証 | 内蔵メール・パスワード認証、JWT HttpOnly Cookie、管理者ロール |
| DB | MySQLまたはTiDB、Drizzle ORM |
| LLM | OpenAI互換Chat Completions API。OpenAI、Azure OpenAI、Ollama等を `OPENAI_BASE_URL` で切替可能 |
| ファイル | デフォルトはローカル `STORAGE_DIR`。本番では永続ボリュームまたはS3互換アダプターを利用 |
| 配信 | Node.js本体、Docker Compose、または任意のコンテナ基盤 |

## クイックスタート

Node.js 22以上、pnpm 10以上、MySQL 8以上を用意してください。

```bash
pnpm install
cp docs/env.example .env
# .envのDATABASE_URL、JWT_SECRET、OPENAI_API_KEYなどを設定
pnpm db:push
pnpm check
pnpm test
pnpm dev
```

ブラウザで `http://localhost:3000/login` を開き、アカウントを登録します。最初の管理者はDBで対象ユーザーの `role` を `admin` に変更してください。

## Docker Compose

```bash
cp docs/env.example .env
docker compose up --build
```

MySQLはCompose内で起動し、アプリは `http://localhost:3000` で待ち受けます。起動時に `pnpm db:push` を実行してDrizzle migrationを適用し、アップロードファイルは `./data/uploads` の永続ボリュームへ保存されます。S3を使う場合は `STORAGE_DRIVER=s3` とS3接続変数を指定してください。

## 環境変数

実値は `.env` に保存し、GitHubへコミットしないでください。テンプレートは `docs/env.example` にあります。

| 変数 | 用途 |
|---|---|
| `DATABASE_URL` | MySQL/TiDB接続URL |
| `JWT_SECRET` | JWT署名用の長いランダム値 |
| `APP_NAME` | アプリ表示名 |
| `PUBLIC_BASE_URL` | 外部公開URL。CookieのSecure判定とファイルURLに使用 |
| `OPENAI_BASE_URL` | OpenAI互換APIのベースURL。既定値はOpenAI公式API |
| `OPENAI_API_KEY` | LLM APIキー |
| `OPENAI_MODEL` | 利用モデル。既定値は `gpt-4o-mini` |
| `STORAGE_DRIVER` | `local` または `s3` |
| `STORAGE_DIR` | ローカルアップロード保存先。既定値は `./data/uploads` |
| `S3_ENDPOINT` / `S3_REGION` | MinIOまたはAWS S3の接続先とリージョン |
| `S3_BUCKET` | オブジェクトバケット名 |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | S3互換ストレージ認証情報 |
| `PORT` | HTTP待受ポート。既定値は3000 |

## 認証とデータ

アップロードファイルは `STORAGE_DRIVER=local` では `STORAGE_DIR` に保存され、`STORAGE_DRIVER=s3` ではAWS S3またはMinIOへPutObjectされます。単一サーバー運用以外では、S3互換ストレージまたは永続ボリュームを使用してください。ユーザーのパスワードはscryptでハッシュ化し、セッションはJWT HttpOnly Cookieで管理します。HTTPS環境ではリバースプロキシでTLSを終端し、`PUBLIC_BASE_URL=https://...` を設定してください。

## API境界

`tRPC` の主な領域は `materials`、`questions`、`tests`、`attempts`、`analytics` です。外部UIへ移植する場合は `client/src/lib/trpc.ts` を利用するか、同一の `/api/trpc` 契約を別クライアントから呼び出してください。認証APIは `POST /api/auth/register`、`POST /api/auth/login`、`POST /api/auth/logout`、`GET /api/auth/config` です。

## LLMプロバイダー切替

LLMはOpenAI互換のHTTP APIへ直接送信します。OpenAIを使う場合は `OPENAI_BASE_URL=https://api.openai.com/v1`、Azure OpenAIや社内ゲートウェイ、Ollama互換サーバーを使う場合は対応する `/v1` URLへ変更してください。資料本文以外の一般知識で問題を作らないというアプリ側のプロンプト制約は維持されます。

## 開発・品質確認

```bash
pnpm check
pnpm test -- --run
pnpm build
```

CIでは上記3コマンドを実行します。生成物 `dist/`、依存ディレクトリ、環境変数、ローカルアップロード、Manus固有の設定ファイルはGit管理対象外です。

## 本番運用の注意

本番では必ず強い `JWT_SECRET`、HTTPS、DBバックアップ、永続ストレージ、LLM利用量制限、アップロードサイズ制限、管理者アカウントの多要素認証を設定してください。初期管理者の昇格は、公開環境のDBへ直接接続できる管理者だけが行える手順にしてください。

## ライセンス

MIT License。OpenAI、Azure、Ollama、MySQL、MinIO等の外部サービスを利用する場合は各サービスの利用条件に従ってください。

#!/usr/bin/env bash
# PreToolUse(Write/Edit) フック: 機密情報の書き込みをブロック
# 終了コード 2 = Claude へのブロック通知

python3 -c "
import sys, json, re

try:
    data = json.loads(sys.stdin.read())
    inp = data.get('tool_input', {})
    file_path = inp.get('file_path', '')
    # Write: content フィールド / Edit: new_string フィールド
    content = inp.get('content', '') or inp.get('new_string', '')
except Exception:
    sys.exit(0)

# .env ファイルへの直接書き込みをブロック
if re.search(r'(^|/)\.env$', file_path):
    print('[セキュリティブロック] .env ファイルへの直接書き込みは禁止されています。')
    print('手順: .env.example を更新 → 実際の値は手動で .env に追記してください。')
    sys.exit(2)

# --- 変数名付きパターン (NAME=value 形式) ---
named_patterns = [
    # Supabase service role / anon key (JWT: eyJ で始まる)
    r'NUXT_SUPABASE_SERVICE_KEY\s*=\s*[\"\'']?eyJ[A-Za-z0-9_\-\.]{50,}',
    r'NUXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*[\"\'']?eyJ[A-Za-z0-9_\-\.]{50,}',
    # Anthropic API key
    r'NUXT_CLAUDE_API_KEY\s*=\s*[\"\'']?sk-ant-[A-Za-z0-9_\-]{20,}',
    # Token Encryption Key (64文字の16進数)
    r'NUXT_TOKEN_ENCRYPTION_KEY\s*=\s*[\"\'']?[a-f0-9]{64}',
    # Google OAuth Client Secret
    r'NUXT_GOOGLE_CLIENT_SECRET\s*=\s*[\"\'']?GOCSPX-[A-Za-z0-9_\-]{20,}',
    # DATABASE_URL (PostgreSQL DSN with credentials)
    r'DATABASE_URL\s*=\s*[\"\'']?postgr(?:es|esql)://[^:@\s]+:[^@\s]+@',
]

# --- フォーマット非依存パターン (変数名なしでも検出) ---
raw_patterns = [
    # 生の JWT トークン (eyJ から始まる十分な長さのもの)
    r'eyJ[A-Za-z0-9_\-]{30,}\.[A-Za-z0-9_\-]{30,}\.[A-Za-z0-9_\-]{10,}',
    # Anthropic API key (sk-ant- prefix)
    r'sk-ant-[A-Za-z0-9_\-]{30,}',
    # PostgreSQL DSN with embedded credentials
    r'postgr(?:es|esql)://[^:@\s/]+:[^@\s]+@[a-zA-Z0-9._-]+',
    # Google OAuth Client Secret
    r'GOCSPX-[A-Za-z0-9_\-]{28,}',
]

for pattern in named_patterns + raw_patterns:
    if re.search(pattern, content):
        print('[セキュリティブロック] 機密情報をファイルに書き込もうとしています。')
        print('シークレット値をコードやドキュメントに含めることは禁止されています。')
        print('環境変数は .env ファイルで管理し、コードには変数名のみ記述してください。')
        sys.exit(2)

sys.exit(0)
"

#!/usr/bin/env bash
# PreToolUse(Bash) フック: 危険・機密漏洩コマンドをブロック
# 終了コード 2 = Claude へのブロック通知

INPUT=$(cat)

COMMAND=$(python3 -c "
import sys, json
try:
    d = json.loads(sys.stdin.read())
    print(d.get('tool_input', {}).get('command', ''))
except Exception:
    print('')
" <<< "$INPUT" 2>/dev/null || echo "")

# .env* ファイルへのアクセス（.env.example を除く）
# source .env / . .env 形式も含む
if echo "$COMMAND" | grep -qE "(^|[;&| ])(source|\.)[[:space:]]+['\"]?\.env[^.]"; then
    echo "[セキュリティブロック] .env ファイルの source/読み込みは禁止されています。"
    echo "コマンド: $COMMAND"
    exit 2
fi

if echo "$COMMAND" | grep -qE "\.env(\.[a-z]+)?([[:space:]]|\"|'|$)"; then
    # .env.example への参照は許可
    if ! echo "$COMMAND" | grep -qF ".env.example"; then
        echo "[セキュリティブロック] .env ファイルの直接アクセスは禁止されています。"
        echo "コマンド: $COMMAND"
        echo "環境変数の構成は .env.example を参照してください。"
        exit 2
    fi
fi

# 環境変数のダンプ（引数なし）
if echo "$COMMAND" | grep -qE "(^|[;&|])[[:space:]]*(printenv|env)[[:space:]]*([;&|]|$)"; then
    echo "[セキュリティブロック] 全環境変数のダンプは禁止されています。"
    echo "コマンド: $COMMAND"
    exit 2
fi

# 機密変数の展開を含むコマンドをブロック（$VAR または ${VAR} 形式）
# DATABASE_URL を含む全機密変数が対象
if echo "$COMMAND" | grep -qE "\\\$\{?(NUXT_SUPABASE_SERVICE_KEY|NUXT_CLAUDE_API_KEY|NUXT_TOKEN_ENCRYPTION_KEY|NUXT_GOOGLE_CLIENT_SECRET|DATABASE_URL)\}?"; then
    echo "[セキュリティブロック] 機密変数の参照・出力は禁止されています。"
    echo "コマンド: $COMMAND"
    exit 2
fi

# パイプ実行 (curl/wget | sh)
if echo "$COMMAND" | grep -qE "(curl|wget).*\|[[:space:]]*(ba)?sh"; then
    echo "[セキュリティブロック] パイプ経由のスクリプト実行は禁止されています。"
    echo "コマンド: $COMMAND"
    exit 2
fi

exit 0

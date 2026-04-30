#!/usr/bin/env bash
# PostToolUse hook: format file vừa edit nếu prettier có cài.
# No-op nếu prettier chưa cài → an toàn cho repo vanilla hiện tại.
# Để bật: `npm i -D prettier` ở root.

set -e

# Parse file_path từ JSON stdin (dùng node, vì project là JS)
file=$(node -e "
let d='';
process.stdin.on('data',c=>d+=c);
process.stdin.on('end',()=>{
  try{
    const j=JSON.parse(d);
    console.log(j.tool_input?.file_path || '');
  }catch(e){}
});
" 2>/dev/null)

# Skip nếu không có file hoặc không phải code file
case "$file" in
  *.js|*.html|*.css|*.json|*.md) ;;
  *) exit 0 ;;
esac

[ -f "$file" ] || exit 0

# Chạy prettier nếu có (--no-install để không tự cài)
if command -v npx >/dev/null 2>&1; then
  if npx --no-install prettier --version >/dev/null 2>&1; then
    npx --no-install prettier --write "$file" >/dev/null 2>&1 || true
  fi
fi

exit 0

#!/bin/bash
# bump-version.sh — Tự động cập nhật cache-busting version trong index.html
# Sử dụng: ./scripts/bump-version.sh "commit message"
# Hoặc: npm run deploy "commit message"

set -e

# Lấy ngày và git hash hiện tại
DATE=$(date +%Y%m%d)
HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "local")
VERSION="${DATE}_${HASH}"

echo "🔄 Cập nhật version: $VERSION"

# Thay thế tất cả ?v=... trong index.html
# macOS sed cần -i '' ; Linux dùng -i
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/?v=[^\"']*/\?v=${VERSION}/g" index.html
  sed -i '' "s/window\.APP_VERSION = '[^']*'/window.APP_VERSION = '${VERSION}'/" index.html
else
  sed -i "s/?v=[^\"']*/\?v=${VERSION}/g" index.html
  sed -i "s/window\.APP_VERSION = '[^']*'/window.APP_VERSION = '${VERSION}'/" index.html
fi

echo "✅ index.html đã được cập nhật với version: $VERSION"

# Commit nếu có message
if [ -n "$1" ]; then
  git add index.html netlify.toml
  git add -A
  git commit -m "$1 [v${VERSION}]"
  git push origin main
  echo "🚀 Đã push lên GitHub với commit: $1 [v${VERSION}]"
else
  echo "💡 Tip: Truyền commit message để tự động push: ./scripts/bump-version.sh 'feat: mô tả thay đổi'"
fi

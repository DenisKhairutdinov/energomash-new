#!/bin/sh
# Деплой на GitHub Pages (ветка gh-pages, адрес https://deniskhairutdinov.github.io/energomash-new/).
# Собирает сайт с базой /energomash-new/, дописывает базу к корневым ссылкам страниц и заливает dist в ветку gh-pages.
set -e
BASE=/energomash-new/
npm run sitemap
npm run typecheck
npx vite build --base=$BASE
node scripts/prefix-base.mjs $BASE dist
touch dist/.nojekyll
REV=$(git rev-parse --short HEAD)
TMP=$(mktemp -d)
cp -R dist/. "$TMP"
cd "$TMP"
git init -q -b gh-pages
git add -A
git commit -q -m "deploy: GitHub Pages build of $REV"
git remote add origin "$(git -C "$OLDPWD" remote get-url origin)"
git push -f origin gh-pages
cd "$OLDPWD"
rm -rf "$TMP"

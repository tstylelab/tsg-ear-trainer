/* 試聴用アーティファクト（claude.ai/code/artifact）に貼るコピーを作るツール
 *
 * 使い方:  node _tools/build-artifact.js
 *   → 同じフォルダに _tools/artifact-preview.html を出力する
 *   → Claude Code に「このファイルをアーティファクトに publish して」と頼む
 *      （既存URLを更新する場合は url に
 *        https://claude.ai/code/artifact/d15a3d24-04be-432b-8a04-d2f65a8b4745 を指定）
 *
 * なぜ加工が必要か:
 *   ・アーティファクトは <!DOCTYPE> / <html> / <head> / <body> を自前で持てない（公開時に外枠が付く）
 *   ・CSPで外部ホストを読めないため Google Fonts の参照は必ず失敗する（消しておく）
 *
 * 両PC（tsuyoshi / sugi）で動くよう、パスはこのスクリプトの位置から求めている。
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'index.html');
const OUT = process.argv[2] || path.join(__dirname, 'artifact-preview.html');

let s = fs.readFileSync(SRC, 'utf8');

const drop = [
  /^<!DOCTYPE html>\n/,
  /^<html lang="ja">\n/m,
  /^<head>\n/m,
  /^<\/head>\n/m,
  /^<body>\n/m,
  /^<\/body>\n/m,
  /^<\/html>\n?/m,
  /^<meta charset="UTF-8">\n/m,
  /^<meta name="viewport"[^\n]*\n/m,
  /^<meta name="description"[^\n]*\n/m,
  /^<meta name="theme-color"[^\n]*\n/m,
  /^<link rel="icon"[^\n]*\n/m,
  /^<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\n/m,
  /^<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\n/m,
  /^<link href="https:\/\/fonts\.googleapis\.com\/css2[^\n]*\n/m
];
for (const re of drop) {
  if (!re.test(s)) throw new Error('除去対象が見つかりません（index.htmlの構造が変わった？）: ' + re);
  s = s.replace(re, '');
}
if (/<!DOCTYPE|<html|<\/html>|<head>|<body>|fonts\.googleapis/i.test(s)) {
  throw new Error('除去し切れていないタグがあります');
}

// アーティファクトではOswaldが読めないので、システムの縦長サンセットに寄せる
// （ローカル版とはロゴの見え方が少し変わる。実機確認はローカルの index.html で行う）
s = s.replace(/'Oswald',sans-serif/g, `'Oswald','Haettenschweiler','Arial Narrow',system-ui,sans-serif`);
s = s.replace(/font-family:'Oswald',/g, `font-family:'Oswald','Haettenschweiler','Arial Narrow',`);

fs.writeFileSync(OUT, s, 'utf8');
console.log('生成: ' + OUT);
console.log('サイズ: ' + fs.statSync(OUT).size.toLocaleString() + ' バイト');

#!/usr/bin/env bash
# Met la version web de Thrall en ligne sur https://thrall-ia.duckdns.org/app/
# À lancer sur kworker1 (192.168.2.125) en admin :   sudo bash installer-edge.sh
# Relance-le à chaque mise à jour de l'appli : il reconstruit et recopie.
#
# Ce que fait le script :
#  1. récupère le code depuis GitHub (dépôt public Thrall-ia)
#  2. le construit dans un conteneur Node jetable (rien installé sur la machine)
#  3. copie le résultat dans le conteneur Caddy (/srv/thrall-app)
#  4. ajoute la route /app/ au Caddyfile (copie de sauvegarde avant), vérifie, recharge Caddy
set -euo pipefail

REPO=https://github.com/yoandalinpro-cloud/Thrall-ia.git
SRC=/opt/thrall-app-src
CADDYFILE=${CADDYFILE:-/home/kadmin/google_workspace_mcp/Caddyfile}
DOMAIN=thrall-ia.duckdns.org

[ "$(id -u)" = 0 ] || { echo "Lance-moi avec sudo."; exit 1; }

echo "== 1/4 Code"
if [ -d "$SRC/.git" ]; then git -C "$SRC" pull -q --ff-only; else git clone -q --depth 1 "$REPO" "$SRC"; fi

echo "== 2/4 Construction (conteneur node:22, 1 à 2 min)"
docker run --rm -v "$SRC":/app -w /app node:22-alpine sh -c "npm ci --no-audit --no-fund --loglevel=error && npm run build" >/dev/null
[ -f "$SRC/dist/index.html" ] || { echo "La construction a échoué."; exit 1; }

echo "== 3/4 Copie dans Caddy"
CADDY=$(docker ps --format '{{.Names}} {{.Image}}' | awk '$2 ~ /caddy/ {print $1; exit}')
[ -n "$CADDY" ] || { echo "Conteneur Caddy introuvable (docker ps)."; exit 1; }
CONF_IN=$(docker inspect "$CADDY" --format '{{range .Mounts}}{{if eq .Source "'"$CADDYFILE"'"}}{{.Destination}}{{end}}{{end}}')
CONF_IN=${CONF_IN:-/etc/caddy/Caddyfile}
docker exec "$CADDY" rm -rf /srv/thrall-app
docker cp "$SRC/dist" "$CADDY":/srv/thrall-app
echo "   conteneur : $CADDY  (Caddyfile vu dedans : $CONF_IN)"

echo "== 4/4 Route /app/ dans le Caddyfile"
if grep -q 'handle_path /app/\*' "$CADDYFILE"; then
  echo "   déjà présente, rien à changer."
else
  BACKUP="$CADDYFILE.bak-$(date +%Y%m%d-%H%M%S)"
  cp -a "$CADDYFILE" "$BACKUP"
  python3 - "$CADDYFILE" "$DOMAIN" <<'PY'
import re, sys
path, domain = sys.argv[1], sys.argv[2]
s = open(path).read()
m = re.search(r'^[^\n#]*' + re.escape(domain) + r'[^\n{]*\{[ \t]*\n', s, re.M)
if not m:
    sys.exit("Bloc " + domain + " introuvable dans le Caddyfile.")
block = (
    "\t# Appli Thrall (version web installable depuis Edge / Safari)\n"
    "\tredir /app /app/\n"
    "\thandle_path /app/* {\n"
    "\t\troot * /srv/thrall-app\n"
    "\t\theader /sw.js Cache-Control \"no-cache\"\n"
    "\t\theader /index.html Cache-Control \"no-cache\"\n"
    "\t\tfile_server\n"
    "\t}\n"
)
s = s[: m.end()] + block + s[m.end():]
open(path, "w").write(s)
PY
  if ! docker exec "$CADDY" caddy validate --config "$CONF_IN" --adapter caddyfile >/dev/null 2>&1; then
    cp -a "$BACKUP" "$CADDYFILE"
    echo "   Caddyfile refusé par Caddy : ancienne version remise ($BACKUP). Rien n'a changé."
    exit 1
  fi
  echo "   ajoutée (sauvegarde : $BACKUP)"
fi
docker exec "$CADDY" caddy reload --config "$CONF_IN" --adapter caddyfile

echo
echo "C'est en ligne : https://$DOMAIN/app/"
echo "Dans Edge : ouvre cette adresse, puis menu ⋯ › Applications › Installer Thrall."
echo "Note : si le conteneur Caddy est recréé (docker compose up --force-recreate), relance ce script."

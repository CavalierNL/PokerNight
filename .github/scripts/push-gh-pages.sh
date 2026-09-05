#!/usr/bin/env bash
# Commit wat er in de gh-pages-checkout staat en push het, met rebase bij een
# botsing. Gedeeld door deploy.yml en preview.yml: die schrijven allebei naar
# dezelfde branch en hun concurrency-groepen staan per bron, dus gelijktijdige
# pushes zijn geen randgeval maar het normale geval — bij het mergen van een PR
# starten een deploy en een opruiming zelfs gegarandeerd tegelijk.
#
# Gebruik: push-gh-pages.sh <map> <commitboodschap>
set -euo pipefail

map=$1
boodschap=$2

cd "$map"
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add -A

if git diff --staged --quiet; then
  echo "Niets veranderd"
  exit 0
fi

git commit -m "$boodschap"

for poging in 1 2 3; do
  if git push origin gh-pages; then
    # Exitcode 0 is hier niet genoeg: "Everything up-to-date" is ook 0. Alleen de
    # remote zelf is bewijs dat er staat wat wij bedoelden.
    #
    # Eén geval haalt deze controle bewust: laat de rebase onze commit vallen
    # omdat upstream dezelfde wijziging al bevat, dan is HEAD gelijk aan de
    # remote en is de inhoud dus precies goed — nagespeeld, dat klopt. Wat de
    # controle wél vangt is een push die 0 meldt terwijl de branch ergens anders
    # staat, en dat is het geval waarin doorgaan schade doet.
    git fetch --quiet origin gh-pages
    if [ "$(git rev-parse HEAD)" = "$(git rev-parse FETCH_HEAD)" ]; then
      exit 0
    fi
    echo "::error::push meldde succes maar origin/gh-pages staat niet op onze commit"
    exit 1
  fi

  # Na de laatste poging niet meer rebasen: dat belooft een vervolg dat er niet
  # komt en verbergt in de log welke poging de laatste was.
  if [ "$poging" -eq 3 ]; then
    break
  fi

  echo "::warning::Push mislukt (poging ${poging}/3), rebasen en opnieuw"
  if ! git pull --rebase origin gh-pages; then
    echo "::error::git pull --rebase mislukte op poging ${poging}/3"
    # Een mislukte abort is precies wat je wilt weten als dit ooit gebeurt, dus
    # niet stil wegslikken.
    git rebase --abort 2>/dev/null || echo "::warning::git rebase --abort mislukte ook"
    exit 1
  fi
done

echo "::error::Push naar gh-pages mislukt na 3 pogingen"
exit 1

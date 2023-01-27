#!/usr/bin/env bash
set -e
curl -X POST https://toadua.uakci.pl/api -H 'Content-Type: application/json' -d '{"action":"search","query":["term",""]}' > toadua-dump.json
jq -c '[.results | .[] |  select(.scope == "en"  and .score >= 0 and (.head | index(" ") | not)) | {head, body}]' < toadua-dump.json > toadua-basic.json
python3 extract-glosses.py > toadua-glosses.txt

#!/bin/bash
# Round 7: run r02-variant.mjs for each named variant on all six plans, at most 14 at a time.
#   ./run-variants.sh lawn6 lawn3 ...
cd "$(dirname "$0")"
mkdir -p results/logs
for v in "$@"; do for p in hopkins-4-15 hopkins-4-12 hopkins-4-09 hopkins-4-13 ashland-worker monroe-row; do echo "$p $v"; done; done |
  xargs -P 14 -L 1 sh -c 'node r02-variant.mjs $0 $1 > results/logs/$1-$0.txt 2>&1'
echo finished "$@"

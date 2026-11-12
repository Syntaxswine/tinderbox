#!/bin/bash
# A small panel of strikes across plans, in parallel, for checking a changed number.  ./panel.sh '<rules json>' '<fuels json>'
cd "$(dirname "$0")"
R=${1:-'{}'}; F=${2:-'{}'}
for c in "hopkins-4-15 wall:x+:19:4" "hopkins-4-15 wall:y-:10:0" "hopkins-4-15 room:0:dining" "hopkins-4-15 room:1:bed-a" "hopkins-4-12 wall:x+:15:7" "hopkins-4-12 room:0:kitchen" "ashland-worker room:0:kitchen" "hopkins-4-09 room:1:bed-a" "monroe-row room:0:parlor" "hopkins-4-13 wall:y+:8:15"; do
  set -- $c; (node quick.mjs $1 $2 "$R" "$F" 2>&1 | cut -c1-175) &
done; wait

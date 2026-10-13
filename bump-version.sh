#!/bin/sh
# Run before each deploy so browsers fetch the newest scripts instead of cached copies.
V=$(date +%Y%m%d%H%M)
sed -i.bak -E "s#src=\"js/([a-z]+)\.js(\?v=[0-9]+)?\"#src=\"js/\1.js?v=$V\"#g" index.html && rm -f index.html.bak
echo "Scripts now use ?v=$V"

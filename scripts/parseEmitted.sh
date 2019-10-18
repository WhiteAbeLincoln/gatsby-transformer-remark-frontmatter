#!/bin/sh

# writes the names of the tsc emitted files to a file or stdout

OUTFILE="${1:-/dev/stdout}"

while read -r line; do
  case "$line" in
    TSFILE:*)
      # tsc --listEmittedFiles output
      echo "$line" | cut -d' ' -f 2- - >> "$OUTFILE"
      ;;
    *' -> '*)
      # cp verbose output
      # cp -v may print relative paths. we need absolute from root for the postpack script to work
      # using realpath means users must have gnu coreutils installed :(
      echo "$line" | awk -F"' -> '" '{print substr($2, 1, length($2)-1)}' | xargs realpath >> "$OUTFILE"
      ;;
    *)
      echo "$line"
  esac
done

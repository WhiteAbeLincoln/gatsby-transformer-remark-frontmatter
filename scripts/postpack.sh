#!/bin/sh

# Cleans up emitted build files and directories

# if any paths are relative to the build directory, make them relative to root
awk '{gsub("'"$PWD/build/"'", "'"$PWD/"'"); printf("%s%c", $0, 0)}' ./*.emit | xargs -0 rm -rf

rm ./*.emit
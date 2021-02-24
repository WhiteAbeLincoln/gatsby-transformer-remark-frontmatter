{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  name = "node";
  buildInputs = [ pkgs.nodejs-12_x ];
  shellHook = ''
    mkdir -p .npm-global
    export NODE_PATH="$PWD/.npm-global:$NODE_PATH"
    export NPM_CONFIG_PREFIX="$PWD/.npm-global"
    export PATH="$NPM_CONFIG_PREFIX/bin:$PWD/node_modules/.bin/:$PATH"
  '';
}

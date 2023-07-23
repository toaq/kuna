{
  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in {
        devShells.default =
          pkgs.mkShell {
            buildInputs = with pkgs; [
              nodejs_latest
              nodePackages_latest.typescript-language-server
              nodePackages_latest.vscode-json-languageserver
            ];
          };
      });
}

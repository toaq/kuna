{
  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = import nixpkgs { inherit system; };
      in {
        devShells.default = pkgs.mkShellNoCC {
          buildInputs = with pkgs; [
            nodejs_latest
            # The pnpm in nixpkgs is out of date, so we instead rely on Corepack
            # to provide pnpm
            corepack_latest
            nodePackages_latest.typescript-language-server
            nodePackages_latest.vscode-json-languageserver
            # Forces Biome to run as a statically-linked musl binary
            musl

            # Dependencies for building canvas
            python3
            pkg-config
            pixman
            cairo
            pango
          ];

          # For building canvas
          env.LD_LIBRARY_PATH =
            pkgs.lib.makeLibraryPath (with pkgs; [ libuuid ]);
          env.CPLUS_INCLUDE_PATH =
            pkgs.lib.makeIncludePath (with pkgs; [ fontconfig.dev ]);
        };
      });
}

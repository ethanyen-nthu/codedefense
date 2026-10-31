Self-hosted parser assets for CodeDefense Free Edition

tree-sitter.wasm: web-tree-sitter 0.25.10 (MIT), official Tree-sitter web runtime.
tree-sitter-cpp.wasm: @vscode/tree-sitter-wasm 0.3.1 (MIT package), Microsoft's prebuilt C++ grammar.
The pinned runtime/grammar pair is exercised by real WASM unit and browser tests.

Upstream sources:
https://github.com/tree-sitter/tree-sitter
https://github.com/tree-sitter/tree-sitter-cpp
https://github.com/tree-sitter/tree-sitter-c
https://github.com/microsoft/vscode-tree-sitter-wasm

TREE-SITTER-LICENSE.txt, CPP-LICENSE.txt, C-LICENSE.txt, and VSCODE-LICENSE.txt preserve license notices.
grammar-provenance.json is the provider package's cgmanifest as shipped; it is not a claim of a separately verified C++ grammar git revision.

All core assets are served from this website. There is no CDN request or external parser API.

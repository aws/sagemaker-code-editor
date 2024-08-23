#!/usr/bin/env bash
set -euo pipefail

main() {
  quilt push -a

}

main "$@"
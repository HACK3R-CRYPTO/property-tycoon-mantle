#!/bin/bash
# Wrapper script to fix Foundry system configuration issue

export PATH="$HOME/.foundry/bin:$PATH"

# Disable system proxy detection to avoid the NULL object crash
export REQWEST_NO_PROXY=1
export HTTP_PROXY=""
export HTTPS_PROXY=""
export http_proxy=""
export https_proxy=""
export NO_PROXY="*"
export no_proxy="*"

# Try to disable macOS system configuration access
export SYSTEM_CONFIGURATION_DISABLE=1

# Run cast with all arguments passed through
exec cast "$@"


#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/Alcyone-Labs/arg-parser.git"
SKILL_NAME="arg-parser"
# =====================================

usage() {
  cat <<EOF
Usage: $0 [OPTIONS]

Install the ${SKILL_NAME} skill for OpenCode, Gemini CLI, Claude, FactoryAI Droid, Agents, and Antigravity.

Options:
  -g, --global    Install globally (user scope) [default]
  -l, --local     Install locally (.opencode/skills/, .gemini/skills/, etc.)
  -s, --self      Install from local filesystem (for testing/dev)
  -h, --help      Show this help message

Examples:
  curl -fsSL https://raw.githubusercontent.com/Alcyone-Labs/arg-parser/main/skill-forge/install.sh | bash
  ./install.sh --self --local
EOF
}

# Strict validation of naming and environment
validate_env() {
  if [[ -z "${SKILL_NAME}" ]] || [[ "${SKILL_NAME}" == "{skill-name}" ]]; then
    echo "Critical Error: SKILL_NAME is unset or using a template placeholder." >&2
    exit 1
  fi
  if [[ "${SKILL_NAME}" == *"/"* ]] || [[ "${SKILL_NAME}" == *" "* ]] || [[ "${SKILL_NAME}" == ".." ]]; then
    echo "Critical Error: SKILL_NAME contains illegal characters or path separators." >&2
    exit 1
  fi
}

main() {
  local install_type="global"
  local self_install=false

  while [[ $# -gt 0 ]]; do
    case "$1" in
      -g|--global) install_type="global"; shift ;;
      -l|--local) install_type="local"; shift ;;
      -s|--self) self_install=true; shift ;;
      -h|--help) usage; exit 0 ;;
      *) echo "Unknown option: $1"; usage; exit 1 ;;
    esac
  done

  validate_env

  echo "Installing ${SKILL_NAME} skill (${install_type})..."

  # 1. Setup Source
  local src_dir
  if [[ "$self_install" == true ]]; then
    src_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    echo "Using local source: ${src_dir}"
  else
    src_dir=$(mktemp -d)
    trap "rm -rf '$src_dir'" EXIT
    echo "Fetching skill from ${REPO_URL}..."
    git clone --depth 1 --quiet "$REPO_URL" "$src_dir"
  fi

  # 2. Installation Helper with Deep Safety Checks
  install_to() {
    local platform_name=$1
    local base_dir=$2
    local command_dir=${3:-""}

    local target_skill_dir="${base_dir}/${SKILL_NAME}"

    # CRITICAL: Prevent accidental deletion of root, home, or system directories
    if [[ -z "$target_skill_dir" ]] || [[ "$target_skill_dir" == "/" ]] || [[ "$target_skill_dir" == "$HOME" ]] || [[ "$target_skill_dir" == "$HOME/" ]]; then
      echo "Safety Error: Target path is restricted: $target_skill_dir" >&2
      return 1
    fi

    # Only proceed if the platform parent exists (for global) or we are in local mode
    if [[ -d "${base_dir%/*}" ]] || [[ "$install_type" == "local" ]]; then
      echo "Installing to ${platform_name}..."
      mkdir -p "$base_dir"

      if [[ -d "$target_skill_dir" ]]; then
        # ENSURE we only delete the specific skill folder, double-checking it matches SKILL_NAME
        case "$target_skill_dir" in
          */"${SKILL_NAME}")
            rm -rf "$target_skill_dir"
            ;;
          *)
            echo "Safety Error: Target directory does not end in ${SKILL_NAME}. Aborting deletion." >&2
            exit 1
            ;;
        esac
      fi

      cp -r "${src_dir}/skill/${SKILL_NAME}" "$target_skill_dir"

      # Standardize SKILL.md for Gemini/others
      if [[ -f "${target_skill_dir}/Skill.md" ]]; then
        mv "${target_skill_dir}/Skill.md" "${target_skill_dir}/SKILL.md"
      fi

      # Install command if platform supports it (OpenCode)
      if [[ -n "$command_dir" ]]; then
        mkdir -p "$command_dir"
        local cmd_path="${command_dir}/${SKILL_NAME}.md"
        # Validate cmd_path is not a sensitive root dir
        if [[ "$cmd_path" == "/" ]] || [[ "$cmd_path" == "$HOME" ]]; then
          echo "Safety Error: Dangerous command path: $cmd_path" >&2
          exit 1
        fi
        rm -f "$cmd_path"
        cp "${src_dir}/command/${SKILL_NAME}.md" "$cmd_path"
        echo "  Command installed to: ${cmd_path}"
      fi

      echo "  Skill installed to: ${target_skill_dir}"
    fi
  }

  # 3. Define Paths & Execute
  if [[ "$install_type" == "global" ]]; then
    # OpenCode
    install_to "OpenCode (Global)" \
      "${HOME}/.config/opencode/skills" \
      "${HOME}/.config/opencode/commands"

    # Gemini CLI
    install_to "Gemini CLI (Global)" \
      "${HOME}/.gemini/skills"

    # Claude
    install_to "Claude (Global)" \
      "${HOME}/.claude/skills"

    # FactoryAI Droid
    install_to "FactoryAI Droid (Global)" \
      "${HOME}/.factory/skills"

    # Agents
    install_to "Agents (Global)" \
      "${HOME}/.config/agents/skills"

    # Antigravity
    install_to "Antigravity (Global)" \
      "${HOME}/.antigravity/skills"
  else
    # OpenCode
    install_to "OpenCode (Local)" \
      ".opencode/skills" \
      ".opencode/commands"

    # Gemini CLI
    install_to "Gemini CLI (Local)" \
      ".gemini/skills"

    # Claude
    install_to "Claude (Local)" \
      ".claude/skills"

    # FactoryAI Droid
    install_to "FactoryAI Droid (Local)" \
      ".factory/skills"

    # Agents
    install_to "Agents (Local)" \
      ".agents/skills"

    # Antigravity
    install_to "Antigravity (Local)" \
      ".antigravity/skills"
  fi

  echo "Done."
}

main "$@"

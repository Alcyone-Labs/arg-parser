#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/alcyone-labs/arg-parser.git"
SKILL_NAME="arg-parser"

usage() {
  cat <<EOF
Usage: \$0 [OPTIONS]

Install the arg-parser skill for OpenCode, Gemini CLI, and FactoryAI Droid.

Options:
  -g, --global    Install globally (~/.config/opencode/skill/)
  -l, --local     Install locally (.opencode/skill/) [default]
  -s, --self      Install from local filesystem (for testing)
  -h, --help      Show this help message

Examples:
  curl -fsSL https://raw.githubusercontent.com/alcyone-labs/arg-parser/main/install.sh | bash
  curl -fsSL https://raw.githubusercontent.com/alcyone-labs/arg-parser/main/install.sh | bash -s -- --global
EOF
}

install_opencode_local() {
  local target_dir=".opencode/skill/${SKILL_NAME}"
  local command_dir=".opencode/command"
  echo "Installing to OpenCode (local)..."
  mkdir -p "${command_dir}"
  if [[ -d "${target_dir}" ]]; then
    echo "Updating existing local installation..."
    rm -rf "${target_dir}"
  fi
  mkdir -p "${target_dir}"
  cp -r "${source_skill_dir}/." "${target_dir}/"
  local command_path="${command_dir}/${SKILL_NAME}.md"
  if [[ -d "${command_path}" ]] || [[ -f "${command_path}" ]]; then
    rm -rf "${command_path}"
  fi
  # Copy command file from skill/command/ to .opencode/command/
  if [[ -f "${source_command_file}" ]]; then
    cp "${source_command_file}" "${command_path}"
  fi
}

install_opencode_global() {
  local target_dir="${HOME}/.config/opencode/skill/${SKILL_NAME}"
  local command_dir="${HOME}/.config/opencode/command"
  echo "Installing to OpenCode (global)..."
  mkdir -p "${command_dir}"
  if [[ -d "${target_dir}" ]]; then
    echo "Updating existing global installation..."
    rm -rf "${target_dir}"
  fi
  mkdir -p "${target_dir}"
  cp -r "${source_skill_dir}/." "${target_dir}/"
  local command_path="${command_dir}/${SKILL_NAME}.md"
  if [[ -d "${command_path}" ]] || [[ -f "${command_path}" ]]; then
    rm -rf "${command_path}"
  fi
  # Copy command file from skill/command/ to .opencode/command/
  if [[ -f "${source_command_file}" ]]; then
    cp "${source_command_file}" "${command_path}"
  fi
}

install_gemini() {
  local target_dir="${HOME}/.gemini/skills/${SKILL_NAME}"
  echo "Installing to Gemini CLI..."
  if [[ -d "${target_dir}" ]]; then
    echo "Updating existing Gemini installation..."
    rm -rf "${target_dir}"
  fi
  mkdir -p "${target_dir}"
  cp -r "${source_skill_dir}/." "${target_dir}/"
  if [[ -f "${target_dir}/Skill.md" ]]; then
    mv "${target_dir}/Skill.md" "${target_dir}/SKILL.md"
  fi
}

install_factory() {
  local target_dir="${HOME}/.factory/skills/${SKILL_NAME}"
  echo "Installing to FactoryAI Droid..."
  if [[ -d "${target_dir}" ]]; then
    echo "Updating existing FactoryAI installation..."
    rm -rf "${target_dir}"
  fi
  mkdir -p "${target_dir}"
  cp -r "${source_skill_dir}/." "${target_dir}/"
}

main() {
  local install_type="local"
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

  local tmp_dir
  local self_mode=false
  if [[ "$self_install" == true ]]; then
    self_mode=true
    # When running locally, find the repo root
    # BASH_SOURCE[0] is skill/install.sh, so go up 1 level from 'skill' dir to repo root
    tmp_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  else
    tmp_dir="$(mktemp -d)"
    trap "rm -rf '${tmp_dir}'" EXIT
    git clone --depth 1 --quiet "${REPO_URL}" "${tmp_dir}"
  fi

  # For self-install, source is directly in tmp_dir (repo root)
  # For remote install, source is in tmp_dir/skill/ (cloned repo)
  local source_skill_dir="${tmp_dir}/skill/${SKILL_NAME}"
  local source_command_file="${tmp_dir}/skill/command/${SKILL_NAME}.md"
  if [[ ! -d "${source_skill_dir}" ]]; then
    # Self-install mode: files are directly in skill/ subdirectory
    source_skill_dir="${tmp_dir}/skill"
    source_command_file="${tmp_dir}/skill/command/${SKILL_NAME}.md"
  fi

  if [[ "$install_type" == "global" ]]; then install_opencode_global; else install_opencode_local; fi
  if [[ -d "${HOME}/.gemini" ]]; then install_gemini; fi
  if [[ -d "${HOME}/.factory" ]]; then install_factory; fi
}

main "$@"
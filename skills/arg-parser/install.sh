#!/usr/bin/env bash
set -euo pipefail

# === CONFIGURATION (REPLACE THESE) ===
REPO_URL="https://github.com/Alcyone-Labs/arg-parser.git"
# Default to directory name if PROJECT_NAME is not set
PROJECT_NAME="${PROJECT_NAME:-$(basename "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")}"
# =====================================

# Helper to normalize platform name to folder name
normalize_platform() {
  case "$1" in
    "OpenCode") echo "opencode" ;;
    "Gemini CLI") echo "gemini" ;;
    "Claude") echo "claude" ;;
    "FactoryAI Droid") echo "droid" ;;
    "Agents") echo "agents" ;;
    "Antigravity") echo "antigravity" ;;
    *) echo "unknown" ;;
  esac
}

usage() {
  cat <<EOF
Usage: $0 [OPTIONS]

Install skills from ${PROJECT_NAME} collection.

Options:
  -s, --self      Install from local filesystem (for testing/dev)
  -g, --global    Install globally (user scope ~/)
  -l, --local     Install locally (project ./)
  -h, --help      Show this help message

Selective Flags:
  --opencode      Target OpenCode only
  --gemini        Target Gemini CLI only
  --claude        Target Claude only
  --droid         Target FactoryAI Droid only
  --agents        Target Agents only (Default if no flags)
  --antigravity   Target Antigravity only

Interactive Mode:
  If no flags are provided, an interactive prompt will guide you.
EOF
}

# Helper to add to .gitignore if not present
update_gitignore() {
  local entry="$1"
  if [[ -f ".gitignore" ]]; then
    if grep -qF "$entry" .gitignore; then
      return
    fi
    echo "" >> .gitignore
    echo "# Added by ${PROJECT_NAME} installer" >> .gitignore
    echo "$entry" >> .gitignore
    echo "Added '$entry' to .gitignore"
  fi
}

main() {
  local install_type="interactive" # Default to interactive if no flags
  local self_install=false
  local target_platforms=() # Default empty, interactive will set it or agents default
  local target_skills=()

  # 1. Parse Arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -g|--global) install_type="global"; shift ;;
      -l|--local) install_type="local"; shift ;;
      -s|--self) self_install=true; shift ;;
      -h|--help) usage; exit 0 ;;
      --opencode) target_platforms+=("OpenCode"); shift ;;
      --gemini) target_platforms+=("Gemini CLI"); shift ;;
      --claude) target_platforms+=("Claude"); shift ;;
      --droid) target_platforms+=("FactoryAI Droid"); shift ;;
      --factory) target_platforms+=("FactoryAI Droid"); shift ;;
      --agents) target_platforms+=("Agents"); shift ;;
      --antigravity) target_platforms+=("Antigravity"); shift ;;
      *) echo "Unknown option: $1"; usage; exit 1 ;;
    esac
  done

  # Detect Source
  local src_dir
  local single_skill_mode=false
  local single_skill_name=""
  if [[ "$self_install" == true ]]; then
    src_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    # Check if we're in single-skill mode (no skills/ subdirectory but looks like a skill)
    if [[ ! -d "${src_dir}/skills" ]] && [[ -f "${src_dir}/Skill.md" || -f "${src_dir}/SKILL.md" ]]; then
      single_skill_mode=true
      single_skill_name="$(basename "$src_dir")"
      # Set src_dir to parent to maintain compatibility with the rest of the script
      src_dir="$(dirname "$src_dir")"
    fi
  else
    src_dir=$(mktemp -d)
    trap "rm -rf '$src_dir'" EXIT
    git clone --depth 1 --quiet "$REPO_URL" "$src_dir"
  fi

  # 2. Interactive Logic
  if [[ "$install_type" == "interactive" ]] || [[ ${#target_platforms[@]} -eq 0 ]]; then
    install_type="global" # Reset default for interactive flow

    # A. Select Scope
    echo ""
    PS3="Select installation scope: "
    select scope_choice in "Install Globally (userspace ~/)" "Install locally (project ./)"; do
      case "$REPLY" in
        1) install_type="global"; break ;;
        2) install_type="local"; break ;;
        *) echo "Invalid selection." ;;
      esac
    done

    # B. Select Agents
    echo ""
    echo "Select agents (toggle with number, comma/space separated, choose Done when finished):"
    local choice=""
    local agent_input=""
    while true; do
      local selection_count=0
      if declare -p target_platforms >/dev/null 2>&1; then
        selection_count=${#target_platforms[@]}
      fi
      if [[ "$selection_count" -gt 0 ]]; then
        local joined=""
        for p in "${target_platforms[@]}"; do
          if [[ -n "$joined" ]]; then
            joined="${joined}, ${p}"
          else
            joined="$p"
          fi
        done
        echo "Current selection: ${joined}"
      else
        echo "Current selection: (none)"
      fi

      local select_all_label="Select All"
      if [[ "$selection_count" -gt 0 ]]; then
        select_all_label="Deselect All"
      fi
      echo "1) OpenCode  2) Gemini CLI  3) Claude  4) FactoryAI Droid"
      echo "5) Agents    6) Antigravity 7) ${select_all_label}  8) Done"
      read -r -p "Agent(s): " agent_input || break
      agent_input="${agent_input//,/ }"

      if [[ -z "$agent_input" ]]; then
        echo "Invalid selection."
        echo ""
        continue
      fi

      if [[ "$agent_input" == "done" || "$agent_input" == "8" ]]; then
        break
      fi

      if [[ "$agent_input" == "all" || "$agent_input" == "7" ]]; then
        local has_selection=0
        if declare -p target_platforms >/dev/null 2>&1; then
          has_selection=${#target_platforms[@]}
        fi
        if [[ "$has_selection" -gt 0 ]]; then
          target_platforms=()
          echo "Deselected: All"
        else
          target_platforms=("OpenCode" "Gemini CLI" "Claude" "FactoryAI Droid" "Agents" "Antigravity")
          echo "Selected: All"
        fi
        echo ""
        continue
      fi

      if [[ "$agent_input" =~ ^[0-9]+$ ]]; then
        local digits=()
        local i
        for ((i=0; i<${#agent_input}; i++)); do
          digits+=("${agent_input:$i:1}")
        done
        agent_input="${digits[*]}"
      fi

      for idx in $agent_input; do
        case "$idx" in
          1) choice="OpenCode" ;;
          2) choice="Gemini CLI" ;;
          3) choice="Claude" ;;
          4) choice="FactoryAI Droid" ;;
          5) choice="Agents" ;;
          6) choice="Antigravity" ;;
          7) choice="__all__" ;;
          8) choice="__done__" ;;
          *) choice="__invalid__" ;;
        esac

        case "$choice" in
          "__all__")
            local has_selection=0
            if declare -p target_platforms >/dev/null 2>&1; then
              has_selection=${#target_platforms[@]}
            fi
            if [[ "$has_selection" -gt 0 ]]; then
              target_platforms=()
              echo "Deselected: All"
            else
              target_platforms=("OpenCode" "Gemini CLI" "Claude" "FactoryAI Droid" "Agents" "Antigravity")
              echo "Selected: All"
            fi
            ;;
          "__done__")
            break 2
            ;;
          "__invalid__")
            echo "Invalid selection: $idx"
            ;;
          *)
            if [[ " ${target_platforms[*]-} " =~ " ${choice} " ]]; then
              local updated=()
              for p in "${target_platforms[@]}"; do
                [[ "$p" == "$choice" ]] && continue
                updated+=("$p")
              done
              if [[ ${#updated[@]} -eq 0 ]]; then
                unset target_platforms
              else
                target_platforms=("${updated[@]}")
              fi
              echo "Deselected: $choice"
            else
              target_platforms+=("$choice")
              echo "Selected: $choice"
            fi
            ;;
        esac
      done
      echo ""
    done

    # Fallback if empty
    local final_count=0
    if declare -p target_platforms >/dev/null 2>&1; then
      final_count=${#target_platforms[@]}
    fi
    if [[ "$final_count" -eq 0 ]]; then
      target_platforms=("Agents")
      echo "No agents selected, defaulting to Agents."
    fi
  fi

  # C. Select Skills
  # Detect skills in src_dir/skills/
  available_skills=()
  if [[ "$single_skill_mode" == true ]]; then
    # Running from within a single skill directory
    available_skills+=("$single_skill_name")
  elif [[ -d "${src_dir}/skills" ]]; then
    for skill_dir in "${src_dir}/skills"/*; do
      [[ -d "$skill_dir" ]] || continue
      available_skills+=("$(basename "$skill_dir")")
    done
  fi

  if [[ ${#available_skills[@]} -gt 0 ]]; then
    echo ""
    echo "Select skills (toggle with number, comma/space separated, choose Done when finished):"

    while true; do
      local selection_count=${#target_skills[@]}

      # Display Current Selection
      if [[ "$selection_count" -gt 0 ]]; then
        local joined=""
        for s in "${target_skills[@]}"; do
          if [[ -n "$joined" ]]; then
            joined="${joined}, ${s}"
          else
            joined="$s"
          fi
        done
        echo "Current selection: ${joined}"
      else
        echo "Current selection: (none)"
      fi

      # Options
      local total_skills=${#available_skills[@]}
      local idx_all=$((total_skills + 1))
      local idx_done=$((total_skills + 2))

      local i=0
      for skill in "${available_skills[@]}"; do
        i=$((i+1))
        echo "${i}) ${skill}"
      done

      local select_all_label="Select All"
      if [[ "$selection_count" -gt 0 ]]; then
        select_all_label="Deselect All"
      fi

      echo "${idx_all}) ${select_all_label}"
      echo "${idx_done}) Done"

      read -r -p "Skill(s): " skill_input || break
      skill_input="${skill_input//,/ }"

      if [[ -z "$skill_input" ]]; then
        echo "Invalid selection."
        echo ""
        continue
      fi

      if [[ "$skill_input" == "done" || "$skill_input" == "$idx_done" ]]; then
        break
      fi

      if [[ "$skill_input" == "all" || "$skill_input" == "$idx_all" ]]; then
        if [[ "$selection_count" -gt 0 ]]; then
          target_skills=()
          echo "Deselected: All"
        else
          target_skills=("${available_skills[@]}")
          echo "Selected: All"
        fi
        echo ""
        continue
      fi

      # Parse numbers
      for token in $skill_input; do
        if [[ "$token" =~ ^[0-9]+$ ]]; then
          if [[ "$token" -ge 1 && "$token" -le "$total_skills" ]]; then
            local selected="${available_skills[$((token-1))]}"

            # Toggle
            if [[ " ${target_skills[*]-} " =~ " ${selected} " ]]; then
              # Remove
              local new_list=()
              for s in "${target_skills[@]}"; do
                [[ "$s" == "$selected" ]] && continue
                new_list+=("$s")
              done
              target_skills=("${new_list[@]}")
              echo "Deselected: $selected"
            else
              # Add
              target_skills+=("$selected")
              echo "Selected: $selected"
            fi
          elif [[ "$token" -eq "$idx_all" ]]; then
             # Handle All by number
             if [[ "$selection_count" -gt 0 ]]; then
                target_skills=()
                echo "Deselected: All"
             else
                target_skills=("${available_skills[@]}")
                echo "Selected: All"
             fi
          elif [[ "$token" -eq "$idx_done" ]]; then
             break 2
          else
             echo "Invalid number: $token"
          fi
        fi
      done
      echo ""
    done
  else
    target_skills=("${available_skills[@]}")
  fi

  # If no skills found or selected, default to all
  if [[ ${#target_skills[@]} -eq 0 ]] && [[ -d "${src_dir}/skills" ]]; then
     echo "No skills selected, defaulting to ALL."
     target_skills=("${available_skills[@]}")
  fi

  # D. Gitignore (Local only)
  if [[ "$install_type" == "local" ]]; then
    read -p "Add local agent folders to .gitignore? (y/n): " gitignore_choice || true
    if [[ "$gitignore_choice" =~ ^[Yy]$ ]]; then
      for p in "${target_platforms[@]}"; do
        local p_dir
        case "$p" in
          "OpenCode") p_dir=".opencode" ;;
          "Gemini CLI") p_dir=".gemini" ;;
          "Claude") p_dir=".claude" ;;
          "FactoryAI Droid") p_dir=".factory" ;;
          "Agents") p_dir=".agents" ;;
          "Antigravity") p_dir=".antigravity" ;;
          *) continue ;;
        esac
        update_gitignore "$p_dir/"
      done
    fi
  fi

  echo ""
  echo "Installing ${PROJECT_NAME} to ${install_type} targets..."

  # 3. Installation Helper
  install_skill_to() {
    local platform="$1"
    local skill_name="$2"
    local base_dir="$3"
    local command_dir="${4:-}"

    local target_skill_dir="${base_dir}/${skill_name}"
    local p_norm=$(normalize_platform "$platform")

    # Safety checks...
    if [[ -z "$skill_name" ]] || [[ "$target_skill_dir" == "/" ]] || [[ "$target_skill_dir" == "$HOME" ]]; then
      return 1
    fi

    # Explicit copy strategy:
    # 1. Create base dir
    # 2. Remove old target dir
    # 3. Re-create target dir
    # 4. Copy contents INTO target dir using /. syntax for robustness
    mkdir -p "$base_dir"
    rm -rf "$target_skill_dir"
    mkdir -p "$target_skill_dir"
    
    # Determine skill source path based on mode
    local skill_src_path
    if [[ "$single_skill_mode" == true ]]; then
      skill_src_path="${src_dir}/${skill_name}"
    else
      skill_src_path="${src_dir}/skills/${skill_name}"
    fi
    
    cp -r "${skill_src_path}/." "$target_skill_dir/"

    # Standardize SKILL.md
    if [[ -f "${target_skill_dir}/Skill.md" ]]; then
      mv "${target_skill_dir}/Skill.md" "${target_skill_dir}/SKILL.md"
    fi
    echo "  - Installed skill: ${skill_name} to ${platform}"

    # Install command if needed
    if [[ -n "$command_dir" ]]; then
      local cmd_src=""
      local cmd_ext=""
      local cmd_base=""
      
      # Determine commands base path based on mode
      if [[ "$single_skill_mode" == true ]]; then
        cmd_base="${src_dir}/../commands"
      else
        cmd_base="${src_dir}/commands"
      fi

      if [[ "$p_norm" == "opencode" ]]; then
        cmd_src="${cmd_base}/opencode/${skill_name}.md"
        cmd_ext=".md"
        # Fallback for backward compatibility
        if [[ ! -f "$cmd_src" ]]; then
            cmd_src="${cmd_base}/${skill_name}.md"
        fi
      elif [[ "$p_norm" == "gemini" ]]; then
        cmd_src="${cmd_base}/gemini/${skill_name}.toml"
        cmd_ext=".toml"
      fi

      if [[ -n "$cmd_src" && -f "$cmd_src" ]]; then
        mkdir -p "$command_dir"
        local target_cmd="${command_dir}/${skill_name}${cmd_ext}"

        cp "$cmd_src" "$target_cmd"

        # Post-process for Gemini
        if [[ "$p_norm" == "gemini" ]]; then
           # Use | as delimiter for sed
           sed "s|{{SKILL_PATH}}|${target_skill_dir}|g" "$target_cmd" > "$target_cmd.tmp" && mv "$target_cmd.tmp" "$target_cmd"
        fi

        echo "  - Installed command: ${skill_name} to ${platform}"
      fi
    fi
  }

  # 4. Execute
  for platform in "${target_platforms[@]}"; do
    local s_base=""
    local c_base=""

    if [[ "$install_type" == "global" ]]; then
      case "$platform" in
        "OpenCode") s_base="$HOME/.config/opencode/skills"; c_base="$HOME/.config/opencode/commands" ;;
        "Gemini CLI") s_base="$HOME/.gemini/skills"; c_base="$HOME/.gemini/commands" ;;
        "Claude") s_base="$HOME/.claude/skills" ;;
        "FactoryAI Droid") s_base="$HOME/.factory/skills" ;;
        "Agents") s_base="$HOME/.config/agents/skills" ;;
        "Antigravity") s_base="$HOME/.antigravity/skills" ;;
      esac
    else
      case "$platform" in
        "OpenCode") s_base=".opencode/skills"; c_base=".opencode/commands" ;;
        "Gemini CLI") s_base=".gemini/skills"; c_base=".gemini/commands" ;;
        "Claude") s_base=".claude/skills" ;;
        "FactoryAI Droid") s_base=".factory/skills" ;;
        "Agents") s_base=".agents/skills" ;;
        "Antigravity") s_base=".antigravity/skills" ;;
      esac
    fi

    if [[ -n "$s_base" ]]; then
      if [[ ${#target_skills[@]} -gt 0 ]]; then
        for skill in "${target_skills[@]}"; do
          install_skill_to "$platform" "$skill" "$s_base" "$c_base"
        done
      fi
    fi
  done

  echo "Done."
}

main "$@"

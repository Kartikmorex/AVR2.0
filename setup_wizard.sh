#!/bin/bash

# AI SDK Setup Wizard
# This script helps users set up a development environment for creating apps with the AI SDK
# Powered by IOSENSE, part of Faclon Labs

# Text styling
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Progress spinner variables
SPIN_CHARS='/-\|'
STEPS_TOTAL=5
CURRENT_STEP=0

# Metadata file
METADATA_FILE=".iosense_metadata.json"

# Repository URLs
# Angular repositories
ANGULAR_USERID_CONNECTOR="https://github.com/Faclon-Labs/connector-userid-ts.git"
ANGULAR_TOKEN_CONNECTOR="https://github.com/iosense/angular-connector-token.git"
ANGULAR_DEMO="https://github.com/HenilJainIO/demo-angular-app.git"

# React repositories
REACT_USERID_CONNECTOR="https://github.com/Faclon-Labs/connector-userid-ts.git"
REACT_TOKEN_CONNECTOR="https://github.com/iosense/react-connector-token.git"
REACT_DEMO="https://github.com/HenilJainIO/demo-react-app.git"

# Python repositories
PYTHON_USERID_CONNECTOR="https://github.com/Faclon-Labs/connector-userid-py.git"
PYTHON_TOKEN_CONNECTOR="https://github.com/iosense/python-connector-token.git"
PYTHON_DEMO="https://github.com/HenilJainIO/demo-streamlit-app.git"

# Function to display a simple welcome animation
display_welcome() {
  clear
  echo -e "${BOLD}${MAGENTA}"
  echo "    _    ___   ____  ____  _  __"
  echo "   / \\  |_ _| / ___||  _ \\| |/ /"
  echo "  / _ \\  | |  \\___ \\| | | | ' / "
  echo " / ___ \\ | |   ___) | |_| | . \\ "
  echo "/_/   \\_\\___|/____/|____/|_|\\_\\"
  echo -e "${NC}"
  echo -e "${BOLD}${CYAN}Powered by IOSENSE, part of Faclon Labs${NC}"
  
  # Simple separator
  echo -e "\n${BLUE}$(printf '%.0s━' $(seq 1 70))${NC}\n"
  
  # Simple typing effect - ensure we use echo -e for the final output
  type_text "Welcome to the AI SDK Setup Wizard" 0.01
  type_text "This wizard will help you set up a development environment for creating"
  type_text "applications powered by IO-Sense data."
  
  # Simple separator
  echo -e "\n${BLUE}$(printf '%.0s━' $(seq 1 70))${NC}\n"
  
  # Add a press any key to continue option
  echo -e "${YELLOW}Press any key to continue...${NC}"
  read -n 1 -s -r
}

# Simple animated text typing effect
type_text() {
  local text="$1"
  local speed="${2:-0.01}"
  
  for (( i=0; i<${#text}; i++ )); do
    echo -ne "${text:$i:1}"
    sleep $speed
  done
  echo -e ""  # Use -e to ensure final newline interprets escape sequences correctly
}

# Simple loading animation
show_loading() {
  local message="$1"
  local duration="${2:-2}"
  local end_time=$((SECONDS + duration))
  
  echo -ne "${message} "
  
  local frames=('-' '\\' '|' '/')
  local i=0
  
  while [ $SECONDS -lt $end_time ]; do
    printf "\r${message} ${CYAN}${frames[$i]}${NC} "
    i=$(( (i+1) % 4 ))
    sleep 0.1
  done
  
  printf "\r${message} ${GREEN}✓${NC}\n"
}

# Simple progress bar
show_progress_bar() {
  local step=$1
  local total=$2
  local title=$3
  local width=40
  local percent=$((100 * step / total))
  local completed=$((width * step / total))
  
  printf "\r${BOLD}${CYAN}$title${NC} ["
  for ((i=0; i<width; i++)); do
    if [ $i -lt $completed ]; then
      echo -ne "${GREEN}#${NC}"
    else
      echo -ne "${BLUE}·${NC}"
    fi
  done
  printf "] ${percent}%%"
}

# Simple processing animation
show_processing() {
  local text="$1"
  local duration="${2:-1}"
  
  for i in $(seq 1 2); do
    printf "\r$text"
    sleep 0.2
    printf "\r$text."
    sleep 0.2
    printf "\r$text.."
    sleep 0.2
    printf "\r$text..."
    sleep 0.2
  done
  
  printf "\r${GREEN}$text... Done!${NC}\n"
}

# Simple separator
show_separator() {
  echo -e "\n${BLUE}$(printf '%.0s━' $(seq 1 70))${NC}\n"
}

# Simple section header
show_header() {
  local title=$1
  echo -e "\n${BOLD}${CYAN}$title${NC}"
  echo -e "${CYAN}$(printf '%.0s─' $(seq 1 ${#title}))${NC}\n"
}

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to check system requirements
check_requirements() {
  show_header "System Requirements Check"
  
  # Check for git
  printf "Checking for Git... "
  sleep 0.7
  if command_exists git; then
    echo -e "${GREEN}Found${NC}"
  else
    echo -e "${RED}Not found${NC}"
    echo -e "\n${YELLOW}Git is required but not installed. Please install Git and try again.${NC}"
    echo -e "\n${BOLD}Installation Instructions:${NC}"
    echo -e "  ${CYAN}• macOS:${NC} Install using Homebrew with '${BOLD}brew install git${NC}'"
    echo -e "          or download from https://git-scm.com/download/mac"
    echo -e "  ${CYAN}• Ubuntu/Debian:${NC} Install using '${BOLD}sudo apt-get install git${NC}'"
    echo -e "  ${CYAN}• Windows:${NC} Download from https://git-scm.com/download/win"
    echo -e "\nAfter installing Git, restart this wizard."
    exit 1
  fi
  
  # Check for bc (basic calculator) which is used in animations
  printf "Checking for bc (basic calculator)... "
  sleep 0.5
  if command_exists bc; then
    echo -e "${GREEN}Found${NC}"
  else
    echo -e "${YELLOW}Not found${NC}"
    echo -e "The bc command is recommended for best animation effects."
    echo -e "Setup will continue, but some animations may not display correctly."
    # Define a simpler fallback for the type_text function
    type_text() {
      local text="$1"
      local speed="${2:-0.03}"
      printf "\r"
      for (( i=0; i<${#text}; i++ )); do
        echo -ne "${text:$i:1}"
        sleep $speed
      done
      echo -e ""  # Use -e to ensure escape sequences are interpreted correctly
    }
  fi
  
  echo -e "\n${GREEN}✓ System requirements check complete!${NC}"
  sleep 1
}

# Function to clone repositories
clone_repositories() {
  # Directly show header without transition
  show_header "Setting Up Repositories"
  
  # Select the appropriate repository URLs based on framework and connector type
  if [[ "$FRAMEWORK" == "angular" ]]; then
    if [[ "$CONNECTOR_TYPE" == "userid" ]]; then
      CONNECTOR_REPO="$ANGULAR_USERID_CONNECTOR"
    else
      CONNECTOR_REPO="$ANGULAR_TOKEN_CONNECTOR"
    fi
    DEMO_REPO="$ANGULAR_DEMO"
  elif [[ "$FRAMEWORK" == "react" ]]; then
    if [[ "$CONNECTOR_TYPE" == "userid" ]]; then
      CONNECTOR_REPO="$REACT_USERID_CONNECTOR"
    else
      CONNECTOR_REPO="$REACT_TOKEN_CONNECTOR"
    fi
    DEMO_REPO="$REACT_DEMO"
  else
    if [[ "$CONNECTOR_TYPE" == "userid" ]]; then
      CONNECTOR_REPO="$PYTHON_USERID_CONNECTOR"
    else
      CONNECTOR_REPO="$PYTHON_TOKEN_CONNECTOR"
    fi
    DEMO_REPO="$PYTHON_DEMO"
  fi
  
  # Clone connector repository directly to the root directory
  echo -e "Cloning ${BOLD}${FRAMEWORK}${NC} connector repository..."
  git clone --quiet "$CONNECTOR_REPO" > /dev/null 2>&1 &
  show_spinner $! "Cloning connector repository..."
  
  # Clone demo repository if requested
  if [[ "$INCLUDE_DEMO" == true ]]; then
    echo -e "\nCloning ${BOLD}${FRAMEWORK}${NC} demo application..."
    # Clone demo files to the root directly
    git clone --quiet "$DEMO_REPO" > /dev/null 2>&1 &
    show_spinner $! "Cloning demo app..."
    
    # Make the run.sh executable if it exists
    if [ -f "run.sh" ]; then
      echo -ne "Making demo app setup script executable... "
      chmod +x run.sh
      echo -e "${GREEN}Done${NC}"
    fi
  fi
}

# Function to save metadata
save_metadata() {
  show_processing "Saving configuration metadata" 1
  
  # Create JSON metadata
  cat > "$METADATA_FILE" << EOF
{
  "project_name": "$PROJECT_NAME",
  "framework": "$FRAMEWORK",
  "connector_type": "$CONNECTOR_TYPE",
  "include_demo": $INCLUDE_DEMO,
  "connector_repo": "$CONNECTOR_REPO",
  "demo_repo": "$DEMO_REPO",
  "last_updated": "$(date +%Y-%m-%d)"
}
EOF
  
  echo -e "${GREEN}Metadata saved successfully${NC}"
}

# Function to display next steps with an enhanced completion animation
display_next_steps() {
  # Simple header
  show_header "Setup Complete! 🎉"
  
  type_text "Your AI SDK development environment has been set up successfully." 0.01
  echo -e "\n${BOLD}${CYAN}What's Next?${NC}"
  
  if [[ "$INCLUDE_DEMO" == true ]]; then
    echo -e "  ${GREEN}1.${NC} Explore the repository code"
    echo -e "  ${GREEN}2.${NC} Run the demo app setup script (if available):"
    echo -e "     ${BOLD}./run.sh${NC}"
    echo -e "\n  The demo app will show you how to integrate AI SDK data into your application."
  else
    echo -e "  ${GREEN}1.${NC} Explore the repository code"
    echo -e "  ${GREEN}2.${NC} Start integrating the AI SDK"
  fi
  
  show_separator
  
  # Enhanced documentation section
  echo -e "${BOLD}${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${CYAN}║                      DOCUMENTATION                        ║${NC}"
  echo -e "${BOLD}${CYAN}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${BOLD}📚 Getting Started Guide${NC}"
  echo -e "  • ${CYAN}Official Documentation:${NC} https://docs.iosense.dev"
  echo -e "  • ${CYAN}API Reference:${NC} https://api.iosense.dev"
  echo -e "  • ${CYAN}GitHub Repository:${NC} https://github.com/iosense/ai-sdk"
  
  echo -e "\n${BOLD}📋 Available Commands${NC}"
  if [[ "$FRAMEWORK" == "angular" ]]; then
    echo -e "  • ${CYAN}Start development server:${NC} ${BOLD}ng serve${NC}"
    echo -e "  • ${CYAN}Build for production:${NC} ${BOLD}ng build --prod${NC}"
    echo -e "  • ${CYAN}Run tests:${NC} ${BOLD}ng test${NC}"
  elif [[ "$FRAMEWORK" == "react" ]]; then
    echo -e "  • ${CYAN}Start development server:${NC} ${BOLD}npm start${NC}"
    echo -e "  • ${CYAN}Build for production:${NC} ${BOLD}npm run build${NC}"
    echo -e "  • ${CYAN}Run tests:${NC} ${BOLD}npm test${NC}"
  elif [[ "$FRAMEWORK" == "python" ]]; then
    echo -e "  • ${CYAN}Install dependencies:${NC} ${BOLD}pip install -r requirements.txt${NC}"
    echo -e "  • ${CYAN}Run application:${NC} ${BOLD}python app.py${NC}"
    echo -e "  • ${CYAN}Run tests:${NC} ${BOLD}pytest${NC}"
  fi
  
  echo -e "\n${BOLD}🔄 Update Your Installation${NC}"
  echo -e "  To check for updates later, run:"
  echo -e "  ${BOLD}./setup_wizard.sh --update${NC}"
  
  echo -e "\n${BOLD}💡 Tips${NC}"
  echo -e "  • ${YELLOW}Read the README.md${NC} in each directory for specific instructions"
  echo -e "  • ${YELLOW}Check the connector documentation${NC} for integration details"
  echo -e "  • ${YELLOW}Join our community Discord${NC} for support: https://discord.gg/iosense"
  
  echo -e "\n${BOLD}🛟 Need Help?${NC}"
  echo -e "  • ${CYAN}Email support:${NC} support@iosense.dev"
  echo -e "  • ${CYAN}Report issues:${NC} https://github.com/iosense/ai-sdk/issues"
  echo -e "  • ${CYAN}Community forum:${NC} https://community.iosense.dev"
  
  echo -e "\n${BOLD}${MAGENTA}Happy coding with AI SDK!${NC}"
  show_separator
}

# Function to check for updates
check_for_updates() {
  if [ -f "$METADATA_FILE" ]; then
    show_header "Checking for Updates"
    show_processing "Reading metadata" 1
    
    # Read metadata
    CONNECTOR_REPO=$(grep -o '"connector_repo": "[^"]*' "$METADATA_FILE" | cut -d'"' -f4)
    
    echo -e "Ready to update from connector repository"
    echo -e "${YELLOW}→ Will perform a fresh clone from: ${CONNECTOR_REPO}${NC}"
    
    # Always set this to true to prompt the user
    HAS_UPDATES=true
    
    # Ask if user wants to apply updates
    if [ "$HAS_UPDATES" = true ]; then
      echo -e "\n${BOLD}${YELLOW}Would you like to clone the latest version of the repository?${NC}"
      
      while true; do
        read -p "$(echo -e ${BOLD}"Proceed with clone? (y/n): "${NC})" update_choice
        case $update_choice in
          [Yy]*)
            show_header "Cloning Repository"
            
            # Back up metadata file
            echo -ne "Backing up metadata file... "
            if [ -f "$METADATA_FILE" ]; then
              cp "$METADATA_FILE" "$METADATA_FILE.bak"
            fi
            echo -e "${GREEN}Done${NC}"
            
            # Remove existing files but keep important ones
            echo -ne "Cleaning current directory... "
            find . -maxdepth 1 -not -name "setup_wizard.sh" -not -name "$METADATA_FILE.bak" -not -name "README.md" -not -name "." -not -name ".git" -not -name "help" | xargs rm -rf
            echo -e "${GREEN}Done${NC}"
            
            # Clone the repository directly
            echo -e "Cloning repository..."
            git clone --quiet "$CONNECTOR_REPO" &
            show_spinner $! "Cloning latest version..."
            
            # Restore metadata file with updated timestamp
            show_processing "Updating metadata" 1
            if [ -f "$METADATA_FILE.bak" ]; then
              TMP_FILE=$(mktemp)
              cat "$METADATA_FILE.bak" | sed "s/\"last_updated\": \"[^\"]*\"/\"last_updated\": \"$(date +%Y-%m-%d)\"/" > "$TMP_FILE"
              mv "$TMP_FILE" "$METADATA_FILE"
              rm "$METADATA_FILE.bak"
            fi
            
            show_loading "Finalizing update" 2
            echo -e "\n${GREEN}✓ Fresh repository clone completed!${NC}"
            break
            ;;
          [Nn]*)
            echo -e "${BLUE}Skipping update.${NC}"
            break
            ;;
          *)
            echo -e "${YELLOW}Please answer yes (y) or no (n).${NC}"
            ;;
        esac
      done
    fi
    
    return 0
  else
    return 1
  fi
}

# Function to handle rerun
handle_rerun() {
  # If metadata exists, we are in a rerun situation
  if [ -f "$METADATA_FILE" ]; then
    PROJECT_NAME=$(grep -o '"project_name": "[^"]*' "$METADATA_FILE" | cut -d'"' -f4)
    FRAMEWORK=$(grep -o '"framework": "[^"]*' "$METADATA_FILE" | cut -d'"' -f4)
    
    show_header "Existing Project Detected"
    
    echo -e "Found an existing AI SDK project setup:"
    echo -e "  ${BOLD}Project name:${NC} $PROJECT_NAME"
    echo -e "  ${BOLD}Framework:${NC} $FRAMEWORK"
    
    while true; do
      echo -e "\n${BOLD}Options:${NC}"
      echo -e "  ${CYAN}1)${NC} Check for updates to connector"
      echo -e "  ${CYAN}2)${NC} Remove existing setup and create a new one"
      echo -e "  ${CYAN}3)${NC} Exit wizard"
      echo -e ""
      
      read -p "$(echo -e ${BOLD}"Enter your choice (1-3): "${NC})" choice
      case $choice in
        1) 
          # Just run the update check and then exit
          show_loading "Preparing update check" 2
          check_for_updates
          echo -e "\n${GREEN}✓ Update check completed. Exiting wizard.${NC}"
          exit 0
          ;;
        2) 
          show_header "Removing Existing Setup"
          
          show_loading "Preparing cleanup" 1
          
          echo -ne "Cleaning current directory... "
          # Clean up non-essential files but keep the essential ones
          find . -maxdepth 1 -not -name "setup_wizard.sh" -not -name "README.md" -not -name "." -not -name ".git" -not -name "help" | xargs rm -rf
          echo -e "${GREEN}Done${NC}"
          
          echo -ne "Removing metadata file... "
          rm -f "$METADATA_FILE"
          echo -e "${GREEN}Done${NC}"
          
          show_loading "Finalizing cleanup" 2
          echo -e "\n${GREEN}✓ Existing metadata removed. Ready to set up a new one.${NC}"
          return 0
          ;;
        3) 
          echo -e "\n${BLUE}Exiting setup wizard.${NC}"
          exit 0
          ;;
        *) 
          echo -e "${YELLOW}Invalid choice. Please enter a number between 1 and 3.${NC}"
          ;;
      esac
    done
  fi
  
  return 0
}

# Simple spinner for long-running operations
show_spinner() {
  local pid=$1
  local message=$2
  local i=0
  local frames=('-' '\\' '|' '/')
  
  echo -ne "$message "
  
  while kill -0 $pid 2>/dev/null; do
    i=$(( (i+1) % 4 ))
    printf "\r$message ${frames[$i]} "
    sleep .1
  done
  
  printf "\r$message ${GREEN}✓${NC}\n"
}

# Function to display help information
show_help() {
  echo -e "${BOLD}${CYAN}AI SDK Setup Wizard - Help${NC}\n"
  echo -e "This script helps you set up a development environment for creating"
  echo -e "applications powered by AI SDK data."
  
  echo -e "\n${BOLD}Usage:${NC}"
  echo -e "  ${BOLD}./setup_wizard.sh${NC}             Run the setup wizard"
  echo -e "  ${BOLD}./setup_wizard.sh --update${NC}    Check for updates to existing installation"
  echo -e "  ${BOLD}./setup_wizard.sh --help${NC}      Display this help message"
  
  echo -e "\n${BOLD}Options:${NC}"
  echo -e "  ${CYAN}--update${NC}    Check for and apply updates to an existing installation"
  echo -e "  ${CYAN}--help${NC}      Show this help message and exit"
  
  echo -e "\n${BOLD}Description:${NC}"
  echo -e "  The AI SDK Setup Wizard guides you through setting up a development"
  echo -e "  environment for creating applications with AI SDK. It helps you:"
  echo -e "    • Choose from Angular, React, or Python frameworks"
  echo -e "    • Set up connector libraries for AI data integration"
  echo -e "    • Install optional demo applications"
  echo -e "    • Create a project structure ready for development"
  
  echo -e "\n${BOLD}Prerequisites:${NC}"
  echo -e "  • Git must be installed on your system"
  echo -e "  • Internet connection for downloading repositories"
  echo -e "  • For Angular/React: Node.js and npm"
  echo -e "  • For Python: Python 3.x and pip"
  
  echo -e "\n${BOLD}More Information:${NC}"
  echo -e "  Visit https://iosense.dev for official documentation"
  
  echo -e "\n${BOLD}${CYAN}Powered by IOSENSE, part of Faclon Labs${NC}"
}

# Main execution
if [ "$1" == "--update" ]; then
  display_welcome
  check_for_updates || echo -e "${YELLOW}No existing metadata found. Run the setup wizard first.${NC}"
  exit 0
elif [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
  show_help
  exit 0
else
  # Display welcome with simple animation
  display_welcome
  
  # First check for git and other requirements
  check_requirements
  
  # Handle rerun
  handle_rerun
  
  # Continue with setup for new projects
  HAS_UPDATES=false
  
  # Start UI from step 2 without transition animation
  CURRENT_STEP=2
  show_header "Configuration Options"
  
  # Ask for framework
  echo -e "${BOLD}Which framework would you like to use?${NC}"
  echo -e "  ${CYAN}1)${NC} Angular   - TypeScript-based web framework"
  echo -e "  ${CYAN}2)${NC} React     - JavaScript library for building user interfaces"
  echo -e "  ${CYAN}3)${NC} Python    - For backend or data-focused applications"
  echo -e "  ${CYAN}4)${NC} Exit      - Exit the setup wizard"
  echo -e ""
  
  while true; do
    read -p "$(echo -e ${BOLD}"Enter your choice (1-4): "${NC})" framework_choice
    case $framework_choice in
      1) FRAMEWORK="angular"; echo -e "\n${GREEN}Selected: Angular${NC}"; break;;
      2) FRAMEWORK="react"; echo -e "\n${GREEN}Selected: React${NC}"; break;;
      3) FRAMEWORK="python"; echo -e "\n${GREEN}Selected: Python${NC}"; break;;
      4) echo -e "\n${BLUE}Exiting setup wizard.${NC}"; exit 0;;
      *) echo -e "${YELLOW}Invalid choice. Please enter a number between 1 and 4.${NC}";;
    esac
  done
  
  # Set connector type (UserID for now, disable prompt)
  CONNECTOR_TYPE="userid"
  echo -e "\n${BOLD}Connector Type:${NC} ${GREEN}UserID-based${NC} (default)"
  
  # Ask for demo apps
  echo -e "\n${BOLD}Would you like to include demo apps?${NC}"
  echo -e "Demo apps provide examples of how to use the AI SDK connectors"
  echo -e "and include setup scripts to get you started quickly."
  echo -e ""
  
  while true; do
    read -p "$(echo -e ${BOLD}"Include demo apps? (y/n): "${NC})" demo_choice
    case $demo_choice in
      [Yy]*) INCLUDE_DEMO=true; echo -e "\n${GREEN}Demo apps will be included${NC}"; break;;
      [Nn]*) INCLUDE_DEMO=false; echo -e "\n${GREEN}No demo apps will be included${NC}"; break;;
      *) echo -e "${YELLOW}Please answer yes (y) or no (n).${NC}";;
    esac
  done
  
  # Ask for project name (for metadata only)
  echo -e "\n${BOLD}Project Name:${NC}"
  echo -e "This will be used for identification purposes."
  echo -e ""
  
  while true; do
    read -p "$(echo -e ${BOLD}"Enter a name for your project: "${NC})" PROJECT_NAME
    if [[ -z "$PROJECT_NAME" ]]; then
      echo -e "${YELLOW}Project name cannot be empty. Please enter a valid name.${NC}"
    else
      break
    fi
  done
  
  echo -e "\n${BLUE}Configuration complete. Beginning setup...${NC}"
  
  # Skip directory creation, clone repositories directly to the root
  clone_repositories
  save_metadata
fi 

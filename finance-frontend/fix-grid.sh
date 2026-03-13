#!/bin/bash

# Files that need Grid fix
files=(
  "src/pages/Documents.tsx"
  "src/pages/Settings.tsx"
  "src/pages/Transactions.tsx"
)

for file in "${files[@]}"; do
  echo "Fixing $file..."
  
  # Remove Grid from imports
  sed -i '' 's/Grid,//' "$file" 2>/dev/null
  sed -i '' 's/,.*Grid//' "$file" 2>/dev/null
  
  # Add Grid2 import
  if ! grep -q "import Grid from '@mui/material/Unstable_Grid2'" "$file"; then
    sed -i '' "/} from '@mui\/material';/a\\
import Grid from '@mui/material/Unstable_Grid2';" "$file"
  fi
  
  # Remove 'item' prop from Grid components
  sed -i '' 's/<Grid item /<Grid /g' "$file"
done

echo "Grid fixes applied!"

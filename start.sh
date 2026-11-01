#!/usr/bin/env bash
# ==============================================================================
# OCMS - Single Command Launcher
# Boots both the NestJS API Backend (port 3001) and Next.js Web Frontend (port 3000)
# ==============================================================================

set -e

echo "=========================================================="
echo " Starting Online Course Management System (OCMS)..."
echo " Backend:  http://localhost:3001/api/v1 (Docs: /api-docs)"
echo " Frontend: http://localhost:3000"
echo "=========================================================="

npm run dev

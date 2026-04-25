#!/bin/bash

set -e

VM_USER="jithsungh"
VM_IP="135.235.195.83"
SSH_KEY="~/.ssh/interviewer-infra_key.pem"

echo "Connecting to VM and deploying..."

ssh -i $SSH_KEY $VM_USER@$VM_IP << 'EOF'

set -e

cd ~/ai_interviewer

echo "Stopping existing server on port 8000..."

PID=$(lsof -t -i:8000 || true)

if [ ! -z "$PID" ]; then
    echo "Killing process $PID"
    kill -9 $PID
else
    echo "No process running on port 8000"
fi

echo "Pulling latest code..."
git pull origin main

echo "Activating virtual environment..."
source .venv/bin/activate

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Starting FastAPI server..."

nohup uvicorn main:app --reload --host 0.0.0.0 --port 8000 > server.log 2>&1 &

echo "Deployment complete."

EOF

echo "Done."

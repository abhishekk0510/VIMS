#!/bin/bash
export DB_USERNAME=vims_user
export DB_PASSWORD=Vims@Local123
export JWT_SECRET=vims-super-secret-jwt-key-change-in-production-256bits-local
export CORS_ORIGINS=http://localhost:3000
export UPLOAD_DIR=./uploads
export MAIL_FROM=noreply@vims.com
export SPRING_MAIL_HOST=smtp.gmail.com
export SPRING_MAIL_PORT=587
export SPRING_MAIL_USERNAME=
export SPRING_MAIL_PASSWORD=
export HF_TOKEN=

echo "Starting VIMS Backend on port 8080..."
cd backend
java -jar target/vims-backend-1.0.0.jar

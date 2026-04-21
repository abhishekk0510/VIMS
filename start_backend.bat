@echo off
echo Starting VIMS Backend...
cd backend
set DB_USERNAME=vims_user
set DB_PASSWORD=Vims@Local123
set JWT_SECRET=vims-super-secret-jwt-key-change-in-production-256bits-local
set CORS_ORIGINS=http://localhost:3000
set UPLOAD_DIR=./uploads
set MAIL_FROM=noreply@vims.com
java -jar target/vims-backend-1.0.0.jar

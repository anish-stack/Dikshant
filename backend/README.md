First run npm install 

Then run -> docker-compose up --build


Service kor un krne ke liye 
docker build -t base-service -f base.Dockerfile .


For making a image
docker build -t base-service -f base.Dockerfile .

docker stop auth-service

docker compose up -d --build auth-service

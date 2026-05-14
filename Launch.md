# Поднятие архитектуры
docker-compose down         # Удалит данные(полностью положет контейнеры)
docker-compose up --build

# Если очистил бд, надо создать нувую бд в контейнере
docker exec -it recruiting_db /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P Kv6084242kv! -C -Q "CREATE DATABASE [recruiting_db];"

Admin:      admin@hirevich.by / password123
Recruiter:  ivan.recruiter@company.com / password123
Candidate:  alex.candidate@work.com / password123

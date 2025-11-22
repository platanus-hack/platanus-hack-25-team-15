.PHONY: up down restart logs build clean help

help:
	@echo "Comandos disponibles:"
	@echo "  make up        - Levantar todos los servicios"
	@echo "  make down      - Detener todos los servicios"
	@echo "  make restart   - Reiniciar todos los servicios"
	@echo "  make logs      - Ver logs de todos los servicios"
	@echo "  make build     - Construir las imágenes"
	@echo "  make clean     - Limpiar contenedores y volúmenes"

up:
	docker-compose up

down:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f

build:
	docker-compose build

clean:
	docker-compose down -v

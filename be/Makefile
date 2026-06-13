run:
	fastapi dev src/main.py
newmg:
	alembic revision --autogenerate -m "$(name)"
mghead:
	alembic upgrade head
mgdown:
	alembic downgrade -1

.PHONY: run newmg mghead mgdown
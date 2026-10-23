FROM python:3.11-slim

ARG TORCH_INDEX_URL=https://download.pytorch.org/whl/cpu

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TOKENIZERS_PARALLELISM=false

WORKDIR /app
COPY ai/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --index-url "${TORCH_INDEX_URL}" torch==2.6.0 \
    && pip install --no-cache-dir -r /app/requirements.txt
COPY ai /app/ai

EXPOSE 8080
CMD ["uvicorn", "ai.main:app", "--host", "0.0.0.0", "--port", "8080"]

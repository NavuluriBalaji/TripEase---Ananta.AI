FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY pythonservers/ADK/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY pythonservers/ADK/multi_tool_agent/ ./multi_tool_agent/
COPY outbox/api_server_fixed.py ./app.py

# Create .env placeholder
RUN echo "# Add environment variables here" > .env

# Expose port (Hugging Face uses 7860)
EXPOSE 7860

# Set environment variables
ENV PORT=7860
ENV HOST=0.0.0.0
ENV PYTHONUNBUFFERED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:7860/health')" || exit 1

# Run the application
CMD ["python", "-u", "app.py"]

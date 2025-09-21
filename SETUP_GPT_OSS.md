# Setup Guide for gpt-oss-20b Model

The backend has been updated to use OpenAI's open source `gpt-oss-20b` model instead of the paid API. You can run this model locally using either **Ollama** (recommended) or **Transformers**.

## Option 1: Using Ollama (Recommended - Easiest Setup)

### Install Ollama
```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Or download from https://ollama.com/
```

### Pull and Run gpt-oss-20b
```bash
# Download the model (this may take a while - ~12GB)
ollama pull gpt-oss:20b

# Test the model
ollama run gpt-oss:20b
```

The backend will automatically detect Ollama running on `localhost:11434`.

## Option 2: Using Transformers Server

### Install Dependencies
```bash
pip install -U transformers torch accelerate
```

### Start Transformers Server
```bash
# Start OpenAI-compatible server
transformers serve --model-name-or-path openai/gpt-oss-20b --host 0.0.0.0 --port 8000
```

The backend will fallback to Transformers server on `localhost:8000`.

## Option 3: Using vLLM (Production Ready)

### Install vLLM with gpt-oss support
```bash
pip install --pre vllm==0.10.1+gptoss \
    --extra-index-url https://wheels.vllm.ai/gpt-oss/ \
    --extra-index-url https://download.pytorch.org/whl/nightly/cu128 \
    --index-strategy unsafe-best-match
```

### Start vLLM Server
```bash
vllm serve openai/gpt-oss-20b --port 8000
```

## Testing the Setup

1. Start your chosen model server (Ollama/Transformers/vLLM)
2. Start the backend: `cd backend && npm run dev`
3. Start the frontend: `cd frontend && npm start`
4. Upload a CSV file and test the chat interface

## Hardware Requirements

- **RAM**: At least 16GB (model runs in ~12GB memory with MXFP4 quantization)
- **GPU**: Optional but recommended for faster inference
- **Storage**: ~12GB for model download

## Troubleshooting

- If Ollama fails, the backend will automatically try Transformers server
- Check console logs for endpoint connection attempts
- Ensure your chosen server is running before starting the backend
- For GPU acceleration, make sure PyTorch detects your GPU: `python -c "import torch; print(torch.cuda.is_available())"`

## Model Features

- **Apache 2.0 License**: Free for commercial use
- **Reasoning Levels**: The backend uses "medium" reasoning by default
- **Local Inference**: No API costs or internet dependency
- **Privacy**: All data stays on your machine
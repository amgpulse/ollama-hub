<div align="center">

# 🦙 Ollama Hub

<p align="center">
  <b>A lightweight, blazing-fast, and secure in-memory web interface for your local Ollama LLMs.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-active-success.svg" alt="Status">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node Version">
  <img src="https://img.shields.io/badge/tailwind-css-blueviolet.svg" alt="Tailwind CSS">
</p>

</div>

---

## 🚀 Overview

**Ollama Hub** is a modern, distraction-free web chat dashboard designed to interface directly with locally hosted [Ollama](https://ollama.com/) and [llama.cpp](https://github.com/ggml-org/llama.cpp) models. It runs entirely in your browser with **zero persistent disk storage** for chats—ensuring your conversations remain completely private and disappear the moment you refresh or clear the session.

## ⚙️ How it works

The Node.js server serves the web interface and its frontend libraries locally; the page does not load scripts, stylesheets, or fonts from external CDNs. The browser connects directly to the selected inference server. Ollama uses `/api/tags` and `/api/chat`; llama.cpp uses its OpenAI-compatible `/v1/models` and streaming `/v1/chat/completions` endpoints. Conversation history stays in browser memory and is not saved to disk.

## 🧱 Project structure

The browser application is split into native JavaScript modules served by Express. Tailwind CSS is compiled into a local stylesheet:

```text
src/
├── components/   # Chat, settings, model selector, and message list
├── services/     # Ollama API client
├── utils/        # Formatting, validation, and browser storage helpers
├── styles/       # Tailwind input and application CSS
└── main.js       # Application entry point
public/
├── index.html    # Main page
└── styles/
    └── app.css   # Built, locally served stylesheet
```

Express serves `public/` for the page and built assets, `/src/` for browser modules, and local frontend dependencies from `/vendor/`.

## 🧠 Supported models and runtimes

Choose **Ollama** or **llama.cpp** in Connection Settings. Ollama Hub automatically populates the model selector from the selected server.

For Ollama, any model available on the configured host is supported:

```bash
ollama pull llama3
```

For llama.cpp, start `llama-server` with a model loaded (the default server port is `8080`), for example:

```bash
llama-server -m /path/to/model.gguf --host 0.0.0.0 --port 8080
```

Set the host in the sidebar to the llama.cpp server URL (for example `http://127.0.0.1:8080`). The client appends `/v1` automatically; a URL already ending in `/v1` also works. Since requests are made directly by the browser, remote servers must allow browser CORS requests.

---

## ✨ Key Features

- **⚡ Real-time Streaming:** Smooth, instant token streaming with a typing indicator and stop generation control.
- **📊 Output Metrics:** Shows a live estimated output speed and replaces it with Ollama's exact tokens-per-second rate when available, alongside the output token count.
- **🔒 Purely In-Memory (No Logs):** Chat histories are never written to disk or uploaded anywhere. Privacy first.
- **🧠 Dynamic Model Switcher:** Automatically detects and lets you switch between all locally installed Ollama models (`llama3`, `deepseek-r1`, `mistral`, etc.).
- **🎨 Markdown & Syntax Highlighting:** Rich markdown rendering with automatic code block syntax highlighting and one-click **Copy** buttons.
- **🎛️ Advanced Inference Parameters:** Customize system prompts and temperature on the fly to tune your model's creativity.
- **📱 Responsive & Sleek UI:** Built with Tailwind CSS, featuring a gorgeous dark mode interface optimized for both desktop and mobile devices.

---

## 🛠️ Prerequisites

Make sure you have the following installed on your system:
1. **Node.js** (v18 or higher)
2. At least one supported runtime: Ollama running locally (`http://localhost:11434`) with a model already pulled, or a llama.cpp `llama-server` running locally (`http://localhost:8080`) with a model available.

For fully offline use, install the Node.js dependencies and download the model(s) you need before disconnecting from the internet. Once those are available locally, Ollama Hub and the inference runtime can run without an internet connection.

> **Note:** `npm install` downloads packages from the npm registry, and pulling a model may download it from the internet. Those are setup steps; the running web interface itself uses local assets and does not require internet access.

To rebuild the local stylesheet after changing Tailwind classes or styles, run:

```bash
npm run build
```

---

## 📦 Installation & Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/amgpulse/ollama-hub.git
   cd ollama-hub
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   This setup step requires access to the npm registry unless the dependencies are already available locally.

3. **Create a local environment file (optional):**
   ```bash
   cp .env.example .env
   ```

4. **Start the application in development mode:**
   ```bash
   npm run dev
   ```
   or launch the production server:
   ```bash
   npm start
   ```

5. **Open in your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000) and start chatting with your local AI!

---

## ⚙️ Configuration

- **Environment defaults:** Set `PORT`, `OLLAMA_HOST`, and `LLAMA_CPP_HOST` in a `.env` file to configure the app port and default runtime endpoints.
  ```env
  PORT=3000
  OLLAMA_HOST=http://127.0.0.1:11434
  LLAMA_CPP_HOST=http://127.0.0.1:8080
  ```
- **Runtime override:** Choose a runtime and change its server URL directly from the sidebar configuration panel.
- **System Instructions:** Tailor the AI's behavior instantly using the system prompt input box.
- **Health check:** The app exposes `/health` for lightweight availability monitoring and `/api/config` to retrieve the configured runtime hosts.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/amgpulse/ollama-hub/issues).

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

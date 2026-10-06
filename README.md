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

**Ollama Hub** is a modern, distraction-free web chat dashboard designed to interface directly with your locally hosted [Ollama](https://ollama.com/) models. It runs entirely in your browser with **zero persistent disk storage** for chats—ensuring your conversations remain completely private and disappear the moment you refresh or clear the session.

## ⚙️ How it works

The Node.js server serves the web interface, which connects directly from your browser to the Ollama host. It fetches the models installed there and sends chat requests to Ollama's `/api/chat` endpoint, displaying the streamed response as it arrives. Conversation history stays in browser memory and is not saved to disk.

## 🧱 Project structure

The browser application is split into native JavaScript modules, served directly by Express without a separate build step:

```text
src/
├── components/   # Chat, settings, model selector, and message list
├── services/     # Ollama API client
├── utils/        # Formatting, validation, and browser storage helpers
├── styles/       # Application CSS
└── main.js       # Application entry point
public/
└── index.html    # Main page
```

Express serves `public/` for the page and `/src/` for the browser modules and stylesheet.

## 🧠 Supported Ollama models

Ollama Hub works with any model installed on your Ollama host that supports Ollama's chat API. The model selector is populated automatically from that host, so you can use models such as `llama3`, `deepseek-r1`, and `mistral`—or any other compatible model you have pulled. For example:

```bash
ollama pull llama3
```

Models must be available on the Ollama host configured in the sidebar. Model performance and hardware requirements depend on the model you choose.

---

## ✨ Key Features

- **⚡ Real-time Streaming:** Smooth, instant token streaming with a typing indicator and stop generation control.
- **🔒 Purely In-Memory (No Logs):** Chat histories are never written to disk or uploaded anywhere. Privacy first.
- **🧠 Dynamic Model Switcher:** Automatically detects and lets you switch between all locally installed Ollama models (`llama3`, `deepseek-r1`, `mistral`, etc.).
- **🎨 Markdown & Syntax Highlighting:** Rich markdown rendering with automatic code block syntax highlighting and one-click **Copy** buttons.
- **🎛️ Advanced Inference Parameters:** Customize system prompts and temperature on the fly to tune your model's creativity.
- **📱 Responsive & Sleek UI:** Built with Tailwind CSS, featuring a gorgeous dark mode interface optimized for both desktop and mobile devices.

---

## 🛠️ Prerequisites

Make sure you have the following installed on your system:
1. **Node.js** (v18 or higher)
2. **Ollama** running locally (`http://localhost:11434`) with at least one model pulled:
   ```bash
   ollama pull llama3
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

- **Environment defaults:** Set `PORT` and `OLLAMA_HOST` in a `.env` file to define the app port and default Ollama endpoint.
  ```env
  PORT=3000
  OLLAMA_HOST=http://127.0.0.1:11434
  ```
- **Runtime override:** If Ollama runs on a different port or machine, you can change the server URL directly from the sidebar configuration panel.
- **System Instructions:** Tailor the AI's behavior instantly using the system prompt input box.
- **Health check:** The app exposes `/health` for lightweight availability monitoring and `/api/config` to retrieve the configured Ollama host.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/amgpulse/ollama-hub/issues).

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

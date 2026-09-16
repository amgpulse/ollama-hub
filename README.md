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
   git clone https://github.com/your-username/ollama-hub.git
   cd ollama-hub
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the application:**
   ```bash
   npm start
   ```

4. **Open in your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000) and start chatting with your local AI!

---

## ⚙️ Configuration

- **Ollama Host:** If Ollama runs on a different port or machine, you can change the server URL directly from the sidebar configuration panel.
- **System Instructions:** Tailor the AI's behavior instantly using the system prompt input box.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/your-username/ollama-hub/issues).

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

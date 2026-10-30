## CPU / Apple Silicon
****Start the AI****
```sh
npm run ai:up
```
---
****Train the AI**** (the AI need to be trained before the extension can be used)
```sh
npm run ai:train
```
---
Start the server on port 3000 at `http://127.0.0.1:3000`. (The extension need this in order to talk to the AI on port `8080`)
```sh
npm start
```

Fine-tunes Legal-BERT on UNFAIR-ToS with an 80/10/10 split and prints test recall and F2-score.

```sh
npm run ai:pull-qwen
```
Downloads Qwen 2.5 14B Instruct into the running Ollama container.

```sh
curl http://127.0.0.1:8080/health
```
Checks that the AI API, fine-tuned Legal-BERT checkpoint, and Qwen model are ready.

```sh
docker compose down
```
Stops the CPU/Apple Silicon AI containers.

## NVIDIA GPU

```sh
npm start
```
Starts the local extension preview at `http://127.0.0.1:3000`.

```sh
docker compose -f compose.yaml -f compose.nvidia.yaml up --build -d
```
Builds and starts the Legal-BERT API and Qwen containers with NVIDIA GPU access on port 8080.

```sh
docker compose -f compose.yaml -f compose.nvidia.yaml run --rm api python -m ai.train && docker compose -f compose.yaml -f compose.nvidia.yaml restart api
```
Fine-tunes Legal-BERT on UNFAIR-ToS with an 80/10/10 split and prints test recall and F2-score using CUDA.

```sh
docker compose exec qwen ollama pull qwen2.5:14b-instruct-q4_K_M
```
Downloads Qwen 2.5 14B Instruct into the running Ollama container.

```sh
curl http://127.0.0.1:8080/health
```
Checks that the AI API, fine-tuned Legal-BERT checkpoint, and Qwen model are ready.

```sh
docker compose -f compose.yaml -f compose.nvidia.yaml down
```
Stops the NVIDIA AI containers.

## Extension

```text
chrome://extensions
```
Enables loading the project folder as an unpacked Chrome extension so Scan Now can access the active tab.

```sh
xcrun safari-web-extension-converter . --project-location ../FoAI-Asignment-3-Safari
```
Creates the Safari Web Extension Xcode project; open it in Xcode, run the macOS host app, then enable the extension in Safari Settings.

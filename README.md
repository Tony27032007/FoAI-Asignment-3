# Running Guide
## Requirements before running
- `docker` : The docker container where the AI going to be ran on
- `NodeJS` : The server will run this and the extension need the server to communicate with the AI
- `Python` : The code for AI training
- Port `3000` and `8080` for the server and AI container

Run the command to install everything that the python need
```sh
pip install -r ai/requirements.txt
```
**OR**
```sh
pip3 install -r ai/requirements.txt
```
## CPU / Apple Silicon
### Start the AI
The AI is hosted on port `8080`
```sh
npm run ai:up
```

### Train the AI 
The AI need to be trained before the extension can be used. This will fine-tune Legal-BERT on UNFAIR-ToS with an 80/10/10 split and prints test recall and F2-score.
```sh
npm run ai:train
```

### Start the server 
The server will be hosted on port 3000 at `http://127.0.0.1:3000`. (The extension need this in order to talk to the AI on port `8080`)
```sh
npm start
```

### Check the AI
Checks that the AI API, fine-tuned Legal-BERT checkpoint, and Qwen model are ready.
```sh
curl http://127.0.0.1:8080/health
```

### Stops the AI containers
```sh
npm run ai:down
```
## NVIDIA GPU (CUDA)
### Start the AI
The AI is hosted on port `8080`
```sh
npm run ai:up:nvidia
```

### Train the AI 
The AI need to be trained before the extension can be used. This will fine-tune Legal-BERT on UNFAIR-ToS with an 80/10/10 split and prints test recall and F2-score.
```sh
npm run ai:train:nvidia
```

### Start the server 
The server will be hosted on port 3000 at `http://127.0.0.1:3000`. (The extension need this in order to talk to the AI on port `8080`)
```sh
npm start
```

### Check the AI
Checks that the AI API, fine-tuned Legal-BERT checkpoint, and Qwen model are ready.
```sh
curl http://127.0.0.1:8080/health
```

### Stops the AI containers
```sh
npm run ai:down:nvidia
```

## Extension
### Google Chrome
Enables loading the project folder as an unpacked Chrome extension so Scan Now can access the active tab.
```text
chrome://extensions
```

### Apple Safari
You need
- `Show features for web developers` : ****Enabled**** (Safari > Settings... > Advanced)
- `Allows unsigned extensions` : ****Enabled**** (Safari > Settings... > Developer)

After that add the extension using `Add Temporary Extension...` (Safari > Settings... > Developer) and select the whole folder of this repo.
# ngfront
Simple Angular Frontend Boilerplate using Angular

# Features
Auto-reload on code changes.

# Usage
1. Clone this repo and cd into it
    ```bash
    git clone https://github.com/TomLBZ/ngfront.git/ && cd ngfront
    ```
2. Create and edit the src/assets/config.ts file
    ```bash
    cp src/assets/config_template.ts src/assets/config.ts
    vim src/assets/config.ts
    ```
3. Toggle between development and production mode by changing the `command` field in the `compose.yaml` file
    ```bash
    vim compose.yaml
    ```
4. Start the container
    ```bash
    docker build -t ngfront .
    docker compose up -d
    ```
    Development Mode Only:
    ```bash
    # Access the container
    docker exec -it ngfront bash
    # Inside the container, start the server
    npm start
    ```
5. Test the WebUI
    ```bash
    curl http://localhost:14200
    ```
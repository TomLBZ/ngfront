# ngfront
Simple Angular Frontend Boilerplate using Angular

# Features
Auto-reload on code changes.

# Usage
1. Clone this repo and cd into it
    ```bash
    git clone https://github.com/TomLBZ/ngfront.git/ && cd ngfront
    ```
2. Create a config file and edit it
    ```bash
    cp production/config_template.json public/assets/config.json
    vim production/config.json
    ```
    - For details on the config file, refer to the [Production Readme](production/README.md).
## Development
1. Install dependencies
    ```bash
    npm install
    ```
2. Build the Docker image
    ```bash
    docker build -t ngfront .
    ```
3. Start the container
    ```bash
    docker compose up -d
    ```
4. Start the dev server
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
6. Prepare the production build
    ```bash
    # Inside the container
    ng build
    ```
7. Stop the container
    ```bash
    docker compose down
    ```
## Production
See the [Production Readme](production/README.md) for details on how to run the production build.